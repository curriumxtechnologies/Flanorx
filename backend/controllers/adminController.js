// controllers/adminController.js
import asyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Station from "../models/stationModel.js";
import {
  sendEmail,
  notifyRiderEvent,
  isEmailConfigured,
} from "../utils/emailNotify.js";
import {
  sendToUser,
  notifyRiderApplicationPush,
  isPushConfigured,
} from "../utils/pushNotify.js";

// ─── Constants ────────────────────────────────────────────────
const CYLINDER_SIZES = ["3kg", "6kg", "12kg"];
const LOW_STOCK_THRESHOLD = 5;

const WEB_URL = process.env.WEB_URL || "https://web.flanorx.com";

// ─── Helpers ──────────────────────────────────────────────────
const parseMonthYear = (month, year) => {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12) throw new Error("Invalid month");
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new Error("Invalid year");
  return { m, y };
};

const assertMainAdmin = (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403);
    throw new Error("Only the main admin can perform this action");
  }
};

const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0));
const startOfMonth = () =>
  new Date(new Date().getFullYear(), new Date().getMonth(), 1);

// ═════════════════════════════════════════════════════════════
//  NOTIFICATION HELPERS
//  Fire-and-forget. Never throws — a bad email/push must never
//  break the admin's API response.
// ═════════════════════════════════════════════════════════════

// Absolute URL for the email CTA (email clients need full URLs).
const emailDashboardUrl = (role) => {
  if (role === "rider") return `${WEB_URL}/rider/dashboard`;
  if (role === "admin") return `${WEB_URL}/superuser/dashboard`;
  return `${WEB_URL}/dashboard`;
};

// Relative path for the push `link` — matches the convention used
// everywhere else in pushNotify.js (`/rider/deliveries`, `/order/:id`).
const pushDashboardPath = (role) => {
  if (role === "rider") return "/rider/dashboard";
  if (role === "admin") return "/superuser/dashboard";
  return "/dashboard";
};

const roleLabel = (role) => {
  if (role === "rider") return "Rider";
  if (role === "admin") return "Administrator";
  return "Customer";
};

const notifyUserRoleChange = async (user, newRole) => {
  const firstName = (user.name || "there").split(" ")[0];
  const label = roleLabel(newRole);

  // ── Email (absolute URL) ─────────────────────────────────
  if (isEmailConfigured() && user.email) {
    try {
      const bodyCopy =
        newRole === "rider"
          ? "You can now browse and accept fuel deliveries from the open pool."
          : newRole === "admin"
          ? "You now have administrator access to the Flanorx platform."
          : "Your account now has standard customer access.";

      await sendEmail({
        to: user.email,
        subject: `Your Flanorx role has been updated to ${label}`,
        preheader: `You now have ${label} access on Flanorx.`,
        body:
          `Hi ${firstName},\n\n` +
          `Your Flanorx account role has been changed to ${label}.\n\n` +
          `${bodyCopy}\n\n` +
          `If you didn't expect this change, please contact support immediately.`,
        ctaLabel: `Open My ${label} Dashboard`,
        ctaUrl: emailDashboardUrl(newRole),
      });
    } catch (err) {
      console.error("[admin] role-change email failed:", err);
    }
  }

  // ── Push (relative link, matches pushNotify convention) ──
  if (isPushConfigured()) {
    try {
      await sendToUser(user._id, {
        title: `Role updated to ${label}`,
        body:
          newRole === "rider"
            ? "You can now accept fuel deliveries. Tap to open your rider dashboard."
            : newRole === "admin"
            ? "You now have administrator access. Tap to open the admin dashboard."
            : "Your account role has been updated.",
        link: pushDashboardPath(newRole),
        data: { type: "role_change", role: newRole },
      });
    } catch (err) {
      console.error("[admin] role-change push failed:", err);
    }
  }
};

// ═════════════════════════════════════════════════════════════
//  ORDER MANAGEMENT
// ═════════════════════════════════════════════════════════════

// @desc    Admin: Get all orders with filters
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  assertMainAdmin(req, res);

  const {
    month,
    year,
    status,
    paid,
    deliveryStatus,
    orderType,
    station,
    fulfillmentType,
  } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (deliveryStatus) filter.deliveryStatus = deliveryStatus;
  if (orderType) filter.orderType = orderType;
  if (station) filter.station = station;
  if (fulfillmentType) filter.fulfillmentType = fulfillmentType;
  if (paid !== undefined) filter.paid = paid === "true";
  if (month && year) {
    const { m, y } = parseMonthYear(month, year);
    filter.orderMonth = m;
    filter.orderYear = y;
  }

  const orders = await Order.find(filter)
    .populate("user", "name email")
    .populate("rider", "name email profilePicture phone riderType")
    .populate("station", "name address coordinates")
    .sort({ createdAt: -1 });

  res.status(200).json(orders);
});

