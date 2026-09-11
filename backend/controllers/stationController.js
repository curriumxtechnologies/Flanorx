// controllers/stationController.js
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Station from "../models/stationModel.js";
import StockLog from "../models/stockLogModel.js";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";

// ─── Constants ────────────────────────────────────────────────
const CYLINDER_SIZES = ["3kg", "6kg", "12kg"];
const DEFAULT_NEARBY_RADIUS_KM = 50;
const LOW_STOCK_THRESHOLD = 5;
const MAX_ACTIVE_ORDERS_PER_STATION = 200; // guard for order fetch
const USER_SEARCH_MIN_LEN = 2;
const USER_SEARCH_LIMIT = 50;

// ─── Permission helpers ───────────────────────────────────────
const isMainAdmin = (user) => user && user.role === "admin";

const isStationMember = (user, stationId) =>
  user &&
  user.station &&
  String(user.station) === String(stationId);

const isStationAdmin = (user, stationId) =>
  isStationMember(user, stationId) && user.stationRole === "admin";

const isStationStaff = (user, stationId) =>
  isStationMember(user, stationId) &&
  (user.stationRole === "admin" || user.stationRole === "staff");

// Main admin bypasses everything; station admin/staff scoped to their station
const assertCanOperateStation = (user, stationId) => {
  if (isMainAdmin(user)) return;
  if (isStationStaff(user, stationId)) return;
  const err = new Error("Not allowed to operate this station");
  err.status = 403;
  throw err;
};

const assertCanManageStation = (user, stationId) => {
  if (isMainAdmin(user)) return;
  if (isStationAdmin(user, stationId)) return;
  const err = new Error("Only the station admin can perform this action");
  err.status = 403;
  throw err;
};

// ─── Geo helper ───────────────────────────────────────────────
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Stock logging ────────────────────────────────────────────
const applyStockChange = async ({
  station,
  cylinderSize,
  delta,
  reason,
  order = null,
  performedBy,
  note = "",
}) => {
  if (!CYLINDER_SIZES.includes(cylinderSize)) {
    const err = new Error("Invalid cylinder size");
    err.status = 400;
    throw err;
  }
  const before = Number(station.stock?.[cylinderSize] || 0);
  const after = before + Number(delta);
  if (after < 0) {
    const err = new Error("Insufficient stock for this cylinder size");
    err.status = 400;
    throw err;
  }

  if (!station.stock) station.stock = {};
  station.stock[cylinderSize] = after;
  station.markModified("stock");
  await station.save();

  await StockLog.create({
    station: station._id,
    cylinderSize,
    delta: Number(delta),
    reason,
    order,
    performedBy,
    note,
    stockBefore: before,
    stockAfter: after,
  });

  return station;
};

// ─── Shared helpers for team / riders ─────────────────────────
const addTeamMemberInternal = async (stationId, userId) => {
  const station = await Station.findById(stationId);
  if (!station) {
    const err = new Error("Station not found");
    err.status = 404;
    throw err;
  }
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  if (user.station && String(user.station) !== String(stationId)) {
    const err = new Error("User is already assigned to another station");
    err.status = 400;
    throw err;
  }
  if (user.role === "admin") {
    const err = new Error("Admins cannot be assigned as station staff");
    err.status = 400;
    throw err;
  }

  user.station = stationId;
  user.stationRole = "staff";
  user.riderType = null;
  await user.save();

  if (!station.teamMembers.some((id) => String(id) === String(userId))) {
    station.teamMembers.push(userId);
    await station.save();
  }
  return { station, user };
};

const removeTeamMemberInternal = async (stationId, userId) => {
  const station = await Station.findById(stationId);
  if (!station) {
    const err = new Error("Station not found");
    err.status = 404;
    throw err;
  }
  const user = await User.findById(userId);
  if (!user || String(user.station) !== String(stationId)) {
    const err = new Error("User is not part of this station");
    err.status = 404;
    throw err;
  }

  user.station = null;
  user.stationRole = null;
  await user.save();

  station.teamMembers = station.teamMembers.filter(
    (id) => String(id) !== String(userId)
  );
  await station.save();
  return { station, user };
};

