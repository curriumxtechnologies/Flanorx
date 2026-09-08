// controllers/deliveryController.js
import asyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";

const COMMISSION_PERCENT = 0.6; // 60% of serviceTax

const calculateRiderCommission = (order) => {
  const serviceTax = Number(order?.serviceTax || 0);
  return Number((serviceTax * COMMISSION_PERCENT).toFixed(2));
};

// ─── Helper to check if user is a rider ────────────────────────────────
const isRider = (user) => user && user.role === "rider";
const isAdmin = (user) => user && user.role === "admin";

// ─── Get rider from user ID ─────────────────────────────────────────────
const getRiderFromUser = async (userId) => {
  const user = await User.findById(userId).select("walletBalance totalEarnings completedDeliveries");
  if (!user || user.role !== "rider") return null;
  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Rider: Get available deliveries
// @route   GET /api/delivery/available
// @access  Private (Rider)
// ─────────────────────────────────────────────────────────────────────────────
const getAvailableDeliveries = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!isRider(user)) {
    res.status(403);
    throw new Error("Only riders can view available deliveries");
  }

  const rider = await getRiderFromUser(user._id);
  if (!rider) {
    res.status(404);
    throw new Error("Rider not found");
  }

  // Check if rider is approved (we'll use a `verificationStatus` field on User if needed)
  // For now, we assume if role is "rider", they are active.
  // You can add a `riderStatus` field later.

  const orders = await Order.find({
    paid: true,
    status: "processing",
    rider: null,
    deliveryStatus: "pending",
  })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json(orders);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Rider: Get my assigned deliveries
// @route   GET /api/delivery/my-deliveries
// @access  Private (Rider)
// ─────────────────────────────────────────────────────────────────────────────
const getMyAssignedDeliveries = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!isRider(user)) {
    res.status(403);
    throw new Error("Only riders can view their deliveries");
  }

  const orders = await Order.find({
    rider: user._id,
    status: { $in: ["processing"] },
    deliveryStatus: { $in: ["accepted", "picked_up", "in_transit", "delivered"] },
  })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json(orders);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Rider: Accept delivery
// @route   PUT /api/delivery/:id/accept
// @access  Private (Rider)
// ─────────────────────────────────────────────────────────────────────────────
const acceptDelivery = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!isRider(user)) {
    res.status(403);
    throw new Error("Only riders can accept deliveries");
  }

  const orderId = req.params.id;
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
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

  // Assign rider
  order.rider = user._id;
  order.deliveryAcceptedBy = user._id;
  order.deliveryStatus = "accepted";
  order.acceptedAt = new Date();

  await order.save();

  // Update rider's active delivery (optional – you can store in User model)
  // We'll add a field to User model: `activeOrder` if needed.
  // For now, we'll skip to keep it simple.

  const populatedOrder = await Order.findById(order._id).populate("user", "name email");

  res.status(200).json({
    message: "Delivery accepted successfully",
    order: populatedOrder,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Rider: Update delivery progress (picked_up, in_transit, delivered)
// @route   PUT /api/delivery/:id/status
// @access  Private (Rider)
// ─────────────────────────────────────────────────────────────────────────────
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

  if (!order.rider || order.rider.toString() !== user._id.toString()) {
    res.status(403);
    throw new Error("You are not assigned to this order");
  }

  if (order.status !== "processing") {
    res.status(400);
    throw new Error("This order is no longer active");
  }

  if (deliveryStatus === "picked_up") {
    order.deliveryStatus = "picked_up";
    order.pickedUpAt = new Date();
  } else if (deliveryStatus === "in_transit") {
    order.deliveryStatus = "in_transit";
  } else if (deliveryStatus === "delivered") {
    order.deliveryStatus = "delivered";
    order.deliveredAt = new Date();
  }

  await order.save();

  res.status(200).json({
    message: "Delivery status updated successfully",
    order,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Customer: Confirm delivery completed
// @route   PUT /api/delivery/:id/confirm
// @access  Private (User)
// ─────────────────────────────────────────────────────────────────────────────
const confirmDeliveryByCustomer = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const orderId = req.params.id;

  if (!userId) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.user.toString() !== userId.toString()) {
    res.status(403);
    throw new Error("Not allowed");
  }

  if (!order.rider) {
    res.status(400);
    throw new Error("No rider assigned to this order");
  }

  if (order.deliveryStatus !== "delivered") {
    res.status(400);
    throw new Error("Rider has not marked this delivery as delivered yet");
  }

  if (order.status === "completed") {
    res.status(400);
    throw new Error("Order already completed");
  }

  // Calculate commission
  const commission = calculateRiderCommission(order);

  // Update order
  order.deliveryStatus = "confirmed";
  order.status = "completed";
  order.customerConfirmedAt = new Date();
  order.completedAt = new Date();
  order.riderCommission = commission;
  order.commissionPaidToRider = true;

  await order.save();

  // Update rider's wallet (rider is a User with role "rider")
  const rider = await User.findById(order.rider);
  if (!rider) {
    // If rider not found, log error but still proceed
    console.warn(`Rider user ${order.rider} not found, commission not credited`);
  } else {
    rider.walletBalance = Number(rider.walletBalance || 0) + commission;
    rider.totalEarnings = Number(rider.totalEarnings || 0) + commission;
    rider.completedDeliveries = Number(rider.completedDeliveries || 0) + 1;
    await rider.save();
  }

  res.status(200).json({
    message: "Delivery confirmed successfully",
    order,
    riderCommission: commission,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Rider/User/Admin: Get delivery details
// @route   GET /api/delivery/:id
// @access  Mixed (User, Rider, Admin)
// ─────────────────────────────────────────────────────────────────────────────
const getDeliveryDetails = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("rider", "name email profilePicture phone");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isOwner = order.user?._id?.toString() === user._id.toString();
  const isAssignedRider = order.rider?._id?.toString() === user._id.toString();
  const isAdminUser = isAdmin(user);

  if (!isAdminUser && !isOwner && !isAssignedRider) {
    res.status(403);
    throw new Error("Not allowed");
  }

  res.status(200).json(order);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Rider: Get delivery earnings summary
// @route   GET /api/delivery/rider/earnings
// @access  Private (Rider)
// ─────────────────────────────────────────────────────────────────────────────
const getRiderEarnings = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!isRider(user)) {
    res.status(403);
    throw new Error("Only riders can view earnings");
  }

  const rider = await User.findById(user._id).select(
    "walletBalance totalEarnings completedDeliveries"
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
    .select("orderId serviceTax riderCommission completedAt orderType")
    .sort({ completedAt: -1 });

  res.status(200).json({
    walletBalance: rider.walletBalance || 0,
    totalEarnings: rider.totalEarnings || 0,
    completedDeliveries: rider.completedDeliveries || 0,
    history: completedOrders,
  });
});

export {
  getAvailableDeliveries,
  getMyAssignedDeliveries,
  acceptDelivery,
  updateDeliveryProgress,
  confirmDeliveryByCustomer,
  getDeliveryDetails,
  getRiderEarnings,
};