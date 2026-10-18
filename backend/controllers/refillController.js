// controllers/refillController.js
//
// Third-party refill stations — distinct from Flanorx-owned `Station`.
//
// Application (multipart/form-data via Cloudinary):
//   • businessLicense   (1 file)     → licenseUrl
//   • shopPhotos        (1–10 files) → shopPhotos[]
//   • cylinderPhotos    (1–10 files) → cylinderPhotos[]
//
// Flow:
//   1. Existing refill businesses apply → main admin reviews documents and
//      approves/rejects.
//   2. Customers discover nearby approved refill stations, then place a
//      refill order (pickup at the station OR delivery by the station's
//      own rider/team member).
//   3. Station owners may add team members (staff) and riders.
//   4. On every completed order a commission (default 5%, editable via
//      PlatformSetting) is accrued against the station.
//   5. A monthly invoice is generated from completed-but-uninvoiced orders.
//      If unpaid by `dueDate + graceDays` the station is auto-banned.
//
// Cron jobs call the exported admin functions
// `adminGenerateInvoicesForPeriod` and `adminRunAgingAndAutoBan`.

import asyncHandler from "express-async-handler";
import axios from "axios";
import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import RefillStation from "../models/refillStationModel.js";
import RefillOrder from "../models/refillOrderModel.js";
import CommissionInvoice from "../models/commissionInvoiceModel.js";
import PlatformSetting from "../models/platformSettingModel.js";

const PAYSTACK_BASE = "https://api.paystack.co";

// ─── Constants ─────────────────────────────────────────────
const CYLINDER_SIZES = ["3kg", "6kg", "12kg", "25kg", "50kg"];
const DEFAULT_NEARBY_RADIUS_KM = 50;
const DEFAULT_COMMISSION_RATE = 5;
const DEFAULT_GRACE_DAYS = 10;
const REFILL_SETTINGS_KEY = "refill";
const MAX_ACTIVE_ORDERS_PER_STATION = 200;
const MAX_TEAM_MEMBERS_PER_STATION = 20;
const USER_SEARCH_MIN_LEN = 2;
const USER_SEARCH_LIMIT = 50;

// Document limits — mirrored on the multer config in refillRoutes.js
const MAX_SHOP_PHOTOS = 10;
const MAX_CYLINDER_PHOTOS = 10;

// ─── Permission helpers ────────────────────────────────────
const isMainAdmin = (user) => user && user.role === "admin";

const isRefillMember = (user, stationId) =>
  user &&
  user.refillStation &&
  String(user.refillStation) === String(stationId);

const isRefillOwner = (user, stationId) =>
  isRefillMember(user, stationId) && user.refillStationRole === "owner";

const isRefillStaff = (user, stationId) =>
  isRefillMember(user, stationId) &&
  ["owner", "staff"].includes(user.refillStationRole);

const assertCanOperateRefill = (user, stationId) => {
  if (isMainAdmin(user)) return;
  if (isRefillStaff(user, stationId)) return;
  const err = new Error("Not allowed to operate this refill station");
  err.status = 403;
  throw err;
};

const assertCanManageRefill = (user, stationId) => {
  if (isMainAdmin(user)) return;
  if (isRefillOwner(user, stationId)) return;
  const err = new Error("Only the refill station owner can perform this action");
  err.status = 403;
  throw err;
};

const canAccessRefillOrder = (user, order) => {
  if (!user) return false;
  if (isMainAdmin(user)) return true;

  const customerId = String(order.customer?._id || order.customer || "");
  const stationId = String(order.station?._id || order.station || "");
  const riderId = String(order.assignedRider?._id || order.assignedRider || "");
  const me = String(user._id);

  if (customerId === me) return true;
  if (riderId === me) return true;
  if (user.refillStation && String(user.refillStation) === stationId) return true;
  return false;
};

// ─── Multipart / Cloudinary helpers ───────────────────────
// FormData coerces every value to a string, so structured fields arrive
// as JSON-encoded strings. This helper decodes them safely.
const safeJSON = (value) => {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  // Only try JSON for values that look structured
  if (!/^[[{]/.test(trimmed)) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

// Multer (via multer-storage-cloudinary) populates `req.files` as:
//   { license: [{ path: "https://res.cloudinary.com/..." }],
//     shopPhotos: [...], cylinderPhotos: [...] }
const extractUploadedDocuments = (req) => {
  const files = req.files || {};
  const license = files.license?.[0]?.path || files.businessLicense?.[0]?.path || null;
  const shopPhotos = (files.shopPhotos || [])
    .map((f) => f?.path)
    .filter(Boolean);
  const cylinderPhotos = (files.cylinderPhotos || [])
    .map((f) => f?.path)
    .filter(Boolean);

  return { license, shopPhotos, cylinderPhotos };
};

// ─── Platform settings ────────────────────────────────────
const getRefillSettings = async () => {
  let settings = await PlatformSetting.findOne({ key: REFILL_SETTINGS_KEY });
  if (!settings) {
    settings = await PlatformSetting.create({
      key: REFILL_SETTINGS_KEY,
      commissionRate: DEFAULT_COMMISSION_RATE,
      graceDays: DEFAULT_GRACE_DAYS,
    });
  }
  return settings;
};

// ─── Geo helper ───────────────────────────────────────────
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

// ─── Paystack helpers ─────────────────────────────────────
const getPaystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
});

const initializePaystackPayment = async ({
  email,
  amountInKobo,
  reference,
  metadata,
}) => {
  const resp = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    {
      email,
      amount: amountInKobo,
      reference,
      callback_url: process.env.PAYSTACK_CALLBACK_URL,
      metadata: { ...metadata, app: "flanorx_refill" },
    },
    { headers: getPaystackHeaders() }
  );
  return resp?.data?.data || {};
};

const verifyPaystackPayment = async (reference) => {
  const resp = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );
  return resp?.data?.data || null;
};

// ─── Token helper ─────────────────────────────────────────
const generateVerificationToken = () =>
  crypto.randomBytes(24).toString("hex");

// ─── Commission helpers ───────────────────────────────────
const resolveCommissionRate = (station, settings) => {
  if (
    station &&
    Number.isFinite(Number(station.commissionRateOverride)) &&
    Number(station.commissionRateOverride) >= 0
  ) {
    return Number(station.commissionRateOverride);
  }
  return Number(settings.commissionRate);
};

const calculateCommission = (total, ratePercent) =>
  Number(((Number(total) * Number(ratePercent)) / 100).toFixed(2));

const accrueCommissionForOrder = async ({ order, station, settings }) => {
  if (order.commissionRecorded) return order;
  if (!order.totalAmount || order.totalAmount <= 0) return order;

  const rate = resolveCommissionRate(station, settings);
  const commission = calculateCommission(order.totalAmount, rate);

  order.commissionRate = rate;
  order.commissionAmount = commission;
  order.commissionRecorded = true;
  await order.save();

  if (commission > 0) {
    station.totalCommissionOwed =
      Number(station.totalCommissionOwed || 0) + commission;
    await station.save();
  }
  return order;
};