const addRiderToStationInternal = async (stationId, userId) => {
  const station = await Station.findById(stationId);
  if (!station) {
    const err = new Error("Station not found");
    err.status = 404;
    throw err;
  }
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  if (user.role === "admin") {
    const err = new Error("Admins cannot be assigned as station riders");
    err.status = 400;
    throw err;
  }
  if (user.station && String(user.station) !== String(stationId)) {
    const err = new Error("User is already assigned to another station");
    err.status = 400;
    throw err;
  }

  user.role = "rider";
  user.riderType = "station";
  user.station = stationId;
  user.stationRole = "rider";
  await user.save();

  if (!station.riders.some((id) => String(id) === String(userId))) {
    station.riders.push(userId);
    await station.save();
  }
  return { station, user };
};

const removeRiderFromStationInternal = async (stationId, userId) => {
  const station = await Station.findById(stationId);
  if (!station) {
    const err = new Error("Station not found");
    err.status = 404;
    throw err;
  }
  const user = await User.findById(userId);
  if (!user || String(user.station) !== String(stationId)) {
    const err = new Error("Rider is not part of this station");
    err.status = 404;
    throw err;
  }

  user.station = null;
  user.stationRole = null;
  // Rider remains a rider, but reverts to fuel scope by default
  user.riderType = "fuel";
  await user.save();

  station.riders = station.riders.filter(
    (id) => String(id) !== String(userId)
  );
  await station.save();
  return { station, user };
};

// ═════════════════════════════════════════════════════════════
//  PUBLIC / ANY AUTH USER
// ═════════════════════════════════════════════════════════════

// @desc    Get nearest active stations to a coordinate
// @route   GET /api/stations/nearby?lat=&lng=&radiusKm=
// @access  Private
const getNearbyStations = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radiusKm) || DEFAULT_NEARBY_RADIUS_KM;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400);
    throw new Error("lat and lng are required");
  }

  const stations = await Station.find({ status: "active" })
    .select("name address coordinates stock phone email")
    .lean();

  const withDistance = stations
    .map((s) => {
      const sLat = s.coordinates?.lat;
      const sLng = s.coordinates?.lng;
      if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) return null;
      return { ...s, distanceKm: haversineKm(lat, lng, sLat, sLng) };
    })
    .filter((s) => s && s.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.status(200).json(withDistance);
});

// ═════════════════════════════════════════════════════════════
//  MAIN ADMIN
// ═════════════════════════════════════════════════════════════

// @desc    Create a station
// @route   POST /api/admin/stations
// @access  Private/Main Admin
const createStation = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can create stations");
  }

  const {
    name,
    address,
    coordinates,
    phone,
    email,
    operatingHours,
    adminId,
  } = req.body;

  if (!name || !address) {
    res.status(400);
    throw new Error("name and address are required");
  }
  if (
    !coordinates ||
    !Number.isFinite(Number(coordinates.lat)) ||
    !Number.isFinite(Number(coordinates.lng))
  ) {
    res.status(400);
    throw new Error("coordinates { lat, lng } are required");
  }

  const station = await Station.create({
    name,
    address,
    coordinates: {
      lat: Number(coordinates.lat),
      lng: Number(coordinates.lng),
    },
    phone: phone || "",
    email: email || "",
    operatingHours: operatingHours || "",
    status: "active",
    stock: { "3kg": 0, "6kg": 0, "12kg": 0 },
    createdBy: req.user._id,
  });

  if (adminId) {
    const adminUser = await User.findById(adminId);
    if (!adminUser) {
      await Station.findByIdAndDelete(station._id);
      res.status(404);
      throw new Error("Admin user not found");
    }
    if (adminUser.station && String(adminUser.station) !== String(station._id)) {
      await Station.findByIdAndDelete(station._id);
      res.status(400);
      throw new Error("User is already assigned to another station");
    }

    adminUser.station = station._id;
    adminUser.stationRole = "admin";
    adminUser.riderType = null;
    await adminUser.save();

    station.admin = adminUser._id;
    await station.save();
  }

  const populated = await Station.findById(station._id)
    .populate("admin", "name email phone")
    .populate("teamMembers", "name email phone")
    .populate("riders", "name email phone riderType");

  res.status(201).json(populated);
});

