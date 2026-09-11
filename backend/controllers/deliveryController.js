// controllers/deliveryController.js
import asyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Track from "../models/trackModel.js";

// ─── Helpers ──────────────────────────────────────────────────
const isRider = (user) => user && user.role === "rider";
const isAdmin = (user) => user && user.role === "admin";
const isFuelRider = (user) => isRider(user) && user.riderType === "fuel";
const isStationRider = (user) =>
  isRider(user) && user.riderType === "station" && !!user.station;

const isStationMember = (user, stationId) =>
  user &&
  user.station &&
  String(user.station) === String(stationId);

const getRiderFromUser = async (userId) => {
  const user = await User.findById(userId).select(
    "walletBalance totalEarnings completedDeliveries role riderType station"
  );
  if (!user || user.role !== "rider") return null;
  return user;
};

// ═════════════════════════════════════════════════════════════
// @desc    Rider: Get available (unassigned) FUEL deliveries
// @route   GET /api/delivery/available
// @access  Private (Fuel Rider)
// ═════════════════════════════════════════════════════════════
const getAvailableDeliveries = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!isRider(user)) {
    res.status(403);
    throw new Error("Only riders can view available deliveries");
  }
  if (!isFuelRider(user)) {
    res.status(403);
    throw new Error(
      "Only fuel riders can view the open delivery pool. Station riders receive orders from their station."
    );
  }

  const orders = await Order.find({
    orderType: "fuel",
    paid: true,
    status: "processing",
    rider: null,
    deliveryStatus: "pending",
  })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json(orders);
});

// ═════════════════════════════════════════════════════════════
// @desc    Rider: Get my assigned deliveries
//          Fuel rider → their fuel orders
//          Station rider → their station-assigned gas orders
// @route   GET /api/delivery/my-deliveries
// @access  Private (Rider)
// ═════════════════════════════════════════════════════════════
const getMyAssignedDeliveries = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!isRider(user)) {
    res.status(403);
    throw new Error("Only riders can view their deliveries");
  }

  const orders = await Order.find({
    rider: user._id,
    status: { $in: ["processing"] },
    deliveryStatus: {
      $in: ["accepted", "picked_up", "in_transit", "delivered"],
    },
  })
    .populate("user", "name email phone")
    .populate("station", "name address coordinates phone")
    .sort({ createdAt: -1 });

  res.status(200).json(orders);
});

// ═════════════════════════════════════════════════════════════
// @desc    Rider: Accept delivery (FUEL only)
// @route   PUT /api/delivery/:id/accept
// @access  Private (Fuel Rider)
// ═════════════════════════════════════════════════════════════
const acceptDelivery = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!isRider(user)) {
    res.status(403);
    throw new Error("Only riders can accept deliveries");
  }
  if (!isFuelRider(user)) {
    res.status(403);
    throw new Error(
      "Only fuel riders can accept open deliveries. Station riders get assignments from their station."
    );
  }

  const orderId = req.params.id;
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.orderType !== "fuel") {
    res.status(400);
    throw new Error(
      "Gas orders are handled by stations, not by the open delivery pool"
    );
  }

  if (!order.paid) {
    res.status(400);
    throw new Error("Only paid orders can be accepted");
  }

  if (order.status !== "processing") {
    res.status(400);
    throw new Error("This order is not available for delivery");
  }

  if (order.rider) {
    res.status(400);
    throw new Error("This delivery has already been accepted by another rider");
  }

  // Guard against a race: only claim if still unassigned
  const claimed = await Order.findOneAndUpdate(
    {
      _id: order._id,
      rider: null,
      status: "processing",
      deliveryStatus: "pending",
      paid: true,
    },
    {
      $set: {
        rider: user._id,
        deliveryAcceptedBy: user._id,
        deliveryStatus: "accepted",
        acceptedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!claimed) {
    res.status(400);
    throw new Error("This delivery was just claimed by another rider");
  }

  // ─── Auto-start tracking ──────────────────────────────────
  let tracking = await Track.findOne({ order: claimed._id });
  if (!tracking) {
    tracking = await Track.create({
      order: claimed._id,
      user: claimed.user,
      rider: user._id,
      status: "active",
    });
  } else {
    tracking.status = "active";
    tracking.rider = user._id;
    tracking.user = claimed.user;
    await tracking.save();
  }

  const populatedOrder = await Order.findById(claimed._id)
    .populate("user", "name email phone")
    .populate("rider", "name email profilePicture phone");

  res.status(200).json({
    message: "Delivery accepted successfully",
    order: populatedOrder,
  });
});