const finaliseRefillOrder = async ({ order, actorId, note = "" }) => {
  if (order.status === "completed") return order;

  order.status = "completed";
  order.completedAt = order.completedAt || new Date();
  if (actorId) order.completedBy = actorId;
  if (note) order.completionNote = note;

  if (order.fulfillmentType === "delivery" && !order.deliveredAt) {
    order.deliveredAt = new Date();
  }
  if (order.fulfillmentType === "delivery" && order.deliveryStatus !== "confirmed") {
    order.deliveryStatus = "confirmed";
  }
  await order.save();

  const station = await RefillStation.findById(order.station);
  const settings = await getRefillSettings();
  if (station) {
    await accrueCommissionForOrder({ order, station, settings });
  }
  return order;
};

// ─── Invoice generation & auto-ban ────────────────────────
const buildInvoiceForStationPeriod = async ({ station, start, end, settings }) => {
  const orders = await RefillOrder.find({
    station: station._id,
    status: "completed",
    commissionRecorded: true,
    commissionInvoice: null,
    completedAt: { $gte: start, $lt: end },
  }).select("_id totalAmount commissionAmount");

  if (orders.length === 0) return null;

  const totalSales = orders.reduce(
    (s, o) => s + Number(o.totalAmount || 0),
    0
  );
  const commissionOwed = Number(
    orders.reduce((s, o) => s + Number(o.commissionAmount || 0), 0).toFixed(2)
  );

  const period = {
    month: start.getMonth() + 1,
    year: start.getFullYear(),
  };

  const dueDate = new Date(end);
  const graceEndsAt = new Date(dueDate);
  graceEndsAt.setDate(graceEndsAt.getDate() + Number(settings.graceDays));

  const invoice = await CommissionInvoice.create({
    station: station._id,
    period,
    orderCount: orders.length,
    totalSales,
    commissionRate: resolveCommissionRate(station, settings),
    commissionOwed,
    status: "pending",
    dueDate,
    graceEndsAt,
    orders: orders.map((o) => o._id),
  });

  await RefillOrder.updateMany(
    { _id: { $in: orders.map((o) => o._id) } },
    { $set: { commissionInvoice: invoice._id } }
  );

  return invoice;
};

const maybeAutoUnbanStation = async (stationId) => {
  const station = await RefillStation.findById(stationId);
  if (!station || station.status !== "banned") return station;

  const stillOverdue = await CommissionInvoice.countDocuments({
    station: stationId,
    status: "overdue",
  });
  if (stillOverdue === 0) {
    station.status = "approved";
    station.banReason = null;
    station.bannedAt = null;
    station.unbannedAt = new Date();
    await station.save();
  }
  return station;
};

// ═════════════════════════════════════════════════════════════
//  APPLICATION FLOW (multipart + Cloudinary documents)
// ═════════════════════════════════════════════════════════════

// @desc    Apply to become a refill station
// @route   POST /api/refill/stations/apply
// @access  Private (multipart/form-data)
// @files   businessLicense (1), shopPhotos (1–10), cylinderPhotos (1–10)
// @fields  businessName, contactPerson, phone, email?, address,
//          coordinates (JSON), operatingHours?,
//          supportedCylinderSizes (JSON array),
//          cylinderPrices (JSON object), logoUrl?
const applyAsRefillStation = asyncHandler(async (req, res) => {
  // FormData → parse structured fields
  const coordinates = safeJSON(req.body.coordinates);
  const supportedCylinderSizes = safeJSON(req.body.supportedCylinderSizes);
  const cylinderPrices = safeJSON(req.body.cylinderPrices);

  const {
    businessName,
    contactPerson,
    phone,
    email,
    address,
    operatingHours,
    logoUrl,
  } = req.body;

  const { license, shopPhotos, cylinderPhotos } =
    extractUploadedDocuments(req);

  // ── Validate required text fields ─────────────────────
  if (!businessName || !address || !contactPerson || !phone) {
    res.status(400);
    throw new Error(
      "businessName, address, contactPerson, and phone are required"
    );
  }
  if (
    !coordinates ||
    !Number.isFinite(Number(coordinates.lat)) ||
    !Number.isFinite(Number(coordinates.lng))
  ) {
    res.status(400);
    throw new Error("coordinates { lat, lng } are required");
  }

  // ── Validate cylinder sizes + prices ──────────────────
  const sizes =
    Array.isArray(supportedCylinderSizes) && supportedCylinderSizes.length
      ? supportedCylinderSizes.filter((s) => CYLINDER_SIZES.includes(s))
      : [];
  if (!sizes.length) {
    res.status(400);
    throw new Error(
      `supportedCylinderSizes required; valid: ${CYLINDER_SIZES.join(", ")}`
    );
  }

  const prices = {};
  for (const size of sizes) {
    const p = Number(cylinderPrices?.[size]);
    if (!Number.isFinite(p) || p <= 0) {
      res.status(400);
      throw new Error(`A positive cylinderPrices["${size}"] is required`);
    }
    prices[size] = p;
  }

  // ── Validate document uploads ─────────────────────────
  if (shopPhotos.length > MAX_SHOP_PHOTOS) {
    res.status(400);
    throw new Error(`Too many shop photos (max ${MAX_SHOP_PHOTOS})`);
  }
  if (cylinderPhotos.length > MAX_CYLINDER_PHOTOS) {
    res.status(400);
    throw new Error(`Too many cylinder photos (max ${MAX_CYLINDER_PHOTOS})`);
  }

  // ── Existing application (re-apply) ───────────────────
  const existing = await RefillStation.findOne({ owner: req.user._id });
  if (existing && existing.status === "pending") {
    res.status(400);
    throw new Error("You already have a pending application");
  }
  if (existing && existing.status === "approved") {
    res.status(400);
    throw new Error("You already operate a refill station");
  }

  // If re-applying and no new files uploaded, keep the old ones so the
  // applicant only needs to fix the text fields that failed review.
  const finalLicense = license || existing?.licenseUrl || null;
  const finalShopPhotos = shopPhotos.length
    ? shopPhotos
    : existing?.shopPhotos || [];
  const finalCylinderPhotos = cylinderPhotos.length
    ? cylinderPhotos
    : existing?.cylinderPhotos || [];

  if (!finalLicense) {
    res.status(400);
    throw new Error(
      "Business license document is required (field: businessLicense)"
    );
  }
  if (!finalShopPhotos.length) {
    res.status(400);
    throw new Error("At least one shop photo is required (field: shopPhotos)");
  }
  if (!finalCylinderPhotos.length) {
    res.status(400);
    throw new Error(
      "At least one cylinder photo is required (field: cylinderPhotos)"
    );
  }

  const payload = {
    owner: req.user._id,
    businessName: String(businessName).trim(),
    contactPerson: String(contactPerson).trim(),
    phone: String(phone).trim(),
    email: (email || req.user.email || "").trim(),
    address: String(address).trim(),
    coordinates: {
      lat: Number(coordinates.lat),
      lng: Number(coordinates.lng),
    },
    operatingHours: operatingHours || "",
    supportedCylinderSizes: sizes,
    cylinderPrices: prices,
    logoUrl: logoUrl || "",
    // Documents
    licenseUrl: finalLicense,
    licenseUploadedAt: license ? new Date() : existing?.licenseUploadedAt || null,
    shopPhotos: finalShopPhotos,
    cylinderPhotos: finalCylinderPhotos,
    // Status reset for re-review
    status: "pending",
    termsAcceptedAt: new Date(),
    rejectionReason: null,
    reviewedAt: null,
    reviewedBy: null,
  };

  const station = existing
    ? Object.assign(existing, payload)
    : new RefillStation(payload);

  await station.save();

  res.status(201).json({
    message: "Application submitted. You will be notified once reviewed.",
    station: {
      _id: station._id,
      businessName: station.businessName,
      status: station.status,
      documents: {
        licenseUrl: station.licenseUrl,
        shopPhotoCount: station.shopPhotos.length,
        cylinderPhotoCount: station.cylinderPhotos.length,
      },
      createdAt: station.createdAt,
    },
  });
});