// @desc    Get all stations (with light stats)
// @route   GET /api/admin/stations
// @access  Private/Main Admin
const getAllStations = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can view all stations");
  }

  const stations = await Station.find()
    .populate("admin", "name email phone")
    .sort({ createdAt: -1 });

  // Attach counts in a single pass
  const enriched = await Promise.all(
    stations.map(async (s) => {
      const [openOrders, todayOrders, revenueAgg] = await Promise.all([
        Order.countDocuments({
          station: s._id,
          status: { $in: ["pending", "processing"] },
        }),
        Order.countDocuments({
          station: s._id,
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        }),
        Order.aggregate([
          {
            $match: {
              station: s._id,
              paid: true,
              createdAt: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
      ]);

      const lowStockSizes = CYLINDER_SIZES.filter(
        (size) => (s.stock?.[size] || 0) < LOW_STOCK_THRESHOLD
      );

      return {
        ...s.toObject(),
        stats: {
          openOrders,
          todayOrders,
          todayRevenue: revenueAgg[0]?.total || 0,
          lowStockSizes,
          teamCount: s.teamMembers?.length || 0,
          riderCount: s.riders?.length || 0,
        },
      };
    })
  );

  res.status(200).json(enriched);
});

// @desc    Get a single station (main admin)
// @route   GET /api/admin/stations/:id
// @access  Private/Main Admin
const getStationById = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can view this station");
  }

  const station = await Station.findById(req.params.id)
    .populate("admin", "name email phone")
    .populate("teamMembers", "name email phone")
    .populate("riders", "name email phone riderType walletBalance")
    .populate("createdBy", "name email");

  if (!station) {
    res.status(404);
    throw new Error("Station not found");
  }
  res.status(200).json(station);
});

// @desc    Update a station
// @route   PUT /api/admin/stations/:id
// @access  Private/Main Admin
const updateStation = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can update stations");
  }

  const station = await Station.findById(req.params.id);
  if (!station) {
    res.status(404);
    throw new Error("Station not found");
  }

  const { name, address, coordinates, phone, email, operatingHours, status } =
    req.body;

  if (name !== undefined) station.name = name;
  if (address !== undefined) station.address = address;
  if (phone !== undefined) station.phone = phone;
  if (email !== undefined) station.email = email;
  if (operatingHours !== undefined) station.operatingHours = operatingHours;
  if (status !== undefined) {
    if (!["active", "inactive", "suspended"].includes(status)) {
      res.status(400);
      throw new Error("Invalid status");
    }
    station.status = status;
  }
  if (coordinates) {
    if (
      !Number.isFinite(Number(coordinates.lat)) ||
      !Number.isFinite(Number(coordinates.lng))
    ) {
      res.status(400);
      throw new Error("coordinates must be { lat, lng }");
    }
    station.coordinates = {
      lat: Number(coordinates.lat),
      lng: Number(coordinates.lng),
    };
  }

  await station.save();

  const populated = await Station.findById(station._id)
    .populate("admin", "name email phone")
    .populate("teamMembers", "name email phone")
    .populate("riders", "name email phone riderType");

  res.status(200).json(populated);
});

// @desc    Deactivate a station (soft delete)
// @route   DELETE /api/admin/stations/:id
// @access  Private/Main Admin
const deleteStation = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can delete stations");
  }

  const station = await Station.findById(req.params.id);
  if (!station) {
    res.status(404);
    throw new Error("Station not found");
  }

  station.status = "inactive";
  await station.save();

  res.status(200).json({ message: "Station deactivated", station });
});