// @desc    Admin: Update order status (manual override)
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  assertMainAdmin(req, res);

  const { status, deliveryStatus } = req.body;
  const allowedOrderStatuses = [
    "pending",
    "processing",
    "completed",
    "cancelled",
    "failed",
  ];
  const allowedDeliveryStatuses = [
    "pending",
    "accepted",
    "picked_up",
    "in_transit",
    "delivered",
    "confirmed",
  ];

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // QR-confirmed orders are locked — main admin should not silently
  // unset them and cause stock/commission drift.
  if (order.verificationScannedAt && status && status !== "completed") {
    res.status(400);
    throw new Error(
      "Order is already confirmed by QR scan and cannot be changed"
    );
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
  if (status === "completed" && !order.completedAt) {
    order.completedAt = new Date();
  }

  const updatedOrder = await order.save();
  res.status(200).json(updatedOrder);
});

// @desc    Admin: Get platform-wide dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  assertMainAdmin(req, res);

  const now = new Date();
  const today = startOfToday();
  const monthStart = startOfMonth();

  const [
    totalOrders,
    pendingOrders,
    processingOrders,
    completedOrders,
    todayOrders,
    monthRevenue,
    unpaidOrders,
    availableFuelDeliveries,
    activeDeliveries,
    totalStations,
    activeStations,
    totalUsers,
    totalRiders,
    fuelRiders,
    stationRiders,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: "pending" }),
    Order.countDocuments({ status: "processing" }),
    Order.countDocuments({ status: "completed" }),
    Order.countDocuments({ createdAt: { $gte: today } }),
    Order.aggregate([
      { $match: { paid: true, createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.countDocuments({ paid: false, status: { $ne: "cancelled" } }),
    // Fuel-only open pool
    Order.countDocuments({
      orderType: "fuel",
      paid: true,
      status: "processing",
      rider: null,
      deliveryStatus: "pending",
    }),
    Order.countDocuments({
      paid: true,
      status: "processing",
      deliveryStatus: {
        $in: ["accepted", "picked_up", "in_transit", "delivered"],
      },
    }),
    Station.countDocuments(),
    Station.countDocuments({ status: "active" }),
    User.countDocuments({ role: { $in: ["user", "rider"] } }),
    User.countDocuments({ role: "rider" }),
    User.countDocuments({ role: "rider", riderType: "fuel" }),
    User.countDocuments({ role: "rider", riderType: "station" }),
  ]);

  res.status(200).json({
    totalOrders,
    pendingOrders,
    processingOrders,
    completedOrders,
    todayOrders,
    monthRevenue: monthRevenue[0]?.total || 0,
    unpaidOrders,
    availableFuelDeliveries,
    activeDeliveries,
    totalStations,
    activeStations,
    totalUsers,
    totalRiders,
    fuelRiders,
    stationRiders,
  });
});

// ═════════════════════════════════════════════════════════════
//  USER MANAGEMENT
// ═════════════════════════════════════════════════════════════

// @desc    Admin: Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  assertMainAdmin(req, res);

  const { role, isVerified, search, station, riderType, stationRole } =
    req.query;

  const filter = {};
  if (role) filter.role = role;
  if (isVerified !== undefined) filter.isVerified = isVerified === "true";
  if (station) filter.station = station;
  if (riderType) filter.riderType = riderType;
  if (stationRole) filter.stationRole = stationRole;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(filter)
    .select(
      "-password -otp -otpExpires -resetOtp -resetOtpExpires -deleteAfter"
    )
    .populate("station", "name address status")
    .sort({ createdAt: -1 });

  res.status(200).json(users);
});

