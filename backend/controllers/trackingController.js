// controllers/trackController.js
import asyncHandler from "express-async-handler";
import Track from "../models/trackModel.js";
import Order from "../models/orderModel.js";

const getOSRMRoute = async ({ origin, destination }) => {
  try {
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=polyline&steps=false`;
    const resp = await fetch(url);
    if (!resp.ok) { console.error("OSRM request failed:", resp.statusText); return null; }
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
    return { distanceText, durationText, distanceValue: distanceMeters, durationValue: durationSeconds, polyline: route.geometry };
  } catch (error) { console.error("OSRM routing error:", error.message); return null; }
};

const startTracking = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const riderId = req.rider?._id;
  const { userLat, userLng } = req.body;

  if (!riderId) { res.status(401); throw new Error("Not authorized as rider"); }

  const order = await Order.findById(orderId);
  if (!order) { res.status(404); throw new Error("Order not found"); }
  if (!order.user) { res.status(400); throw new Error("Order has no user attached"); }
  if (order.rider && String(order.rider) !== String(riderId)) { res.status(403); throw new Error("This order is assigned to another rider"); }

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
      userLocation: (userLat !== undefined && userLng !== undefined) ? { lat: userLat, lng: userLng, updatedAt: new Date() } : undefined,
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

const updateUserLocation = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const userId = req.user?._id;
  const { lat, lng } = req.body;

  if (!userId) { res.status(401); throw new Error("Not authorized as user"); }
  if (lat === undefined || lng === undefined) { res.status(400); throw new Error("lat and lng are required"); }

  // Find tracking by order ID
  const tracking = await Track.findOne({ order: orderId });
  if (!tracking) { res.status(404); throw new Error("Tracking not found for this order"); }
  if (String(tracking.user) !== String(userId)) { res.status(403); throw new Error("You can only update your own tracking location"); }

  tracking.userLocation = { lat, lng, updatedAt: new Date() };
  tracking.lastUpdatedAt = new Date();

  if (tracking.riderLocation?.lat !== undefined && tracking.riderLocation?.lng !== undefined) {
    const route = await getOSRMRoute({ origin: tracking.riderLocation, destination: tracking.userLocation });
    if (route) tracking.route = route;
  }

  await tracking.save();
  res.status(200).json({ success: true, tracking });
});

const updateRiderLocation = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const riderId = req.rider?._id;
  const { lat, lng } = req.body;

  if (!riderId) { res.status(401); throw new Error("Not authorized as rider"); }
  if (lat === undefined || lng === undefined) { res.status(400); throw new Error("lat and lng are required"); }

  const tracking = await Track.findOne({ order: orderId });
  if (!tracking) { res.status(404); throw new Error("Tracking not found for this order"); }
  if (String(tracking.rider) !== String(riderId)) { res.status(403); throw new Error("You can only update your own rider tracking location"); }
  if (tracking.status !== "active") { res.status(400); throw new Error("Tracking is not active"); }

  tracking.riderLocation = { lat, lng, updatedAt: new Date() };
  tracking.lastUpdatedAt = new Date();

  if (tracking.userLocation?.lat !== undefined && tracking.userLocation?.lng !== undefined) {
    const route = await getOSRMRoute({ origin: tracking.riderLocation, destination: tracking.userLocation });
    if (route) tracking.route = route;
  }

  await tracking.save();
  res.status(200).json({ success: true, tracking });
});

// FIXED: getTracking now handles populated vs non-populated user/rider fields
const getTracking = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  const tracking = await Track.findOne({ order: orderId })
    .populate("order")
    .populate("user", "name email")
    .populate("rider", "name email username profilePicture profile status phone");

  if (!tracking) {
    res.status(404);
    throw new Error("Tracking not found");
  }

  const requesterUserId = req.user?._id;
  const requesterRiderId = req.rider?._id;

  // Handle populated user/rider (they become objects, not ObjectIds)
  const trackingUserId = tracking.user?._id ? String(tracking.user._id) : String(tracking.user);
  const trackingRiderId = tracking.rider?._id ? String(tracking.rider._id) : String(tracking.rider);

  const isUser = requesterUserId && trackingUserId === String(requesterUserId);
  const isRider = requesterRiderId && trackingRiderId === String(requesterRiderId);

  console.log("🔍 Tracking access check:", {
    trackingUserId,
    trackingRiderId,
    requesterUserId: String(requesterUserId || ''),
    requesterRiderId: String(requesterRiderId || ''),
    isUser,
    isRider
  });

  if (!isUser && !isRider) {
    res.status(403);
    throw new Error("Not allowed to view this tracking");
  }

  res.status(200).json(tracking);
});

const stopTracking = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const tracking = await Track.findOne({ order: orderId });
  if (!tracking) { res.status(404); throw new Error("Tracking not found"); }

  const requesterRiderId = req.rider?._id;
  const requesterAdminId = req.admin?._id;
  const isOwnerRider = requesterRiderId && String(tracking.rider) === String(requesterRiderId);
  const isAdmin = Boolean(requesterAdminId);

  if (!isOwnerRider && !isAdmin) { res.status(403); throw new Error("Not allowed to stop this tracking"); }

  tracking.status = "stopped";
  tracking.stoppedAt = new Date();
  tracking.lastUpdatedAt = new Date();
  await tracking.save();

  res.status(200).json({ success: true, tracking });
});

export { startTracking, updateUserLocation, updateRiderLocation, getTracking, stopTracking };