// @desc    Assign (or reassign) the station admin
// @route   PUT /api/admin/stations/:id/assign-admin
// @access  Private/Main Admin
const assignStationAdmin = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can assign a station admin");
  }

  const { userId } = req.body;
  if (!userId) {
    res.status(400);
    throw new Error("userId is required");
  }

  const station = await Station.findById(req.params.id);
  if (!station) {
    res.status(404);
    throw new Error("Station not found");
  }

  const newAdmin = await User.findById(userId);
  if (!newAdmin) {
    res.status(404);
    throw new Error("User not found");
  }
  if (newAdmin.role === "admin") {
    res.status(400);
    throw new Error("Main admins cannot be assigned as station admins");
  }
  if (newAdmin.station && String(newAdmin.station) !== String(station._id)) {
    res.status(400);
    throw new Error("User is already assigned to another station");
  }

  // Unassign the previous admin (demote to staff if they were the admin)
  if (station.admin && String(station.admin) !== String(userId)) {
    const prev = await User.findById(station.admin);
    if (prev && String(prev.station) === String(station._id)) {
      prev.stationRole = "staff";
      await prev.save();
      if (!station.teamMembers.some((id) => String(id) === String(prev._id))) {
        station.teamMembers.push(prev._id);
      }
    }
  }

  newAdmin.station = station._id;
  newAdmin.stationRole = "admin";
  newAdmin.riderType = null;
  await newAdmin.save();

  // Remove them from riders list if present
  station.riders = station.riders.filter((id) => String(id) !== String(userId));
  // Remove them from teamMembers if present (they're now the admin)
  station.teamMembers = station.teamMembers.filter(
    (id) => String(id) !== String(userId)
  );
  station.admin = newAdmin._id;
  await station.save();

  const populated = await Station.findById(station._id)
    .populate("admin", "name email phone")
    .populate("teamMembers", "name email phone")
    .populate("riders", "name email phone riderType");

  res.status(200).json({
    message: "Station admin assigned",
    station: populated,
  });
});

// @desc    Main admin: add a rider to any station
// @route   POST /api/admin/stations/:id/riders
// @access  Private/Main Admin
const adminAddStationRider = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can perform this action");
  }
  const { userId } = req.body;
  if (!userId) {
    res.status(400);
    throw new Error("userId is required");
  }
  const { station, user } = await addRiderToStationInternal(
    req.params.id,
    userId
  );
  res.status(200).json({
    message: "Rider added to station",
    station,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      riderType: user.riderType,
      stationRole: user.stationRole,
    },
  });
});

// @desc    Main admin: remove a rider from any station
// @route   DELETE /api/admin/stations/:id/riders/:userId
// @access  Private/Main Admin
const adminRemoveStationRider = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can perform this action");
  }
  const { station, user } = await removeRiderFromStationInternal(
    req.params.id,
    req.params.userId
  );
  res.status(200).json({
    message: "Rider removed from station",
    station,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      riderType: user.riderType,
    },
  });
});

// @desc    Main admin: adjust stock (override)
// @route   POST /api/admin/stations/:id/adjust-stock
// @access  Private/Main Admin
const adminAdjustStock = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can adjust stock");
  }
  const { cylinderSize, delta, absolute, note } = req.body;
  if (!cylinderSize) {
    res.status(400);
    throw new Error("cylinderSize is required");
  }
  if (!note || !String(note).trim()) {
    res.status(400);
    throw new Error("A note is required for stock adjustments");
  }

  const station = await Station.findById(req.params.id);
  if (!station) {
    res.status(404);
    throw new Error("Station not found");
  }

  const current = Number(station.stock?.[cylinderSize] || 0);
  let changeDelta;
  if (Number.isFinite(Number(absolute))) {
    changeDelta = Number(absolute) - current;
  } else if (Number.isFinite(Number(delta))) {
    changeDelta = Number(delta);
  } else {
    res.status(400);
    throw new Error("Provide either delta or absolute");
  }

  const updated = await applyStockChange({
    station,
    cylinderSize,
    delta: changeDelta,
    reason: "adjustment",
    performedBy: req.user._id,
    note,
  });

  res.status(200).json({
    message: "Stock adjusted",
    stock: updated.stock,
    delta: changeDelta,
  });
});