// @desc    Get my refill station application / profile
// @route   GET /api/refill/stations/application/me
// @access  Private
const getMyRefillApplication = asyncHandler(async (req, res) => {
  const station = await RefillStation.findOne({ owner: req.user._id })
    .populate("reviewedBy", "name email")
    .lean();

  if (!station) {
    return res.status(200).json({ station: null });
  }
  res.status(200).json({ station });
});

// ═════════════════════════════════════════════════════════════
//  PUBLIC / CUSTOMER DISCOVERY
// ═════════════════════════════════════════════════════════════

// @desc    Find nearby approved+active refill stations
// @route   GET /api/refill/stations/nearby?lat=&lng=&radiusKm=&cylinderSize=
// @access  Private
const getNearbyRefillStations = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radiusKm) || DEFAULT_NEARBY_RADIUS_KM;
  const cylinderSize = req.query.cylinderSize;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400);
    throw new Error("lat and lng are required");
  }
  if (cylinderSize && !CYLINDER_SIZES.includes(cylinderSize)) {
    res.status(400);
    throw new Error("Invalid cylinderSize");
  }

  const filter = { status: "approved" };
  if (cylinderSize) filter.supportedCylinderSizes = cylinderSize;

  const stations = await RefillStation.find(filter)
    .select(
      "businessName address coordinates phone email logoUrl operatingHours supportedCylinderSizes cylinderPrices ratings"
    )
    .lean();

  const withDistance = stations
    .map((s) => {
      const sLat = Number(s.coordinates?.lat);
      const sLng = Number(s.coordinates?.lng);
      if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) return null;
      return { ...s, distanceKm: haversineKm(lat, lng, sLat, sLng) };
    })
    .filter((s) => s && s.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.status(200).json(withDistance);
});

// @desc    Public refill station profile
// @route   GET /api/refill/stations/:id
// @access  Private
const getRefillStationPublic = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid station id");
  }
  const station = await RefillStation.findOne({
    _id: req.params.id,
    status: "approved",
  })
    .select(
      "businessName address coordinates phone email logoUrl shopPhotos operatingHours supportedCylinderSizes cylinderPrices ratings createdAt"
    )
    .lean();

  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }
  res.status(200).json(station);
});

// ═════════════════════════════════════════════════════════════
//  CUSTOMER ORDER FLOW
// ═════════════════════════════════════════════════════════════

