// controllers/adminController.js
import asyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";

// ─── Helpers ──────────────────────────────────────────────────
const parseMonthYear = (month, year) => {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12) throw new Error("Invalid month");
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new Error("Invalid year");
  return { m, y };
};

// ─── ORDER MANAGEMENT ─────────────────────────────────────────

// @desc    Admin: Get all orders with filters
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const { month, year, status, paid, deliveryStatus, orderType } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (deliveryStatus) filter.deliveryStatus = deliveryStatus;
  if (orderType) filter.orderType = orderType;
  if (paid !== undefined) filter.paid = paid === "true";
  if (month && year) {
    const { m, y } = parseMonthYear(month, year);
    filter.orderMonth = m;
    filter.orderYear = y;
  }
  const orders = await Order.find(filter)
    .populate("user", "name email")
    .populate("rider", "name email profilePicture phone")
    .sort({ createdAt: -1 });
  res.status(200).json(orders);
});

// @desc    Admin: Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, deliveryStatus } = req.body;
  const allowedOrderStatuses = ["pending", "processing", "completed", "cancelled", "failed"];
  const allowedDeliveryStatuses = ["pending", "accepted", "picked_up", "in_transit", "delivered", "confirmed"];
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (status !== undefined) {
    if (!allowedOrderStatuses.includes(status)) {
      res.status(400);
      throw new Error("Invalid order status");
    }
    order.status = status;
  }
  if (deliveryStatus !== undefined) {
    if (!allowedDeliveryStatuses.includes(deliveryStatus)) {
      res.status(400);
      throw new Error("Invalid delivery status");
    }
    order.deliveryStatus = deliveryStatus;
  }
  if (status === "completed" && !order.completedAt) order.completedAt = new Date();
  const updatedOrder = await order.save();
  res.status(200).json(updatedOrder);
});

// @desc    Admin: Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [
    totalOrders,
    pendingOrders,
    processingOrders,
    completedOrders,
    todayOrders,
    monthRevenue,
    unpaidOrders,
    availableDeliveries,
    activeDeliveries,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: "pending" }),
    Order.countDocuments({ status: "processing" }),
    Order.countDocuments({ status: "completed" }),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Order.aggregate([
      { $match: { paid: true, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.countDocuments({ paid: false, status: { $ne: "cancelled" } }),
    Order.countDocuments({
      paid: true,
      status: "processing",
      rider: null,
      deliveryStatus: "pending",
    }),
    Order.countDocuments({
      paid: true,
      status: "processing",
      deliveryStatus: { $in: ["accepted", "picked_up", "in_transit", "delivered"] },
    }),
  ]);
  res.status(200).json({
    totalOrders,
    pendingOrders,
    processingOrders,
    completedOrders,
    todayOrders,
    monthRevenue: monthRevenue[0]?.total || 0,
    unpaidOrders,
    availableDeliveries,
    activeDeliveries,
  });
});

// ─── USER MANAGEMENT ──────────────────────────────────────────

// @desc    Admin: Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, isVerified, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (isVerified !== undefined) filter.isVerified = isVerified === "true";
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  const users = await User.find(filter)
    .select("-password -otp -otpExpires -resetOtp -resetOtpExpires -deleteAfter")
    .sort({ createdAt: -1 });
  res.status(200).json(users);
});

// @desc    Admin: Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("-password -otp -otpExpires -resetOtp -resetOtpExpires -deleteAfter");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.status(200).json(user);
});

// @desc    Admin: Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!role || !["user", "admin", "rider"].includes(role)) {
    res.status(400);
    throw new Error("Valid role (user/admin/rider) is required");
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  user.role = role;
  await user.save();
  res.status(200).json({
    message: `User role updated to ${role}`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// @desc    Admin: Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  await user.deleteOne();
  res.status(200).json({ message: "User deleted successfully" });
});

// ─── RIDER APPLICATION MANAGEMENT ────────────────────────────

// @desc    Admin: Get all rider applications
// @route   GET /api/admin/riders/applications
// @access  Private/Admin
const getRiderApplications = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.verificationStatus = status;
  else filter.verificationStatus = { $in: ["pending", "approved", "rejected"] };
  const users = await User.find(filter)
    .select(
      "name email phone nin fuelingStation proofOfAddress profilePicture ninPicture bankAccountNumber bankName accountName verificationStatus rejectionReason verificationSubmittedAt role createdAt"
    )
    .sort({ verificationSubmittedAt: -1 });
  res.status(200).json(users);
});

// @desc    Admin: Approve a rider application
// @route   PUT /api/admin/riders/:userId/approve
// @access  Private/Admin
const approveRider = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (user.verificationStatus !== "pending") {
    res.status(400);
    throw new Error("Only pending applications can be approved");
  }
  user.verificationStatus = "approved";
  user.role = "rider";
  user.verificationReviewedAt = new Date();
  user.verificationReviewedBy = req.user._id;
  await user.save();
  res.status(200).json({
    message: "Rider application approved. User role updated to rider.",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      verificationStatus: user.verificationStatus,
    },
  });
});

// @desc    Admin: Reject a rider application
// @route   PUT /api/admin/riders/:userId/reject
// @access  Private/Admin
const rejectRider = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  if (!reason) {
    res.status(400);
    throw new Error("Rejection reason is required");
  }
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (user.verificationStatus !== "pending") {
    res.status(400);
    throw new Error("Only pending applications can be rejected");
  }
  user.verificationStatus = "rejected";
  user.rejectionReason = reason;
  user.verificationReviewedAt = new Date();
  user.verificationReviewedBy = req.user._id;
  await user.save();
  res.status(200).json({
    message: "Rider application rejected.",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      verificationStatus: user.verificationStatus,
      rejectionReason: user.rejectionReason,
    },
  });
});

// ─── RIDER MANAGEMENT ─────────────────────────────────────────

// @desc    Admin: Get all riders (users with role 'rider')
// @route   GET /api/admin/riders
// @access  Private/Admin
const getAllRiders = asyncHandler(async (req, res) => {
  const riders = await User.find({ role: "rider" })
    .select("name email phone profilePicture walletBalance totalEarnings completedDeliveries verificationStatus createdAt")
    .sort({ createdAt: -1 });
  res.status(200).json(riders);
});

// ─── DELIVERY MANAGEMENT ─────────────────────────────────────

// @desc    Admin: Get all active deliveries (for monitoring)
// @route   GET /api/admin/deliveries/active
// @access  Private/Admin
const getActiveDeliveries = asyncHandler(async (req, res) => {
  const deliveries = await Order.find({
    paid: true,
    status: { $in: ["processing"] },
    deliveryStatus: { $in: ["accepted", "picked_up", "in_transit", "delivered"] },
  })
    .populate("user", "name email")
    .populate("rider", "name email profilePicture phone")
    .sort({ createdAt: -1 });
  res.status(200).json(deliveries);
});

// ─── EXPORT ────────────────────────────────────────────────────
export {
  // Order
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
  // User
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  // Rider Applications
  getRiderApplications,
  approveRider,
  rejectRider,
  // Riders
  getAllRiders,
  // Delivery
  getActiveDeliveries,
};