// @desc    Main admin: full stock log for a station
// @route   GET /api/admin/stations/:id/logs
// @access  Private/Main Admin
const adminGetStationLogs = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can view this station's logs");
  }

  const { cylinderSize, reason, limit = 100 } = req.query;
  const filter = { station: req.params.id };
  if (cylinderSize) filter.cylinderSize = cylinderSize;
  if (reason) filter.reason = reason;

  const logs = await StockLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 100, 500))
    .populate("order", "orderId orderType totalAmount")
    .populate("performedBy", "name email role stationRole");

  res.status(200).json(logs);
});

// ═════════════════════════════════════════════════════════════
//  STATION SCOPE (station admin + staff, main admin bypasses)
// ═════════════════════════════════════════════════════════════

// @desc    Get the caller's station
// @route   GET /api/station/me
// @access  Private (station admin/staff)
const getMyStation = asyncHandler(async (req, res) => {
  if (isMainAdmin(req.user)) {
    res.status(400);
    throw new Error("Main admins don't have a station. Use /api/admin/stations.");
  }
  if (!req.user.station) {
    res.status(404);
    throw new Error("You are not assigned to any station");
  }

  const station = await Station.findById(req.user.station)
    .populate("admin", "name email phone")
    .populate("teamMembers", "name email phone")
    .populate("riders", "name email phone riderType");

  if (!station) {
    res.status(404);
    throw new Error("Station not found");
  }
  res.status(200).json(station);
});