// ═════════════════════════════════════════════════════════════
// @desc    Rider: Update delivery progress
//          - fuel: picked_up, in_transit
//          - station gas: picked_up, in_transit
//          - "delivered" is allowed but is NOT completion
//            (completion happens on QR scan)
// @route   PUT /api/delivery/:id/status
// @access  Private (Rider)
// ═════════════════════════════════════════════════════════════
const updateDeliveryProgress = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!isRider(user)) {
    res.status(403);
    throw new Error("Only riders can update delivery progress");
  }

  const { deliveryStatus } = req.body;
  const allowedStatuses = ["picked_up", "in_transit", "delivered"];
  if (!allowedStatuses.includes(deliveryStatus)) {
    res.status(400);
    throw new Error("Invalid delivery status");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (!order.rider || String(order.rider) !== String(user._id)) {
    res.status(403);
    throw new Error("You are not assigned to this order");
  }

  if (order.status !== "processing") {
    res.status(400);
    throw new Error("This order is no longer active");
  }

  if (order.verificationScannedAt) {
    res.status(400);
    throw new Error("Order is already confirmed by QR scan");
  }

  // Station rider must still belong to the order's station
  if (order.orderType === "gas") {
    if (
      !isStationRider(user) ||
      String(user.station) !== String(order.station)
    ) {
      res.status(403);
      throw new Error("You are not a station rider for this order");
    }
  }

  if (deliveryStatus === "picked_up") {
    if (order.deliveryStatus === "picked_up" || order.deliveryStatus === "in_transit" || order.deliveryStatus === "delivered") {
      res.status(400);
      throw new Error("Order already progressed past this stage");
    }
    order.deliveryStatus = "picked_up";
    order.pickedUpAt = new Date();
  } else if (deliveryStatus === "in_transit") {
    if (order.deliveryStatus === "delivered") {
      res.status(400);
      throw new Error("Order already marked delivered");
    }
    order.deliveryStatus = "in_transit";
  } else if (deliveryStatus === "delivered") {
    // Just a status — the order stays "processing" until QR is scanned
    order.deliveryStatus = "delivered";
    order.deliveredAt = new Date();
  }

  await order.save();

  res.status(200).json({
    message: "Delivery status updated successfully",
    order,
  });
});

// ═════════════════════════════════════════════════════════════
// @desc    Get delivery details (owner, assigned rider, station
//          members, or main admin)
// @route   GET /api/delivery/:id
// @access  Mixed (User, Rider, Station Member, Admin)
// ═════════════════════════════════════════════════════════════
const getDeliveryDetails = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const order = await Order.findById(req.params.id)
    .populate("user", "name email phone")
    .populate("rider", "name email profilePicture phone")
    .populate("station", "name address coordinates phone");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isOwner = order.user?._id?.toString() === user._id.toString();
  const isAssignedRider = order.rider?._id?.toString() === user._id.toString();
  const isAdminUser = isAdmin(user);
  const isSameStation =
    order.station &&
    isStationMember(user, order.station._id || order.station);

  if (!isAdminUser && !isOwner && !isAssignedRider && !isSameStation) {
    res.status(403);
    throw new Error("Not allowed");
  }

  res.status(200).json(order);
});

// ═════════════════════════════════════════════════════════════
// @desc    Rider: Get earnings summary + history
// @route   GET /api/delivery/rider/earnings
// @access  Private (Rider)
// ═════════════════════════════════════════════════════════════
const getRiderEarnings = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!isRider(user)) {
    res.status(403);
    throw new Error("Only riders can view earnings");
  }

  const rider = await User.findById(user._id).select(
    "walletBalance totalEarnings completedDeliveries riderType station"
  );

  if (!rider) {
    res.status(404);
    throw new Error("Rider not found");
  }

  const completedOrders = await Order.find({
    rider: user._id,
    status: "completed",
    commissionPaidToRider: true,
  })
    .select(
      "orderId orderType fulfillmentType serviceTax riderCommission completedAt station"
    )
    .populate("station", "name")
    .sort({ completedAt: -1 });

  res.status(200).json({
    walletBalance: rider.walletBalance || 0,
    totalEarnings: rider.totalEarnings || 0,
    completedDeliveries: rider.completedDeliveries || 0,
    riderType: rider.riderType || null,
    station: rider.station || null,
    history: completedOrders,
  });
});

export {
  getAvailableDeliveries,
  getMyAssignedDeliveries,
  acceptDelivery,
  updateDeliveryProgress,
  getDeliveryDetails,
  getRiderEarnings,
};