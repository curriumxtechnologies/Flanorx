import asyncHandler from "express-async-handler";
import Track from "../models/trackModel.js";
import Order from "../models/orderModel.js";

// ─── Helper: Get route from OSRM ─────────────────────────────
const getOSRMRoute = async ({ origin, destination }) => {
  try {
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=polyline&steps=false`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("OSRM request failed:", resp.statusText);
      return null;
    }
    const data = await resp.json();
    if (!data.routes?.length || data.code !== "Ok") return null;
    const route = data.routes[0];
    const distanceMeters = route.distance;
    const distanceKm = (distanceMeters / 1000).toFixed(1);
    const distanceText = distanceMeters >= 1000 ? `${distanceKm} km` : `${Math.round(distanceMeters)} m`;
    const durationSeconds = route.duration;
    const durationMinutes = Math.round(durationSeconds / 60);
    const durationText = durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)} hr ${durationMinutes % 60} min`
      : `${durationMinutes} min`;
    return {
      distanceText,
      durationText,
      distanceValue: distanceMeters,
      durationValue: durationSeconds,
      polyline: route.geometry,
    };
  } catch (error) {
    console.error("OSRM routing error:", error.message);
    return null;
  }
};

// ─── Start tracking (rider only) ─────────────────────────────
// @desc    Rider starts tracking for an order
// @route   POST /api/track/:orderId/start
// @access  Private/Rider
const startTracking = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const riderId = req.user._id;
  const { userLat, userLng } = req.body;

  // Only riders can start tracking
  if (req.user.role !== "rider") {
    res.status(403);
    throw new Error("Only riders can start tracking");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!order.user) {
    res.status(400);
    throw new Error("Order has no user attached");
  }
  if (order.rider && String(order.rider) !== String(riderId)) {
    res.status(403);
    throw new Error("This order is assigned to another rider");
  }

  // Assign rider if not set
  order.rider = riderId;
  order.status = order.status ?? "confirmed";
  await order.save();

  let tracking = await Track.findOne({ order: order._id });

  if (!tracking) {
    tracking = await Track.create({
      order: order._id,
      user: order.user,
      rider: riderId,
      status: "active",
      userLocation: (userLat !== undefined && userLng !== undefined)
        ? { lat: userLat, lng: userLng, updatedAt: new Date() }
        : undefined,
    });
  } else {
    tracking.status = "active";
    tracking.rider = riderId;
    tracking.user = order.user;
    if (userLat !== undefined && userLng !== undefined) {
      tracking.userLocation = { lat: userLat, lng: userLng, updatedAt: new Date() };
    }
    await tracking.save();
  }

  res.status(201).json(tracking);
});

// ─── Update user location (user only) ────────────────────────
// @desc    User updates their location for a tracking
// @route   PUT /api/track/:orderId/user-location
// @access  Private/User
const updateUserLocation = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;
  const { lat, lng } = req.body;

  if (req.user.role !== "user") {
    res.status(403);
    throw new Error("Only users can update user location");
  }
  if (lat === undefined || lng === undefined) {
    res.status(400);
    throw new Error("lat and lng are required");
  }

  const tracking = await Track.findOne({ order: orderId });
  if (!tracking) {
    res.status(404);
    throw new Error("Tracking not found for this order");
  }
  if (String(tracking.user) !== String(userId)) {
    res.status(403);
    throw new Error("You can only update your own tracking location");
  }

  tracking.userLocation = { lat, lng, updatedAt: new Date() };
  tracking.lastUpdatedAt = new Date();

  if (tracking.riderLocation?.lat !== undefined && tracking.riderLocation?.lng !== undefined) {
    const route = await getOSRMRoute({
      origin: tracking.riderLocation,
      destination: tracking.userLocation,
    });
    if (route) tracking.route = route;
  }

  await tracking.save();
  res.status(200).json({ success: true, tracking });
});

// ─── Update rider location (rider only) ──────────────────────
// @desc    Rider updates their location for a tracking
// @route   PUT /api/track/:orderId/rider-location
// @access  Private/Rider
const updateRiderLocation = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const riderId = req.user._id;
  const { lat, lng } = req.body;

  if (req.user.role !== "rider") {
    res.status(403);
    throw new Error("Only riders can update rider location");
  }
  if (lat === undefined || lng === undefined) {
    res.status(400);
    throw new Error("lat and lng are required");
  }

  const tracking = await Track.findOne({ order: orderId });
  if (!tracking) {
    res.status(404);
    throw new Error("Tracking not found for this order");
  }
  if (String(tracking.rider) !== String(riderId)) {
    res.status(403);
    throw new Error("You can only update your own rider tracking location");
  }
  if (tracking.status !== "active") {
    res.status(400);
    throw new Error("Tracking is not active");
  }

  tracking.riderLocation = { lat, lng, updatedAt: new Date() };
  tracking.lastUpdatedAt = new Date();

  if (tracking.userLocation?.lat !== undefined && tracking.userLocation?.lng !== undefined) {
    const route = await getOSRMRoute({
      origin: tracking.riderLocation,
      destination: tracking.userLocation,
    });
    if (route) tracking.route = route;
  }

  await tracking.save();
  res.status(200).json({ success: true, tracking });
});

// ─── Get tracking (user, rider, or admin) ────────────────────
// @desc    Get tracking details for an order
// @route   GET /api/track/:orderId
// @access  Private (user, rider, admin)
const getTracking = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const tracking = await Track.findOne({ order: orderId })
    .populate("order")
    .populate("user", "name email")
    .populate("rider", "name email profilePhoto phone");

  if (!tracking) {
    res.status(404);
    throw new Error("Tracking not found");
  }

  const userId = req.user._id;
  const userRole = req.user.role;

  // Resolve user and rider IDs (handling populated or raw ObjectId)
  const trackingUserId = tracking.user?._id ? String(tracking.user._id) : String(tracking.user);
  const trackingRiderId = tracking.rider?._id ? String(tracking.rider._id) : String(tracking.rider);

  const isUser = userRole === "user" && trackingUserId === String(userId);
  const isRider = userRole === "rider" && trackingRiderId === String(userId);
  const isAdmin = userRole === "admin";

  if (!isUser && !isRider && !isAdmin) {
    res.status(403);
    throw new Error("Not allowed to view this tracking");
  }

  res.status(200).json(tracking);
});

// ─── Stop tracking (rider or admin) ──────────────────────────
// @desc    Rider or admin stops tracking
// @route   PUT /api/track/:orderId/stop
// @access  Private (rider, admin)
const stopTracking = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  const tracking = await Track.findOne({ order: orderId });
  if (!tracking) {
    res.status(404);
    throw new Error("Tracking not found");
  }

  const trackingRiderId = tracking.rider?._id ? String(tracking.rider._id) : String(tracking.rider);
  const isOwnerRider = userRole === "rider" && trackingRiderId === String(userId);
  const isAdmin = userRole === "admin";

  if (!isOwnerRider && !isAdmin) {
    res.status(403);
    throw new Error("Not allowed to stop this tracking");
  }

  tracking.status = "stopped";
  tracking.stoppedAt = new Date();
  tracking.lastUpdatedAt = new Date();
  await tracking.save();

  res.status(200).json({ success: true, tracking });
});

export {
  startTracking,
  updateUserLocation,
  updateRiderLocation,
  getTracking,
  stopTracking,
};