// @desc    Station dashboard summary
// @route   GET /api/station/dashboard
// @access  Private (station admin/staff)
const getStationDashboard = asyncHandler(async (req, res) => {
  const stationId = req.user.station;
  if (!stationId && !isMainAdmin(req.user)) {
    res.status(404);
    throw new Error("You are not assigned to any station");
  }
  const targetId = isMainAdmin(req.user) ? req.query.stationId : stationId;
  if (!targetId) {
    res.status(400);
    throw new Error("stationId is required for main admin");
  }

  assertCanOperateStation(req.user, targetId);

  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const stationObjectId = new mongoose.Types.ObjectId(targetId);

  const [
    station,
    openOrders,
    todayOrders,
    todayRevenueAgg,
    activeRiders,
    teamCount,
  ] = await Promise.all([
    Station.findById(targetId).select("name stock status"),
    Order.countDocuments({
      station: targetId,
      status: { $in: ["pending", "processing"] },
    }),
    Order.countDocuments({
      station: targetId,
      createdAt: { $gte: startOfToday },
    }),
    Order.aggregate([
      {
        $match: {
          station: stationObjectId,
          paid: true,
          createdAt: { $gte: startOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.countDocuments({
      station: targetId,
      status: "processing",
      deliveryStatus: { $in: ["accepted", "picked_up", "in_transit"] },
    }),
    User.countDocuments({
      station: targetId,
      stationRole: { $in: ["admin", "staff"] },
    }),
  ]);

  if (!station) {
    res.status(404);
    throw new Error("Station not found");
  }

  const lowStock = CYLINDER_SIZES.map((size) => ({
    size,
    count: station.stock?.[size] || 0,
    low: (station.stock?.[size] || 0) < LOW_STOCK_THRESHOLD,
  }));

  res.status(200).json({
    station: { _id: station._id, name: station.name, status: station.status },
    openOrders,
    todayOrders,
    todayRevenue: todayRevenueAgg[0]?.total || 0,
    activeDeliveries: activeRiders,
    teamCount,
    stock: station.stock,
    lowStock,
  });
});

// @desc    Get current stock
// @route   GET /api/station/inventory
// @access  Private (station admin/staff)
const getStationInventory = asyncHandler(async (req, res) => {
  const targetId = isMainAdmin(req.user) ? req.query.stationId : req.user.station;
  if (!targetId) {
    res.status(400);
    throw new Error("stationId is required");
  }
  assertCanOperateStation(req.user, targetId);

  const station = await Station.findById(targetId).select("name stock");
  if (!station) {
    res.status(404);
    throw new Error("Station not found");
  }

  const inventory = CYLINDER_SIZES.map((size) => ({
    size,
    count: station.stock?.[size] || 0,
    low: (station.stock?.[size] || 0) < LOW_STOCK_THRESHOLD,
  }));

  res.status(200).json({
    station: { _id: station._id, name: station.name },
    inventory,
  });
});

// @desc    Restock inventory (adds cylinders)
// @route   POST /api/station/inventory/restock
// @access  Private (station admin/staff)
const restockInventory = asyncHandler(async (req, res) => {
  const targetId = isMainAdmin(req.user)
    ? req.body.stationId
    : req.user.station;
  if (!targetId) {
    res.status(400);
    throw new Error("stationId is required");
  }
  assertCanOperateStation(req.user, targetId);

  const { cylinderSize, quantity, note } = req.body;
  const qty = Number(quantity);
  if (!cylinderSize || !CYLINDER_SIZES.includes(cylinderSize)) {
    res.status(400);
    throw new Error("Valid cylinderSize is required");
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    res.status(400);
    throw new Error("quantity must be a positive number");
  }

  const station = await Station.findById(targetId);
  if (!station) {
    res.status(404);
    throw new Error("Station not found");
  }

  const updated = await applyStockChange({
    station,
    cylinderSize,
    delta: qty,
    reason: "restock",
    performedBy: req.user._id,
    note: note || "",
  });

  res.status(200).json({
    message: "Restocked",
    stock: updated.stock,
  });
});

// @desc    Stock log for own station
// @route   GET /api/station/inventory/logs
// @access  Private (station admin/staff)
const getInventoryLogs = asyncHandler(async (req, res) => {
  const targetId = isMainAdmin(req.user) ? req.query.stationId : req.user.station;
  if (!targetId) {
    res.status(400);
    throw new Error("stationId is required");
  }
  assertCanOperateStation(req.user, targetId);

  const { cylinderSize, reason, limit = 100 } = req.query;
  const filter = { station: targetId };
  if (cylinderSize) filter.cylinderSize = cylinderSize;
  if (reason) filter.reason = reason;

  const logs = await StockLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 100, 500))
    .populate("order", "orderId orderType totalAmount")
    .populate("performedBy", "name email role stationRole");

  res.status(200).json(logs);
});

// @desc    Orders assigned to my station
// @route   GET /api/station/orders
// @access  Private (station admin/staff)
const getStationOrders = asyncHandler(async (req, res) => {
  const targetId = isMainAdmin(req.user) ? req.query.stationId : req.user.station;
  if (!targetId) {
    res.status(400);
    throw new Error("stationId is required");
  }
  assertCanOperateStation(req.user, targetId);

  const { status, deliveryStatus, fulfillmentType, paid } = req.query;
  const filter = { station: targetId };
  if (status) filter.status = status;
  if (deliveryStatus) filter.deliveryStatus = deliveryStatus;
  if (fulfillmentType) filter.fulfillmentType = fulfillmentType;
  if (paid !== undefined) filter.paid = paid === "true";

  const orders = await Order.find(filter)
    .populate("user", "name email phone")
    .populate("rider", "name email phone profilePicture")
    .sort({ createdAt: -1 })
    .limit(MAX_ACTIVE_ORDERS_PER_STATION);

  res.status(200).json(orders);
});

// @desc    Assign a station rider to a gas order
// @route   PUT /api/station/orders/:id/assign-rider
// @access  Private (station admin/staff)
const assignRiderToOrder = asyncHandler(async (req, res) => {
  const { riderId } = req.body;
  if (!riderId) {
    res.status(400);
    throw new Error("riderId is required");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!order.station) {
    res.status(400);
    throw new Error("Order has no station assigned");
  }

  assertCanOperateStation(req.user, order.station);

  if (order.orderType !== "gas") {
    res.status(400);
    throw new Error("Rider assignment is only for gas orders");
  }
  if (order.fulfillmentType !== "delivery") {
    res.status(400);
    throw new Error("This order is a pickup — no rider needed");
  }
  if (!order.paid) {
    res.status(400);
    throw new Error("Order is not paid");
  }
  if (order.status !== "processing" && order.status !== "pending") {
    res.status(400);
    throw new Error("Order is not in a state that allows rider assignment");
  }
  if (order.verificationScannedAt) {
    res.status(400);
    throw new Error("Order is already confirmed");
  }

  const rider = await User.findById(riderId);
  if (!rider) {
    res.status(404);
    throw new Error("Rider not found");
  }
  if (
    rider.role !== "rider" ||
    rider.riderType !== "station" ||
    String(rider.station) !== String(order.station)
  ) {
    res.status(400);
    throw new Error("Rider is not a station rider for this station");
  }

  order.rider = rider._id;
  order.deliveryStatus = "accepted";
  order.acceptedAt = new Date();
  order.riderAssignedBy = req.user._id;
  order.riderAssignedAt = new Date();
  await order.save();

  const populated = await Order.findById(order._id)
    .populate("user", "name email phone")
    .populate("rider", "name email phone profilePicture");

  res.status(200).json({
    message: "Rider assigned",
    order: populated,
  });
});

// @desc    Mark a pickup order as ready for pickup
// @route   PUT /api/station/orders/:id/mark-ready
// @access  Private (station admin/staff)
const markOrderReady = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!order.station) {
    res.status(400);
    throw new Error("Order has no station assigned");
  }
  assertCanOperateStation(req.user, order.station);

  if (order.fulfillmentType !== "pickup") {
    res.status(400);
    throw new Error("Only pickup orders can be marked ready");
  }
  if (!order.paid) {
    res.status(400);
    throw new Error("Order is not paid");
  }
  if (order.verificationScannedAt) {
    res.status(400);
    throw new Error("Order is already confirmed");
  }

  order.deliveryStatus = "accepted"; // station has accepted / prepared it
  order.status = "processing";
  await order.save();

  res.status(200).json({ message: "Order marked ready for pickup", order });
});