// @desc    Admin: Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  assertMainAdmin(req, res);

  const user = await User.findById(req.params.id)
    .select(
      "-password -otp -otpExpires -resetOtp -resetOtpExpires -deleteAfter"
    )
    .populate("station", "name address status");

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
  assertMainAdmin(req, res);

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

  // Don't allow flipping a station admin's main role without going
  // through the station flow — that would leave the station orphaned.
  if (user.stationRole === "admin" && user.station && role !== "user") {
    res.status(400);
    throw new Error(
      "This user is a station admin. Reassign the station admin first, then change their role."
    );
  }

  // Demoting a rider to user also clears their rider type
  if (role === "user" && user.role === "rider") {
    user.riderType = null;
  }
  // Promoting to rider without a station defaults to fuel
  if (role === "rider" && !user.riderType) {
    user.riderType = "fuel";
  }
  // If they're being promoted to main admin, detach from any station
  if (role === "admin") {
    user.station = null;
    user.stationRole = null;
    user.riderType = null;
  }

  const oldRole = user.role;
  user.role = role;
  await user.save();

  // ── Notify the user (fire-and-forget) ─────────────────────
  if (oldRole !== role) {
    notifyUserRoleChange(user, role).catch((err) =>
      console.error("[admin] role-change notify failed:", err)
    );
  }

  res.status(200).json({
    message: `User role updated to ${role}`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      riderType: user.riderType,
      station: user.station,
      stationRole: user.stationRole,
    },
  });
});

// @desc    Admin: Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  assertMainAdmin(req, res);

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // If they were a station admin, clear the reference on the station
  if (user.station && user.stationRole === "admin") {
    await Station.updateOne(
      { _id: user.station, admin: user._id },
      { $set: { admin: null } }
    );
  }
  // Remove from any team / rider lists
  if (user.station) {
    await Station.updateOne(
      { _id: user.station },
      {
        $pull: {
          teamMembers: user._id,
          riders: user._id,
        },
      }
    );
  }

  await user.deleteOne();
  res.status(200).json({ message: "User deleted successfully" });
});

// ═════════════════════════════════════════════════════════════
//  RIDER APPLICATION MANAGEMENT
// ═════════════════════════════════════════════════════════════

// @desc    Admin: Get all rider applications
// @route   GET /api/admin/riders/applications
// @access  Private/Admin
const getRiderApplications = asyncHandler(async (req, res) => {
  assertMainAdmin(req, res);

  const { status } = req.query;
  const filter = {};
  if (status) filter.verificationStatus = status;
  else filter.verificationStatus = { $in: ["pending", "approved", "rejected"] };

  const users = await User.find(filter)
    .select(
      "name email phone nin fuelingStation proofOfAddress profilePicture ninPicture bankAccountNumber bankName bankCode accountName verificationStatus rejectionReason verificationSubmittedAt role riderType station stationRole createdAt"
    )
    .populate("station", "name address status")
    .sort({ verificationSubmittedAt: -1 });

  res.status(200).json(users);
});

// @desc    Admin: Approve a rider application (fuel rider)
// @route   PUT /api/admin/riders/:userId/approve
// @access  Private/Admin
const approveRider = asyncHandler(async (req, res) => {
  assertMainAdmin(req, res);

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
  if (user.station) {
    res.status(400);
    throw new Error(
      "This user is part of a station. Manage them from the station controller."
    );
  }

  user.verificationStatus = "approved";
  user.role = "rider";
  user.riderType = "fuel";
  user.verificationReviewedAt = new Date();
  user.verificationReviewedBy = req.user._id;
  await user.save();

  // ── Email (absolute URL for the CTA) ──────────────────────
  notifyRiderEvent(user, "approved", {
    dashboardUrl: emailDashboardUrl("rider"),
  }).catch((err) =>
    console.error("[admin] rider-approved email failed:", err)
  );

  // ── Push (uses the existing helper, relative link inside) ─
  notifyRiderApplicationPush(user._id, "approved").catch((err) =>
    console.error("[admin] rider-approved push failed:", err)
  );

  res.status(200).json({
    message: "Rider application approved. User is now a fuel rider.",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      riderType: user.riderType,
      verificationStatus: user.verificationStatus,
    },
  });
});