const createRefillOrder = asyncHandler(async (req, res) => {
  const {
    stationId,
    cylinderSize,
    quantity,
    fulfillmentType,
    deliveryAddress,
    deliveryCoordinates,
    scheduledDate,
    scheduledTime,
    notes,
  } = req.body;

  if (!stationId || !mongoose.isValidObjectId(stationId)) {
    res.status(400);
    throw new Error("stationId is required");
  }
  if (!cylinderSize || !CYLINDER_SIZES.includes(cylinderSize)) {
    res.status(400);
    throw new Error("Valid cylinderSize is required");
  }
  const qty = Number(quantity) || 1;
  if (!Number.isFinite(qty) || qty <= 0) {
    res.status(400);
    throw new Error("quantity must be a positive number");
  }
  const resolvedFulfillment =
    fulfillmentType === "delivery" ? "delivery" : "pickup";

  const station = await RefillStation.findById(stationId);
  if (!station || station.status !== "approved") {
    res.status(400);
    throw new Error("Selected refill station is not available");
  }
  if (!station.supportedCylinderSizes?.includes(cylinderSize)) {
    res.status(400);
    throw new Error(
      `This station does not support ${cylinderSize} cylinders`
    );
  }
  const unitPrice = Number(station.cylinderPrices?.[cylinderSize]);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    res.status(400);
    throw new Error("Station has no price set for this cylinder size");
  }

  let deliveryFee = 0;
  if (resolvedFulfillment === "delivery") {
    if (
      !deliveryCoordinates ||
      !Number.isFinite(Number(deliveryCoordinates.lat)) ||
      !Number.isFinite(Number(deliveryCoordinates.lng))
    ) {
      res.status(400);
      throw new Error("deliveryCoordinates { lat, lng } are required");
    }
    if (!deliveryAddress) {
      res.status(400);
      throw new Error("deliveryAddress is required for delivery orders");
    }
    const distKm = haversineKm(
      Number(deliveryCoordinates.lat),
      Number(deliveryCoordinates.lng),
      Number(station.coordinates.lat),
      Number(station.coordinates.lng)
    );
    deliveryFee = Math.round(Number(station.deliveryFeePerKm || 100) * distKm);
  }

  const subtotal = unitPrice * qty;
  const totalAmount = subtotal + deliveryFee;

  const reference = `RFL_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const order = await RefillOrder.create({
    customer: req.user._id,
    station: station._id,
    cylinderSize,
    quantity: qty,
    unitPrice,
    refillType: "refill",
    fulfillmentType: resolvedFulfillment,
    deliveryAddress: deliveryAddress || "",
    deliveryCoordinates:
      resolvedFulfillment === "delivery"
        ? {
            lat: Number(deliveryCoordinates.lat),
            lng: Number(deliveryCoordinates.lng),
          }
        : undefined,
    scheduledDate: scheduledDate || null,
    scheduledTime: scheduledTime || null,
    subtotal,
    deliveryFee,
    totalAmount,
    status: "pending",
    deliveryStatus: "pending",
    paymentStatus: "pending",
    paymentReference: reference,
    paymentMethod: "card",
    notes: notes || "",
    verificationToken: generateVerificationToken(),
  });

  const paystackData = await initializePaystackPayment({
    email: req.user.email,
    amountInKobo: Math.round(totalAmount * 100),
    reference,
    metadata: {
      type: "refill_order",
      orderId: String(order._id),
      stationId: String(station._id),
      userId: String(req.user._id),
    },
  });

  if (!paystackData.authorization_url || !paystackData.reference) {
    await RefillOrder.findByIdAndDelete(order._id);
    res.status(502);
    throw new Error("Failed to initialize Paystack payment");
  }

  order.paymentReference = paystackData.reference;
  await order.save();

  res.status(201).json({
    order: {
      _id: order._id,
      station: {
        _id: station._id,
        businessName: station.businessName,
        address: station.address,
      },
      cylinderSize,
      quantity: qty,
      fulfillmentType: resolvedFulfillment,
      subtotal,
      deliveryFee,
      totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
    },
    authorization_url: paystackData.authorization_url,
    reference: paystackData.reference,
  });
});

const verifyRefillPayment = asyncHandler(async (req, res) => {
  const { reference } = req.query;
  if (!reference) {
    res.status(400);
    throw new Error("reference is required");
  }

  const data = await verifyPaystackPayment(reference);
  if (!data || data.status !== "success") {
    res.status(400);
    throw new Error("Payment verification failed");
  }

  const order = await RefillOrder.findOne({ paymentReference: reference });
  if (!order) {
    res.status(404);
    throw new Error("Refill order not found for this reference");
  }
  if (String(order.customer) !== String(req.user._id) && !isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Not allowed");
  }

  if (order.paymentStatus !== "paid") {
    const expectedKobo = Math.round(Number(order.totalAmount) * 100);
    if (Number(data.amount) !== expectedKobo) {
      res.status(400);
      throw new Error("Payment amount mismatch");
    }
    order.paymentStatus = "paid";
    order.paidAt = new Date();
    order.status = "paid";
    await order.save();
  }

  const populated = await RefillOrder.findById(order._id)
    .populate("station", "businessName address coordinates phone")
    .populate("customer", "name email phone");

  res.status(200).json({ success: true, order: populated });
});

const getMyRefillOrders = asyncHandler(async (req, res) => {
  const { status, limit = 50 } = req.query;
  const filter = { customer: req.user._id };
  if (status) filter.status = status;

  const orders = await RefillOrder.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 200))
    .populate("station", "businessName address coordinates phone logoUrl")
    .populate("assignedRider", "name phone profilePicture");

  res.status(200).json(orders);
});

const getRefillOrder = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid order id");
  }
  const order = await RefillOrder.findById(req.params.id)
    .populate("station", "businessName address coordinates phone logoUrl")
    .populate("customer", "name email phone")
    .populate("assignedRider", "name phone profilePicture");

  if (!order) {
    res.status(404);
    throw new Error("Refill order not found");
  }
  if (!canAccessRefillOrder(req.user, order)) {
    res.status(403);
    throw new Error("Not allowed");
  }

  const obj = order.toObject();
  if (
    String(order.customer._id) !== String(req.user._id) &&
    !isMainAdmin(req.user)
  ) {
    delete obj.verificationToken;
  }
  res.status(200).json(obj);
});

const confirmRefillOrder = asyncHandler(async (req, res) => {
  const order = await RefillOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Refill order not found");
  }
  if (String(order.customer) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not allowed");
  }
  if (order.paymentStatus !== "paid") {
    res.status(400);
    throw new Error("Order is not paid");
  }
  if (order.status === "cancelled" || order.status === "rejected") {
    res.status(400);
    throw new Error(`Order is ${order.status} and cannot be confirmed`);
  }
  if (order.status === "completed") {
    return res.status(200).json({ success: true, order });
  }

  order.customerConfirmedAt = new Date();
  await order.save();
  const finalised = await finaliseRefillOrder({
    order,
    actorId: req.user._id,
    note: "Customer confirmed",
  });

  res.status(200).json({ success: true, order: finalised });
});

const cancelRefillOrder = asyncHandler(async (req, res) => {
  const order = await RefillOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Refill order not found");
  }
  if (String(order.customer) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not allowed");
  }
  if (!["pending", "paid", "accepted"].includes(order.status)) {
    res.status(400);
    throw new Error(`Order cannot be cancelled from status "${order.status}"`);
  }

  order.status = "cancelled";
  order.cancelledAt = new Date();
  order.cancelledBy = req.user._id;
  if (order.paymentStatus === "paid") {
    order.paymentStatus = "refunded";
  }
  await order.save();

  res.status(200).json({ success: true, order });
});

// ═════════════════════════════════════════════════════════════
//  STATION SIDE (owner / staff)
// ═════════════════════════════════════════════════════════════

const getMyRefillStation = asyncHandler(async (req, res) => {
  if (!req.user.refillStation) {
    res.status(404);
    throw new Error("You are not attached to any refill station");
  }
  const station = await RefillStation.findById(req.user.refillStation)
    .populate("owner", "name email phone")
    .populate("teamMembers", "name email phone refillStationRole");
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }
  res.status(200).json(station);
});

// @desc    Update my refill station profile (text fields only —
//          documents go through PUT /api/refill/stations/me/documents)
// @route   PUT /api/refill/stations/me
// @access  Private (owner)
const updateMyRefillStation = asyncHandler(async (req, res) => {
  if (!req.user.refillStation) {
    res.status(404);
    throw new Error("You are not attached to any refill station");
  }
  const station = await RefillStation.findById(req.user.refillStation);
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }
  assertCanManageRefill(req.user, station._id);

  const {
    businessName,
    contactPerson,
    phone,
    email,
    address,
    coordinates,
    operatingHours,
    supportedCylinderSizes,
    cylinderPrices,
    logoUrl,
    deliveryFeePerKm,
  } = req.body;

  if (businessName !== undefined) station.businessName = businessName;
  if (contactPerson !== undefined) station.contactPerson = contactPerson;
  if (phone !== undefined) station.phone = phone;
  if (email !== undefined) station.email = email;
  if (address !== undefined) station.address = address;
  if (operatingHours !== undefined) station.operatingHours = operatingHours;
  if (logoUrl !== undefined) station.logoUrl = logoUrl;
  if (Number.isFinite(Number(deliveryFeePerKm)))
    station.deliveryFeePerKm = Number(deliveryFeePerKm);

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

  if (Array.isArray(supportedCylinderSizes) && supportedCylinderSizes.length) {
    const sizes = supportedCylinderSizes.filter((s) => CYLINDER_SIZES.includes(s));
    if (!sizes.length) {
      res.status(400);
      throw new Error("No valid cylinder sizes provided");
    }
    station.supportedCylinderSizes = sizes;
  }

  if (cylinderPrices && typeof cylinderPrices === "object") {
    const next = { ...station.cylinderPrices };
    for (const size of station.supportedCylinderSizes) {
      if (cylinderPrices[size] !== undefined) {
        const p = Number(cylinderPrices[size]);
        if (!Number.isFinite(p) || p <= 0) {
          res.status(400);
          throw new Error(`Invalid price for ${size}`);
        }
        next[size] = p;
      }
    }
    station.cylinderPrices = next;
  }

  await station.save();
  res.status(200).json({ message: "Station updated", station });
});

// @desc    Replace my shop photos, cylinder photos, and/or license
// @route   PUT /api/refill/stations/me/documents
// @access  Private (owner) — multipart/form-data
// @files   businessLicense (0–1), shopPhotos (0–10), cylinderPhotos (0–10)
//          Any file field omitted = keep existing. Any included file field
//          replaces that collection entirely.
const updateMyRefillStationDocuments = asyncHandler(async (req, res) => {
  if (!req.user.refillStation) {
    res.status(404);
    throw new Error("You are not attached to any refill station");
  }
  const station = await RefillStation.findById(req.user.refillStation);
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }
  assertCanManageRefill(req.user, station._id);

  const { license, shopPhotos, cylinderPhotos } =
    extractUploadedDocuments(req);

  if (shopPhotos.length > MAX_SHOP_PHOTOS) {
    res.status(400);
    throw new Error(`Too many shop photos (max ${MAX_SHOP_PHOTOS})`);
  }
  if (cylinderPhotos.length > MAX_CYLINDER_PHOTOS) {
    res.status(400);
    throw new Error(`Too many cylinder photos (max ${MAX_CYLINDER_PHOTOS})`);
  }

  const updates = [];
  let licenseChanged = false;

  if (license && license !== station.licenseUrl) {
    station.licenseUrl = license;
    station.licenseUploadedAt = new Date();
    licenseChanged = true;
    updates.push("businessLicense");
  }
  if (shopPhotos.length) {
    station.shopPhotos = shopPhotos;
    updates.push("shopPhotos");
  }
  if (cylinderPhotos.length) {
    station.cylinderPhotos = cylinderPhotos;
    updates.push("cylinderPhotos");
  }

  if (!updates.length) {
    res.status(400);
    throw new Error(
      "Nothing to update. Upload at least one of: businessLicense, shopPhotos, cylinderPhotos"
    );
  }

  // A license replacement is a material change → force re-approval.
  // Shop/cylinder photos alone keep the station operational.
  if (licenseChanged && station.status === "approved") {
    station.status = "pending";
    station.reviewedAt = null;
    station.reviewedBy = null;
    station.rejectionReason = null;
  }

  await station.save();

  res.status(200).json({
    message: licenseChanged
      ? "Documents updated. License change requires re-approval by an admin."
      : "Documents updated.",
    requiresReapproval: licenseChanged,
    updated: updates,
    station: {
      _id: station._id,
      businessName: station.businessName,
      status: station.status,
      documents: {
        licenseUrl: station.licenseUrl,
        licenseUploadedAt: station.licenseUploadedAt,
        shopPhotoCount: station.shopPhotos.length,
        cylinderPhotoCount: station.cylinderPhotos.length,
      },
    },
  });
});

const getRefillStationDashboard = asyncHandler(async (req, res) => {
  const stationId = req.user.refillStation;
  if (!stationId) {
    res.status(404);
    throw new Error("You are not attached to any refill station");
  }
  assertCanOperateRefill(req.user, stationId);

  const station = await RefillStation.findById(stationId).select(
    "businessName status totalCommissionOwed totalCommissionPaid"
  );
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }

  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const [
    paidAwaitingAcceptance,
    inProgress,
    completedToday,
    revenueTodayAgg,
    revenueMonthAgg,
    openInvoice,
  ] = await Promise.all([
    RefillOrder.countDocuments({ station: stationId, status: "paid" }),
    RefillOrder.countDocuments({ station: stationId, status: "accepted" }),
    RefillOrder.countDocuments({
      station: stationId,
      status: "completed",
      completedAt: { $gte: startOfToday },
    }),
    RefillOrder.aggregate([
      {
        $match: {
          station: new mongoose.Types.ObjectId(stationId),
          status: "completed",
          completedAt: { $gte: startOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    RefillOrder.aggregate([
      {
        $match: {
          station: new mongoose.Types.ObjectId(stationId),
          status: "completed",
          completedAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    CommissionInvoice.findOne({
      station: stationId,
      status: { $in: ["pending", "overdue"] },
    }).sort({ createdAt: -1 }),
  ]);

  res.status(200).json({
    station: {
      _id: station._id,
      businessName: station.businessName,
      status: station.status,
    },
    awaitingAcceptance: paidAwaitingAcceptance,
    inProgress,
    completedToday,
    revenueToday: revenueTodayAgg[0]?.total || 0,
    revenueMonth: revenueMonthAgg[0]?.total || 0,
    commission: {
      totalOwed: station.totalCommissionOwed || 0,
      totalPaid: station.totalCommissionPaid || 0,
      openInvoice,
    },
  });
});

const getRefillStationOrders = asyncHandler(async (req, res) => {
  const stationId = req.user.refillStation;
  if (!stationId) {
    res.status(404);
    throw new Error("You are not attached to any refill station");
  }
  assertCanOperateRefill(req.user, stationId);

  const { status, limit = 100 } = req.query;
  const filter = { station: stationId };
  if (status) filter.status = status;

  const orders = await RefillOrder.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 100, MAX_ACTIVE_ORDERS_PER_STATION))
    .populate("customer", "name email phone")
    .populate("assignedRider", "name phone profilePicture");

  res.status(200).json(orders);
});

const acceptRefillOrder = asyncHandler(async (req, res) => {
  const order = await RefillOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Refill order not found");
  }
  assertCanOperateRefill(req.user, order.station);
  if (order.status !== "paid") {
    res.status(400);
    throw new Error("Only paid orders can be accepted");
  }

  order.status = "accepted";
  order.acceptedAt = new Date();
  order.acceptedBy = req.user._id;
  await order.save();

  res.status(200).json({ success: true, order });
});

const rejectRefillOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await RefillOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Refill order not found");
  }
  assertCanOperateRefill(req.user, order.station);
  if (order.status !== "paid") {
    res.status(400);
    throw new Error("Only paid orders can be rejected");
  }
  if (!reason || !String(reason).trim()) {
    res.status(400);
    throw new Error("rejectionReason is required");
  }

  order.status = "rejected";
  order.rejectionReason = String(reason).trim();
  order.rejectedAt = new Date();
  order.rejectedBy = req.user._id;
  if (order.paymentStatus === "paid") order.paymentStatus = "refunded";
  await order.save();

  res.status(200).json({ success: true, order });
});

const assignRefillRider = asyncHandler(async (req, res) => {
  const { riderId } = req.body;
  if (!riderId) {
    res.status(400);
    throw new Error("riderId is required");
  }
  const order = await RefillOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Refill order not found");
  }
  assertCanManageRefill(req.user, order.station);

  if (order.fulfillmentType !== "delivery") {
    res.status(400);
    throw new Error("Rider assignment is only for delivery orders");
  }
  if (!["accepted", "ready"].includes(order.status)) {
    res.status(400);
    throw new Error("Order is not in a state that allows rider assignment");
  }

  const rider = await User.findById(riderId);
  if (!rider) {
    res.status(404);
    throw new Error("Rider not found");
  }
  if (
    !isRefillMember(rider, order.station) ||
    !["owner", "staff", "rider"].includes(rider.refillStationRole)
  ) {
    res.status(400);
    throw new Error("User is not a member of this refill station");
  }

  order.assignedRider = rider._id;
  order.deliveryStatus = "accepted";
  order.riderAssignedAt = new Date();
  order.riderAssignedBy = req.user._id;
  await order.save();

  const populated = await RefillOrder.findById(order._id)
    .populate("customer", "name email phone")
    .populate("assignedRider", "name phone profilePicture");
  res.status(200).json({ success: true, order: populated });
});

const markRefillReady = asyncHandler(async (req, res) => {
  const order = await RefillOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Refill order not found");
  }
  assertCanOperateRefill(req.user, order.station);
  if (!["accepted", "ready"].includes(order.status)) {
    res.status(400);
    throw new Error("Order must be accepted before it can be marked ready");
  }

  order.status = "ready";
  order.readyAt = new Date();
  if (order.fulfillmentType === "delivery") {
    order.deliveryStatus = "in_transit";
  }
  await order.save();

  res.status(200).json({ success: true, order });
});

const markRefillDelivered = asyncHandler(async (req, res) => {
  const order = await RefillOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Refill order not found");
  }
  assertCanOperateRefill(req.user, order.station);
  if (!["ready", "delivered"].includes(order.status)) {
    res.status(400);
    throw new Error("Order must be ready before delivery/pickup");
  }

  if (order.fulfillmentType === "pickup") {
    const finalised = await finaliseRefillOrder({
      order,
      actorId: req.user._id,
      note: "Marked completed by station at pickup",
    });
    return res.status(200).json({ success: true, order: finalised });
  }

  order.status = "delivered";
  order.deliveryStatus = "delivered";
  order.deliveredAt = new Date();
  await order.save();
  res.status(200).json({ success: true, order });
});

const completeRefillOrder = asyncHandler(async (req, res) => {
  const order = await RefillOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Refill order not found");
  }
  assertCanManageRefill(req.user, order.station);
  if (order.paymentStatus !== "paid") {
    res.status(400);
    throw new Error("Order is not paid");
  }
  if (!["ready", "delivered", "accepted"].includes(order.status)) {
    res.status(400);
    throw new Error(`Cannot complete from status "${order.status}"`);
  }

  const finalised = await finaliseRefillOrder({
    order,
    actorId: req.user._id,
    note: "Marked completed by station",
  });
  res.status(200).json({ success: true, order: finalised });
});

// ─── Team management ──────────────────────────────────────

const getRefillTeam = asyncHandler(async (req, res) => {
  const stationId = req.user.refillStation;
  if (!stationId) {
    res.status(404);
    throw new Error("You are not attached to any refill station");
  }
  assertCanManageRefill(req.user, stationId);

  const members = await User.find({ refillStation: stationId })
    .select("name email phone refillStationRole isVerified createdAt")
    .sort({ createdAt: -1 });

  res.status(200).json(members);
});

const searchUsersForRefillStation = asyncHandler(async (req, res) => {
  const stationId = req.user.refillStation;
  if (!stationId) {
    res.status(404);
    throw new Error("You are not attached to any refill station");
  }
  assertCanManageRefill(req.user, stationId);

  const q = String(req.query.q || "").trim();
  const limit = Math.min(Number(req.query.limit) || 20, USER_SEARCH_LIMIT);
  if (q.length < USER_SEARCH_MIN_LEN) return res.status(200).json([]);

  const users = await User.find({
    role: { $ne: "admin" },
    refillStation: null,
    isVerified: true,
    $or: [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ],
  })
    .select("name email phone role refillStationRole createdAt")
    .sort({ createdAt: -1 })
    .limit(limit);

  res.status(200).json(users);
});

const addRefillTeamMember = asyncHandler(async (req, res) => {
  const stationId = req.user.refillStation;
  if (!stationId) {
    res.status(404);
    throw new Error("You are not attached to any refill station");
  }
  assertCanManageRefill(req.user, stationId);

  const { userId, role } = req.body;
  if (!userId) {
    res.status(400);
    throw new Error("userId is required");
  }
  const memberRole = role === "rider" ? "rider" : "staff";

  const station = await RefillStation.findById(stationId);
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }
  if ((station.teamMembers?.length || 0) >= MAX_TEAM_MEMBERS_PER_STATION) {
    res.status(400);
    throw new Error(
      `Team size limit reached (${MAX_TEAM_MEMBERS_PER_STATION})`
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (user.role === "admin") {
    res.status(400);
    throw new Error("Admins cannot be added as refill team members");
  }
  if (user.refillStation && String(user.refillStation) !== String(stationId)) {
    res.status(400);
    throw new Error("User is already part of another refill station");
  }

  user.refillStation = stationId;
  user.refillStationRole = memberRole;
  await user.save();

  if (!station.teamMembers.some((id) => String(id) === String(userId))) {
    station.teamMembers.push(userId);
  }
  if (
    memberRole === "rider" &&
    !station.riders.some((id) => String(id) === String(userId))
  ) {
    station.riders.push(userId);
  }
  await station.save();

  res.status(200).json({
    message: "Team member added",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      refillStationRole: user.refillStationRole,
    },
  });
});

const removeRefillTeamMember = asyncHandler(async (req, res) => {
  const stationId = req.user.refillStation;
  if (!stationId) {
    res.status(404);
    throw new Error("You are not attached to any refill station");
  }
  assertCanManageRefill(req.user, stationId);

  const { userId } = req.params;
  if (String(userId) === String(req.user._id)) {
    res.status(400);
    throw new Error("You cannot remove yourself from your own station");
  }

  const station = await RefillStation.findById(stationId);
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }
  const user = await User.findById(userId);
  if (!user || String(user.refillStation) !== String(stationId)) {
    res.status(404);
    throw new Error("User is not part of this refill station");
  }

  user.refillStation = null;
  user.refillStationRole = null;
  await user.save();

  station.teamMembers = station.teamMembers.filter(
    (id) => String(id) !== String(userId)
  );
  station.riders = station.riders.filter(
    (id) => String(id) !== String(userId)
  );
  await station.save();

  res.status(200).json({ message: "Team member removed" });
});

// ─── Commission & invoices (station side) ─────────────────

const getMyRefillCommission = asyncHandler(async (req, res) => {
  const stationId = req.user.refillStation;
  if (!stationId) {
    res.status(404);
    throw new Error("You are not attached to any refill station");
  }
  assertCanOperateRefill(req.user, stationId);

  const station = await RefillStation.findById(stationId).select(
    "totalCommissionOwed totalCommissionPaid commissionRateOverride"
  );
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }
  const settings = await getRefillSettings();

  const [openInvoices, pastInvoices] = await Promise.all([
    CommissionInvoice.find({
      station: stationId,
      status: { $in: ["pending", "overdue"] },
    }).sort({ dueDate: 1 }),
    CommissionInvoice.find({
      station: stationId,
      status: { $in: ["paid", "waived"] },
    })
      .sort({ dueDate: -1 })
      .limit(24),
  ]);

  res.status(200).json({
    commissionRate: resolveCommissionRate(station, settings),
    graceDays: settings.graceDays,
    totalOwed: Number(station.totalCommissionOwed || 0),
    totalPaid: Number(station.totalCommissionPaid || 0),
    openInvoices,
    history: pastInvoices,
  });
});

const getMyRefillInvoices = asyncHandler(async (req, res) => {
  const stationId = req.user.refillStation;
  if (!stationId) {
    res.status(404);
    throw new Error("You are not attached to any refill station");
  }
  assertCanManageRefill(req.user, stationId);

  const invoices = await CommissionInvoice.find({ station: stationId }).sort({
    dueDate: -1,
  });
  res.status(200).json(invoices);
});

const payRefillInvoice = asyncHandler(async (req, res) => {
  const stationId = req.user.refillStation;
  if (!stationId) {
    res.status(404);
    throw new Error("You are not attached to any refill station");
  }
  assertCanManageRefill(req.user, stationId);

  const invoice = await CommissionInvoice.findById(req.params.id);
  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }
  if (String(invoice.station) !== String(stationId)) {
    res.status(403);
    throw new Error("Not allowed");
  }
  if (invoice.status === "paid" || invoice.status === "waived") {
    res.status(400);
    throw new Error(`Invoice is already ${invoice.status}`);
  }

  const reference = `RINV_${invoice._id}_${Date.now()}`;
  const paystackData = await initializePaystackPayment({
    email: req.user.email,
    amountInKobo: Math.round(Number(invoice.commissionOwed) * 100),
    reference,
    metadata: {
      type: "refill_invoice",
      invoiceId: String(invoice._id),
      stationId: String(stationId),
      userId: String(req.user._id),
    },
  });
  if (!paystackData.authorization_url || !paystackData.reference) {
    res.status(502);
    throw new Error("Failed to initialize Paystack payment");
  }

  invoice.paymentReference = paystackData.reference;
  await invoice.save();

  res.status(200).json({
    authorization_url: paystackData.authorization_url,
    reference: paystackData.reference,
    amount: invoice.commissionOwed,
  });
});

const verifyRefillInvoicePayment = asyncHandler(async (req, res) => {
  const { reference } = req.query;
  if (!reference) {
    res.status(400);
    throw new Error("reference is required");
  }
  const data = await verifyPaystackPayment(reference);
  if (!data || data.status !== "success") {
    res.status(400);
    throw new Error("Payment verification failed");
  }
  const invoice = await CommissionInvoice.findOne({
    paymentReference: reference,
  });
  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found for this reference");
  }

  const stationId = req.user.refillStation;
  if (!isMainAdmin(req.user) && String(invoice.station) !== String(stationId)) {
    res.status(403);
    throw new Error("Not allowed");
  }

  if (invoice.status !== "paid") {
    const expectedKobo = Math.round(Number(invoice.commissionOwed) * 100);
    if (Number(data.amount) !== expectedKobo) {
      res.status(400);
      throw new Error("Payment amount mismatch");
    }
    invoice.status = "paid";
    invoice.paidAt = new Date();
    invoice.paidAmount = invoice.commissionOwed;
    await invoice.save();

    const station = await RefillStation.findById(invoice.station);
    if (station) {
      station.totalCommissionPaid =
        Number(station.totalCommissionPaid || 0) +
        Number(invoice.commissionOwed);
      station.totalCommissionOwed = Math.max(
        0,
        Number(station.totalCommissionOwed || 0) -
          Number(invoice.commissionOwed)
      );
      await station.save();

      await maybeAutoUnbanStation(station._id);
    }
  }

  res.status(200).json({ success: true, invoice });
});

// ═════════════════════════════════════════════════════════════
//  ADMIN
// ═════════════════════════════════════════════════════════════

const assertAdmin = (user) => {
  if (!isMainAdmin(user)) {
    const err = new Error("Only the main admin can perform this action");
    err.status = 403;
    throw err;
  }
};

const adminGetRefillStations = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const { status, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { businessName: { $regex: search, $options: "i" } },
      { contactPerson: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const stations = await RefillStation.find(filter)
    .populate("owner", "name email phone")
    .populate("reviewedBy", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json(stations);
});

const adminGetRefillStationById = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const station = await RefillStation.findById(req.params.id)
    .populate("owner", "name email phone")
    .populate("teamMembers", "name email phone refillStationRole")
    .populate("reviewedBy", "name email");
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }
  res.status(200).json(station);
});

// @desc    Approve a refill station application
//          Refuses to approve if required documents are missing.
const adminApproveRefillStation = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const station = await RefillStation.findById(req.params.id);
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }
  if (station.status !== "pending") {
    res.status(400);
    throw new Error("Only pending applications can be approved");
  }

  // ── Document gate ─────────────────────────────────────
  const missing = [];
  if (!station.licenseUrl) missing.push("business license");
  if (!station.shopPhotos?.length) missing.push("shop photos");
  if (!station.cylinderPhotos?.length) missing.push("cylinder photos");
  if (missing.length) {
    res.status(400);
    throw new Error(
      `Cannot approve: missing required documents — ${missing.join(", ")}`
    );
  }

  station.status = "approved";
  station.approvedAt = new Date();
  station.reviewedAt = new Date();
  station.reviewedBy = req.user._id;
  station.rejectionReason = null;
  station.licenseVerifiedAt = new Date();
  await station.save();

  await User.updateOne(
    { _id: station.owner },
    {
      $set: {
        refillStation: station._id,
        refillStationRole: "owner",
      },
    }
  );

  res.status(200).json({
    message: "Refill station approved",
    station,
  });
});

const adminRejectRefillStation = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const { reason } = req.body;
  if (!reason || !String(reason).trim()) {
    res.status(400);
    throw new Error("Rejection reason is required");
  }

  const station = await RefillStation.findById(req.params.id);
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }
  if (station.status !== "pending") {
    res.status(400);
    throw new Error("Only pending applications can be rejected");
  }

  station.status = "rejected";
  station.rejectionReason = String(reason).trim();
  station.reviewedAt = new Date();
  station.reviewedBy = req.user._id;
  await station.save();

  res.status(200).json({ message: "Refill station rejected", station });
});

const adminBanRefillStation = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const { reason } = req.body;
  if (!reason) {
    res.status(400);
    throw new Error("Ban reason is required");
  }
  const station = await RefillStation.findById(req.params.id);
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }

  station.status = "banned";
  station.banReason = String(reason);
  station.bannedAt = new Date();
  station.bannedBy = req.user._id;
  await station.save();

  res.status(200).json({ message: "Refill station banned", station });
});

const adminUnbanRefillStation = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const station = await RefillStation.findById(req.params.id);
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }
  if (station.status !== "banned") {
    res.status(400);
    throw new Error("Station is not banned");
  }

  station.status = "approved";
  station.banReason = null;
  station.bannedAt = null;
  station.unbannedAt = new Date();
  await station.save();

  res.status(200).json({ message: "Refill station unbanned", station });
});

const adminOverrideCommissionRate = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const { commissionRate } = req.body;
  if (commissionRate !== null && commissionRate !== undefined) {
    const r = Number(commissionRate);
    if (!Number.isFinite(r) || r < 0 || r > 100) {
      res.status(400);
      throw new Error("commissionRate must be between 0 and 100, or null");
    }
  }

  const station = await RefillStation.findById(req.params.id);
  if (!station) {
    res.status(404);
    throw new Error("Refill station not found");
  }
  station.commissionRateOverride =
    commissionRate === null ? null : Number(commissionRate);
  await station.save();

  res.status(200).json({
    message:
      commissionRate === null
        ? "Commission override cleared (using platform default)"
        : "Commission override set",
    station,
  });
});

const adminGetRefillSettings = asyncHandler(async (req, res) => {
  assertAdmin(req.user);
  const settings = await getRefillSettings();
  res.status(200).json(settings);
});

const adminUpdateRefillSettings = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const { commissionRate, graceDays } = req.body;
  const settings = await getRefillSettings();

  if (commissionRate !== undefined) {
    const r = Number(commissionRate);
    if (!Number.isFinite(r) || r < 0 || r > 100) {
      res.status(400);
      throw new Error("commissionRate must be between 0 and 100");
    }
    settings.commissionRate = r;
  }
  if (graceDays !== undefined) {
    const g = Number(graceDays);
    if (!Number.isInteger(g) || g < 0 || g > 90) {
      res.status(400);
      throw new Error("graceDays must be an integer between 0 and 90");
    }
    settings.graceDays = g;
  }
  settings.updatedBy = req.user._id;
  await settings.save();

  res.status(200).json({ message: "Refill settings updated", settings });
});

const adminGetRefillInvoices = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const { status, stationId, month, year } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (stationId) filter.station = stationId;
  if (month) filter["period.month"] = Number(month);
  if (year) filter["period.year"] = Number(year);

  const invoices = await CommissionInvoice.find(filter)
    .populate("station", "businessName address phone email")
    .sort({ dueDate: -1 });

  res.status(200).json(invoices);
});

const adminMarkInvoicePaid = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const invoice = await CommissionInvoice.findById(req.params.id);
  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }
  if (invoice.status === "paid" || invoice.status === "waived") {
    res.status(400);
    throw new Error(`Invoice is already ${invoice.status}`);
  }

  invoice.status = "paid";
  invoice.paidAt = new Date();
  invoice.paidAmount = invoice.commissionOwed;
  invoice.markedPaidBy = req.user._id;
  invoice.notes = req.body?.note || invoice.notes;
  await invoice.save();

  const station = await RefillStation.findById(invoice.station);
  if (station) {
    station.totalCommissionPaid =
      Number(station.totalCommissionPaid || 0) +
      Number(invoice.commissionOwed);
    station.totalCommissionOwed = Math.max(
      0,
      Number(station.totalCommissionOwed || 0) -
        Number(invoice.commissionOwed)
    );
    await station.save();
    await maybeAutoUnbanStation(station._id);
  }

  res.status(200).json({ message: "Invoice marked paid", invoice });
});

const adminWaiveInvoice = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const { reason } = req.body;
  if (!reason) {
    res.status(400);
    throw new Error("Waiver reason is required");
  }
  const invoice = await CommissionInvoice.findById(req.params.id);
  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }
  if (invoice.status === "paid" || invoice.status === "waived") {
    res.status(400);
    throw new Error(`Invoice is already ${invoice.status}`);
  }

  invoice.status = "waived";
  invoice.waivedAt = new Date();
  invoice.waivedBy = req.user._id;
  invoice.waiverReason = String(reason);
  await invoice.save();

  const station = await RefillStation.findById(invoice.station);
  if (station) {
    station.totalCommissionOwed = Math.max(
      0,
      Number(station.totalCommissionOwed || 0) -
        Number(invoice.commissionOwed)
    );
    await station.save();
    await maybeAutoUnbanStation(station._id);
  }

  res.status(200).json({ message: "Invoice waived", invoice });
});

const adminGenerateInvoicesForPeriod = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = Number(req.body?.month) || prev.getMonth() + 1;
  const year = Number(req.body?.year) || prev.getFullYear();

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    res.status(400);
    throw new Error("Invalid month");
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    res.status(400);
    throw new Error("Invalid year");
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const settings = await getRefillSettings();
  const stations = await RefillStation.find({ status: "approved" }).select(
    "_id commissionRateOverride"
  );

  let created = 0;
  for (const station of stations) {
    const inv = await buildInvoiceForStationPeriod({
      station,
      start,
      end,
      settings,
    });
    if (inv) created++;
  }

  res.status(200).json({
    message: `Invoices generated for ${month}/${year}`,
    invoicesCreated: created,
    period: { month, year },
  });
});

const adminRunAgingAndAutoBan = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const now = new Date();
  const settings = await getRefillSettings();

  const toOverdue = await CommissionInvoice.find({
    status: "pending",
    graceEndsAt: { $lt: now },
  });
  for (const inv of toOverdue) {
    inv.status = "overdue";
    await inv.save();
  }

  const stationIds = [
    ...new Set(toOverdue.map((i) => String(i.station))),
  ].map((id) => new mongoose.Types.ObjectId(id));

  let banned = 0;
  for (const stationId of stationIds) {
    const station = await RefillStation.findById(stationId);
    if (!station || station.status === "banned") continue;

    const overdue = await CommissionInvoice.countDocuments({
      station: stationId,
      status: "overdue",
    });
    if (overdue > 0) {
      station.status = "banned";
      station.banReason = `${overdue} overdue commission invoice(s) past ${settings.graceDays}-day grace period`;
      station.bannedAt = now;
      await station.save();
      banned++;
    }
  }

  res.status(200).json({
    message: "Aging run complete",
    markedOverdue: toOverdue.length,
    stationsBanned: banned,
  });
});

const adminGetRefillStats = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const [
    totalStations,
    pendingApplications,
    approvedStations,
    bannedStations,
    totalOrders,
    completedThisMonth,
    gmvThisMonthAgg,
    commissionThisMonthAgg,
    openInvoices,
    overdueInvoices,
  ] = await Promise.all([
    RefillStation.countDocuments(),
    RefillStation.countDocuments({ status: "pending" }),
    RefillStation.countDocuments({ status: "approved" }),
    RefillStation.countDocuments({ status: "banned" }),
    RefillOrder.countDocuments(),
    RefillOrder.countDocuments({
      status: "completed",
      completedAt: { $gte: startOfMonth },
    }),
    RefillOrder.aggregate([
      {
        $match: {
          status: "completed",
          completedAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    RefillOrder.aggregate([
      {
        $match: {
          status: "completed",
          completedAt: { $gte: startOfMonth },
          commissionRecorded: true,
        },
      },
      { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
    ]),
    CommissionInvoice.countDocuments({ status: "pending" }),
    CommissionInvoice.countDocuments({ status: "overdue" }),
  ]);

  const settings = await getRefillSettings();

  res.status(200).json({
    totalStations,
    pendingApplications,
    approvedStations,
    bannedStations,
    totalOrders,
    completedThisMonth,
    gmvThisMonth: gmvThisMonthAgg[0]?.total || 0,
    commissionThisMonth: commissionThisMonthAgg[0]?.total || 0,
    openInvoices,
    overdueInvoices,
    settings: {
      commissionRate: settings.commissionRate,
      graceDays: settings.graceDays,
    },
  });
});

const adminGetRefillOrders = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const { status, stationId, limit = 200 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (stationId) filter.station = stationId;

  const orders = await RefillOrder.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    .populate("customer", "name email phone")
    .populate("station", "businessName address phone")
    .populate("assignedRider", "name email phone");

  res.status(200).json(orders);
});

// ─── Exports ──────────────────────────────────────────────
export {
  // Application
  applyAsRefillStation,
  getMyRefillApplication,
  // Discovery
  getNearbyRefillStations,
  getRefillStationPublic,
  // Customer orders
  createRefillOrder,
  verifyRefillPayment,
  getMyRefillOrders,
  getRefillOrder,
  confirmRefillOrder,
  cancelRefillOrder,
  // Station side
  getMyRefillStation,
  updateMyRefillStation,
  updateMyRefillStationDocuments,
  getRefillStationDashboard,
  getRefillStationOrders,
  acceptRefillOrder,
  rejectRefillOrder,
  assignRefillRider,
  markRefillReady,
  markRefillDelivered,
  completeRefillOrder,
  getRefillTeam,
  searchUsersForRefillStation,
  addRefillTeamMember,
  removeRefillTeamMember,
  // Commission / invoices (station side)
  getMyRefillCommission,
  getMyRefillInvoices,
  payRefillInvoice,
  verifyRefillInvoicePayment,
  // Admin
  adminGetRefillStations,
  adminGetRefillStationById,
  adminApproveRefillStation,
  adminRejectRefillStation,
  adminBanRefillStation,
  adminUnbanRefillStation,
  adminOverrideCommissionRate,
  adminGetRefillSettings,
  adminUpdateRefillSettings,
  adminGetRefillInvoices,
  adminMarkInvoicePaid,
  adminWaiveInvoice,
  adminGenerateInvoicesForPeriod,
  adminRunAgingAndAutoBan,
  adminGetRefillStats,
  adminGetRefillOrders,
};