// ═════════════════════════════════════════════════════════════
//  STATION ADMIN ONLY (team + rider management)
// ═════════════════════════════════════════════════════════════

// @desc    Get team members of own station
// @route   GET /api/station/team
// @access  Private (station admin)
const getStationTeam = asyncHandler(async (req, res) => {
  const targetId = isMainAdmin(req.user) ? req.query.stationId : req.user.station;
  if (!targetId) {
    res.status(400);
    throw new Error("stationId is required");
  }
  assertCanManageStation(req.user, targetId);

  const members = await User.find({
    station: targetId,
    stationRole: { $in: ["admin", "staff"] },
  }).select("name email phone stationRole isVerified createdAt");

  res.status(200).json(members);
});

// @desc    Add a team member
// @route   POST /api/station/team
// @access  Private (station admin)
const addStationTeamMember = asyncHandler(async (req, res) => {
  const targetId = isMainAdmin(req.user)
    ? req.body.stationId
    : req.user.station;
  if (!targetId) {
    res.status(400);
    throw new Error("stationId is required");
  }
  assertCanManageStation(req.user, targetId);

  const { userId } = req.body;
  if (!userId) {
    res.status(400);
    throw new Error("userId is required");
  }

  const { station, user } = await addTeamMemberInternal(targetId, userId);

  res.status(200).json({
    message: "Team member added",
    station,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      stationRole: user.stationRole,
    },
  });
});