// @desc    Admin: Reject a rider application
// @route   PUT /api/admin/riders/:userId/reject
// @access  Private/Admin
const rejectRider = asyncHandler(async (req, res) => {
  assertMainAdmin(req, res);

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

// ═════════════════════════════════════════════════════════════
//  RIDER MANAGEMENT
// ═════════════════════════════════════════════════════════════

// @desc    Admin: Get all riders (optionally filter by type/station)
// @route   GET /api/admin/riders
// @access  Private/Admin
const getAllRiders = asyncHandler(async (req, res) => {
  assertMainAdmin(req, res);

  const { riderType, station, search } = req.query;
  const filter = { role: "rider" };
  if (riderType) filter.riderType = riderType;
  if (station) filter.station = station;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const riders = await User.find(filter)
    .select(
      "name email phone profilePicture walletBalance totalEarnings completedDeliveries verificationStatus riderType station stationRole createdAt"
    )
    .populate("station", "name address status")
    .sort({ createdAt: -1 });

  res.status(200).json(riders);
});

// ═════════════════════════════════════════════════════════════
//  DELIVERY MANAGEMENT
// ═════════════════════════════════════════════════════════════

// @desc    Admin: Get all active deliveries (both fuel and station gas)
// @route   GET /api/admin/deliveries/active
// @access  Private/Admin
const getActiveDeliveries = asyncHandler(async (req, res) => {
  assertMainAdmin(req, res);

  const { orderType, station } = req.query;
  const filter = {
    paid: true,
    status: "processing",
    deliveryStatus: {
      $in: ["accepted", "picked_up", "in_transit", "delivered"],
    },
  };
  if (orderType) filter.orderType = orderType;
  if (station) filter.station = station;

  const deliveries = await Order.find(filter)
    .populate("user", "name email phone")
    .populate("rider", "name email profilePicture phone riderType")
    .populate("station", "name address coordinates")
    .sort({ createdAt: -1 });

  res.status(200).json(deliveries);
});

// ═════════════════════════════════════════════════════════════
//  STATIONS OVERVIEW  ⭐ NEW
//  Main-admin view across all stations in one call.
//  Station CRUD lives in stationController.js
// ═════════════════════════════════════════════════════════════

// @desc    Admin: Aggregate stats across all stations
// @route   GET /api/admin/stations/overview
// @access  Private/Admin
const getStationsOverview = asyncHandler(async (req, res) => {
  assertMainAdmin(req, res);

  const stations = await Station.find()
    .populate("admin", "name email phone")
    .sort({ createdAt: -1 })
    .lean();

  const today = startOfToday();

  const enriched = await Promise.all(
    stations.map(async (s) => {
      const [openOrders, todayOrders, todayRevenueAgg, activeDeliveries, teamCount, riderCount] =
        await Promise.all([
          Order.countDocuments({
            station: s._id,
            status: { $in: ["pending", "processing"] },
          }),
          Order.countDocuments({
            station: s._id,
            createdAt: { $gte: today },
          }),
          Order.aggregate([
            {
              $match: {
                station: s._id,
                paid: true,
                createdAt: { $gte: today },
              },
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
          ]),
          Order.countDocuments({
            station: s._id,
            status: "processing",
            deliveryStatus: {
              $in: ["accepted", "picked_up", "in_transit"],
            },
          }),
          User.countDocuments({
            station: s._id,
            stationRole: { $in: ["admin", "staff"] },
          }),
          User.countDocuments({
            station: s._id,
            riderType: "station",
          }),
        ]);

      const stock = s.stock || {};
      const lowStockSizes = CYLINDER_SIZES.filter(
        (size) => Number(stock[size] || 0) < LOW_STOCK_THRESHOLD
      );

      return {
        _id: s._id,
        name: s.name,
        address: s.address,
        coordinates: s.coordinates,
        phone: s.phone,
        email: s.email,
        status: s.status,
        admin: s.admin || null,
        stock,
        lowStockSizes,
        stats: {
          openOrders,
          todayOrders,
          todayRevenue: todayRevenueAgg[0]?.total || 0,
          activeDeliveries,
          teamCount,
          riderCount,
        },
        createdAt: s.createdAt,
      };
    })
  );

  // Global roll-ups
  const totalStations = enriched.length;
  const activeStations = enriched.filter((s) => s.status === "active").length;
  const totalTodayRevenue = enriched.reduce(
    (sum, s) => sum + (s.stats.todayRevenue || 0),
    0
  );
  const totalOpenOrders = enriched.reduce(
    (sum, s) => sum + (s.stats.openOrders || 0),
    0
  );
  const stationsWithLowStock = enriched.filter(
    (s) => s.lowStockSizes.length > 0
  ).length;

  res.status(200).json({
    totals: {
      totalStations,
      activeStations,
      totalTodayRevenue,
      totalOpenOrders,
      stationsWithLowStock,
    },
    stations: enriched,
  });
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
  // Stations overview (read-only — CRUD is in stationController.js)
  getStationsOverview,
};