// @desc    Remove a team member
// @route   DELETE /api/station/team/:userId
// @access  Private (station admin)
const removeStationTeamMember = asyncHandler(async (req, res) => {
  const targetId = isMainAdmin(req.user) ? req.query.stationId : req.user.station;
  if (!targetId) {
    res.status(400);
    throw new Error("stationId is required");
  }
  assertCanManageStation(req.user, targetId);

  // Cannot remove the station admin via this route
  const station = await Station.findById(targetId);
  if (station && String(station.admin) === String(req.params.userId)) {
    res.status(400);
    throw new Error("Cannot remove the station admin. Reassign admin first.");
  }

  const { station: updated, user } = await removeTeamMemberInternal(
    targetId,
    req.params.userId
  );

  res.status(200).json({
    message: "Team member removed",
    station: updated,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

// @desc    Station admin: search users that can be added to the station
// @route   GET /api/station/users/search?q=
// @access  Private (station admin)
const searchUsersForStation = asyncHandler(async (req, res) => {
  const targetId = isMainAdmin(req.user)
    ? req.query.stationId
    : req.user.station;
  if (!targetId) {
    res.status(400);
    throw new Error("stationId is required");
  }
  assertCanManageStation(req.user, targetId);

  const q = String(req.query.q || "").trim();
  const limit = Math.min(Number(req.query.limit) || 20, USER_SEARCH_LIMIT);

  const filter = {
    role: { $ne: "admin" }, // never offer main admins
    station: null,          // not already in a station
    isVerified: true,       // only verified accounts
  };

  if (q.length >= USER_SEARCH_MIN_LEN) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  } else {
    // No query — return an empty list so the frontend doesn't
    // dump every user. The frontend requires 2+ chars anyway.
    return res.status(200).json([]);
  }

  const users = await User.find(filter)
    .select("name email phone role riderType createdAt")
    .sort({ createdAt: -1 })
    .limit(limit);

  res.status(200).json(users);
});

// @desc    Get riders of own station
// @route   GET /api/station/riders
// @access  Private (station admin)
const getStationRiders = asyncHandler(async (req, res) => {
  const targetId = isMainAdmin(req.user) ? req.query.stationId : req.user.station;
  if (!targetId) {
    res.status(400);
    throw new Error("stationId is required");
  }
  assertCanManageStation(req.user, targetId);

  const riders = await User.find({
    station: targetId,
    riderType: "station",
  }).select(
    "name email phone walletBalance totalEarnings completedDeliveries isVerified createdAt"
  );

  res.status(200).json(riders);
});

// @desc    Add a rider to own station
// @route   POST /api/station/riders
// @access  Private (station admin)
const addStationRider = asyncHandler(async (req, res) => {
  const targetId = isMainAdmin(req.user)
    ? req.body.stationId
    : req.user.station;
  if (!targetId) {
    res.status(400);
    throw new Error("stationId is required");
  }
  assertCanManageStation(req.user, targetId);

  const { userId } = req.body;
  if (!userId) {
    res.status(400);
    throw new Error("userId is required");
  }

  const { station, user } = await addRiderToStationInternal(targetId, userId);

  res.status(200).json({
    message: "Rider added",
    station,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      riderType: user.riderType,
    },
  });
});

// @desc    Remove a rider from own station
// @route   DELETE /api/station/riders/:userId
// @access  Private (station admin)
const removeStationRider = asyncHandler(async (req, res) => {
  const targetId = isMainAdmin(req.user) ? req.query.stationId : req.user.station;
  if (!targetId) {
    res.status(400);
    throw new Error("stationId is required");
  }
  assertCanManageStation(req.user, targetId);

  const { station, user } = await removeRiderFromStationInternal(
    targetId,
    req.params.userId
  );

  res.status(200).json({
    message: "Rider removed",
    station,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      riderType: user.riderType,
    },
  });
});

// ─── Exports ──────────────────────────────────────────────────
export {
  // Public
  getNearbyStations,
  // Main admin
  createStation,
  getAllStations,
  getStationById,
  updateStation,
  deleteStation,
  assignStationAdmin,
  adminAddStationRider,
  adminRemoveStationRider,
  adminAdjustStock,
  adminGetStationLogs,
  // Station scope
  getMyStation,
  getStationDashboard,
  getStationInventory,
  restockInventory,
  getInventoryLogs,
  getStationOrders,
  assignRiderToOrder,
  markOrderReady,
  // Station admin only
  getStationTeam,
  addStationTeamMember,
  removeStationTeamMember,
  searchUsersForStation,
  getStationRiders,
  addStationRider,
  removeStationRider,
};