// controllers/orderController.js
import asyncHandler from "express-async-handler";
import axios from "axios";
import crypto from "crypto";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Station from "../models/stationModel.js";
import StockLog from "../models/stockLogModel.js";

const PAYSTACK_BASE = "https://api.paystack.co";

// ─── Constants ────────────────────────────────────────────────
const GAS_PRICE_PER_KG = 10;
const CYLINDER_COST = { "3kg": 100, "6kg": 200, "12kg": 300 };
const SUBSCRIPTION_DAYS = 30;
const GRACE_DAYS = 6;
const CYLINDER_SIZES = ["3kg", "6kg", "12kg"];
const COMMISSION_PERCENT = 0.6; // 60% of serviceTax goes to the rider
const DEFAULT_NEARBY_RADIUS_KM = 50;

// ─── Helpers ──────────────────────────────────────────────────
const parseMonthYear = (month, year) => {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12) throw new Error("Invalid month");
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new Error("Invalid year");
  return { m, y };
};

const getAuthActor = (req) => ({
  userId: req.user?._id || null,
  riderId: req.user?.role === "rider" ? req.user?._id || null : null,
  isAdmin: req.user?.role === "admin",
});

// ✅ Handles populated objects AND raw ObjectIds
const canAccessOrder = (req, order) => {
  const { userId, isAdmin } = getAuthActor(req);
  if (isAdmin) return true;

  const orderUserId = order.user?._id || order.user;
  const orderRiderId = order.rider?._id || order.rider;
  const orderStationId = order.station?._id || order.station;

  if (userId && orderUserId?.toString() === userId.toString()) return true;
  if (userId && orderRiderId?.toString() === userId.toString()) return true;

  // Station members can access orders assigned to their station
  if (
    req.user?.station &&
    orderStationId &&
    String(req.user.station) === String(orderStationId)
  ) {
    return true;
  }
  return false;
};

// Only the owner or main admin sees the QR token
const shapeOrderForCaller = (order, caller) => {
  const obj = order.toObject ? order.toObject() : { ...order };
  const ownerId = obj.user?._id || obj.user;
  const isOwner = ownerId && String(ownerId) === String(caller?._id);
  const isAdmin = caller?.role === "admin";

  if (!isOwner && !isAdmin) {
    delete obj.verificationToken;
    delete obj.verificationScannedAt;
    delete obj.verificationScannedBy;
  }
  return obj;
};

// ─── Paystack ─────────────────────────────────────────────────
const getPaystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
});

const initializePaystackPayment = async ({ email, amountInKobo, reference, orderId }) => {
  const initResp = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    {
      email,
      amount: amountInKobo,
      reference,
      callback_url: process.env.PAYSTACK_CALLBACK_URL,
      metadata: { orderId: orderId.toString(), app: "flanorx" },
    },
    { headers: getPaystackHeaders() }
  );
  return initResp?.data?.data || {};
};

const verifyPaystackPayment = async (reference) => {
  const verifyResp = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );
  return verifyResp?.data?.data || null;
};

// ─── Gas subscription status (unchanged) ─────────────────────
const getGasSubscriptionStatus = async (userId) => {
  const user = await User.findById(userId).select("gasSubscription");
  if (!user) return { active: false, subscription: null };

  const sub = user.gasSubscription;
  if (!sub || sub.status !== "active") return { active: false, subscription: null };

  const now = new Date();
  const nextBilling = sub.nextBillingDate ? new Date(sub.nextBillingDate) : null;
  const graceEnd = sub.gracePeriodEnd ? new Date(sub.gracePeriodEnd) : null;

  let isActive = false;
  if (nextBilling && now < nextBilling) isActive = true;
  else if (graceEnd && now < graceEnd) isActive = true;

  return { active: isActive, subscription: sub };
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

// Find nearest active station with stock of the given cylinder size.
// Accepts an optional explicit stationId (for pickup) — must still be active + stocked.
const findFulfillingStation = async ({ lat, lng, cylinderSize, stationId }) => {
  if (stationId) {
    const explicit = await Station.findOne({ _id: stationId, status: "active" });
    if (!explicit) {
      const err = new Error("Selected station is not available");
      err.status = 400;
      throw err;
    }
    const stock = Number(explicit.stock?.[cylinderSize] || 0);
    if (stock <= 0) {
      const err = new Error(
        `Selected station has no ${cylinderSize} cylinders in stock`
      );
      err.status = 400;
      throw err;
    }
    return explicit;
  }

  const stations = await Station.find({ status: "active" }).lean();

  const stocked = stations.filter(
    (s) => Number(s.stock?.[cylinderSize] || 0) > 0
  );
  if (stocked.length === 0) {
    const err = new Error(
      `No station has ${cylinderSize} cylinders in stock right now`
    );
    err.status = 400;
    throw err;
  }

  if (lat === undefined || lng === undefined) {
    const err = new Error("Delivery coordinates are required for gas orders");
    err.status = 400;
    throw err;
  }
  const latNum = Number(lat);
  const lngNum = Number(lng);

  const scored = stocked
    .map((s) => {
      const sLat = Number(s.coordinates?.lat);
      const sLng = Number(s.coordinates?.lng);
      if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) return null;
      return { station: s, distanceKm: haversineKm(latNum, lngNum, sLat, sLng) };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (scored.length === 0) {
    const err = new Error("No reachable station found");
    err.status = 400;
    throw err;
  }
  if (scored[0].distanceKm > DEFAULT_NEARBY_RADIUS_KM) {
    const err = new Error(
      `No station within ${DEFAULT_NEARBY_RADIUS_KM}km has ${cylinderSize} in stock`
    );
    err.status = 400;
    throw err;
  }

  return await Station.findById(scored[0].station._id);
};

// ─── QR token ─────────────────────────────────────────────────
const generateVerificationToken = () => crypto.randomBytes(24).toString("hex");

// ─── Stock decrement (atomic) ─────────────────────────────────
// Uses findOneAndUpdate with a guard so two concurrent scans can't go negative.
const decrementStationStock = async ({
  stationId,
  cylinderSize,
  order,
  performedBy,
  note = "Order fulfilled via QR scan",
}) => {
  if (!CYLINDER_SIZES.includes(cylinderSize)) {
    const err = new Error("Invalid cylinder size on order");
    err.status = 400;
    throw err;
  }

  const updated = await Station.findOneAndUpdate(
    {
      _id: stationId,
      [`stock.${cylinderSize}`]: { $gt: 0 },
    },
    { $inc: { [`stock.${cylinderSize}`]: -1 } },
    { new: true }
  );

  if (!updated) {
    const err = new Error(
      `Insufficient ${cylinderSize} stock at station to complete this order`
    );
    err.status = 400;
    throw err;
  }

  const after = Number(updated.stock?.[cylinderSize] || 0);
  const before = after + 1;

  await StockLog.create({
    station: stationId,
    cylinderSize,
    delta: -1,
    reason: "order_fulfilled",
    order: order?._id || null,
    performedBy,
    note,
    stockBefore: before,
    stockAfter: after,
  });

  return updated;
};

// ─── Commission ───────────────────────────────────────────────
const calculateRiderCommission = (order) => {
  const serviceTax = Number(order?.serviceTax || 0);
  return Number((serviceTax * COMMISSION_PERCENT).toFixed(2));
};

// ─── Helper: look up assigned parties for QR permission checks ─
const canScanOrder = (caller, order) => {
  if (!caller) return false;
  if (caller.role === "admin") return true;

  const callerId = String(caller._id);
  const orderRiderId = String(order.rider?._id || order.rider || "");
  const orderStationId = String(order.station?._id || order.station || "");

  // FUEL: only the assigned fuel rider
  if (order.orderType === "fuel") {
    return caller.role === "rider" && orderRiderId === callerId;
  }

  // GAS
  if (order.orderType === "gas") {
    if (order.fulfillmentType === "delivery") {
      // Assigned station rider for this station
      return (
        caller.role === "rider" &&
        caller.riderType === "station" &&
        orderRiderId === callerId &&
        String(caller.station || "") === orderStationId
      );
    }
    if (order.fulfillmentType === "pickup") {
      // Station admin or staff of that station
      return (
        (caller.stationRole === "admin" || caller.stationRole === "staff") &&
        String(caller.station || "") === orderStationId
      );
    }
  }

  return false;
};

// ═════════════════════════════════════════════════════════════
//  CREATE ORDER (Fuel & Gas)
// ═════════════════════════════════════════════════════════════
const createOrder = asyncHandler(async (req, res) => {
  const {
    orderType,
    fuelType,
    gasDetails,
    quantity,
    deliveryAddress,
    deliveryCoordinates,
    scheduleType,
    scheduledDate,
    scheduledTime,
    notes,
    estimatedDeliveryMinutes,
    subtotal,
    deliveryFee,
    serviceTax,
    totalAmount,
    fuelPricePerLiter,
    fulfillmentType, // gas only: "delivery" | "pickup"
    stationId,       // gas pickup: optional explicit station
  } = req.body;

  if (!req.user?._id) {
    res.status(401);
    throw new Error("Not authorized");
  }

  if (!orderType || !["fuel", "gas"].includes(orderType)) {
    res.status(400);
    throw new Error("Valid orderType (fuel/gas) is required");
  }

  if (!deliveryAddress || !scheduleType) {
    res.status(400);
    throw new Error("Missing required fields: deliveryAddress, scheduleType");
  }

  if (scheduleType === "scheduled" && (!scheduledDate || !scheduledTime)) {
    res.status(400);
    throw new Error("Scheduled date and time required");
  }

  const verificationToken = generateVerificationToken();

  let orderData = {
    user: req.user._id,
    orderType,
    deliveryAddress,
    scheduleType,
    deliveryStatus: "pending",
    status: "pending",
    paid: false,
    notes: notes || "",
    verificationToken,
    estimatedDeliveryMinutes:
      estimatedDeliveryMinutes || (scheduleType === "now" ? 30 : null),
  };

  if (
    deliveryCoordinates?.lat !== undefined &&
    deliveryCoordinates?.lng !== undefined
  ) {
    orderData.deliveryCoordinates = {
      lat: Number(deliveryCoordinates.lat),
      lng: Number(deliveryCoordinates.lng),
    };
  }

  if (scheduleType === "scheduled") {
    orderData.scheduledDate = scheduledDate;
    orderData.scheduledTime = scheduledTime;
  }

  // ─── FUEL ────────────────────────────────────────────────────
  if (orderType === "fuel") {
    if (!fuelType || !quantity) {
      res.status(400);
      throw new Error("fuelType and quantity are required for fuel orders");
    }
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      res.status(400);
      throw new Error("Quantity must be a positive number");
    }

    orderData.fuelType = fuelType;
    orderData.quantity = parsedQuantity;
    orderData.fuelPricePerLiter = fuelPricePerLiter || 0;
    orderData.subtotal = subtotal || 0;
    orderData.deliveryFee = deliveryFee || 0;
    orderData.serviceTax = serviceTax || 0;
    orderData.totalAmount = totalAmount || 0;
    orderData.estimatedDeliveryMinutes = estimatedDeliveryMinutes || 30;
  }

  // ─── GAS ────────────────────────────────────────────────────
  else if (orderType === "gas") {
    if (!gasDetails || !gasDetails.cylinderSize || !gasDetails.quantityKg) {
      res.status(400);
      throw new Error("gasDetails: cylinderSize and quantityKg are required");
    }
    if (!CYLINDER_SIZES.includes(gasDetails.cylinderSize)) {
      res.status(400);
      throw new Error("Invalid cylinderSize, must be 3kg, 6kg, or 12kg");
    }
    const kg = Number(gasDetails.quantityKg);
    if (!Number.isFinite(kg) || kg <= 0) {
      res.status(400);
      throw new Error("quantityKg must be a positive number");
    }

    const resolvedFulfillment =
      fulfillmentType === "pickup" ? "pickup" : "delivery";

    // Find the fulfilling station BEFORE we persist the order
    let lat, lng;
    if (resolvedFulfillment === "delivery") {
      lat = orderData.deliveryCoordinates?.lat;
      lng = orderData.deliveryCoordinates?.lng;
      if (lat === undefined || lng === undefined) {
        res.status(400);
        throw new Error(
          "Delivery coordinates are required for gas delivery orders"
        );
      }
    }

    const station = await findFulfillingStation({
      lat,
      lng,
      cylinderSize: gasDetails.cylinderSize,
      stationId: resolvedFulfillment === "pickup" ? stationId : undefined,
    });

    orderData.station = station._id;
    orderData.fulfillmentType = resolvedFulfillment;

    orderData.gasDetails = {
      cylinderSize: gasDetails.cylinderSize,
      quantityKg: kg,
      isFirstTime: gasDetails.isFirstTime === true,
      cylinderCost: gasDetails.cylinderCost || 0,
      gasContentCost: gasDetails.gasContentCost || 0,
      previousCylinderSize: gasDetails.previousCylinderSize || null,
      upgradeCost: gasDetails.upgradeCost || 0,
    };
    orderData.subtotal = subtotal || 0;
    orderData.deliveryFee =
      resolvedFulfillment === "pickup" ? 0 : deliveryFee || 0;
    orderData.serviceTax = serviceTax || 0;
    orderData.totalAmount = totalAmount || 0;
    orderData.estimatedDeliveryMinutes =
      resolvedFulfillment === "pickup" ? 0 : estimatedDeliveryMinutes || 45;
  }

  const created = await Order.create(orderData);

  const amountInKobo = Math.round(Number(created.totalAmount) * 100);
  const reference = `FLX_${created._id}_${Date.now()}`;
  const paystackData = await initializePaystackPayment({
    email: req.user.email,
    amountInKobo,
    reference,
    orderId: created._id,
  });

  const authUrl = paystackData?.authorization_url;
  const paystackRef = paystackData?.reference;
  if (!authUrl || !paystackRef) {
    await Order.findByIdAndDelete(created._id);
    res.status(502);
    throw new Error("Failed to initialize Paystack payment");
  }

  created.paymentReference = paystackRef;
  created.paymentMethod = "card";
  await created.save();

  const populated = await Order.findById(created._id)
    .populate("user", "name email")
    .populate("station", "name address coordinates");

  res.status(201).json({
    order: shapeOrderForCaller(populated, req.user),
    authorization_url: authUrl,
    reference: paystackRef,
  });
});

// ═════════════════════════════════════════════════════════════
//  PAY ORDER (verify & mark paid)
// ═════════════════════════════════════════════════════════════
const payOrder = asyncHandler(async (req, res) => {
  const { paymentReference } = req.body;
  if (!req.user?._id) {
    res.status(401);
    throw new Error("Not authorized");
  }
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not allowed to pay for this order");
  }
  if (order.paid) {
    res.status(400);
    throw new Error("Order already paid");
  }
  const refToVerify = paymentReference || order.paymentReference;
  if (!refToVerify) {
    res.status(400);
    throw new Error("Missing payment reference");
  }
  const data = await verifyPaystackPayment(refToVerify);
  if (!data || data.status !== "success") {
    res.status(400);
    throw new Error("Payment not successful");
  }
  const expectedKobo = Math.round(Number(order.totalAmount) * 100);
  if (Number(data.amount) !== expectedKobo) {
    res.status(400);
    throw new Error("Payment amount mismatch");
  }
  const updatedOrder = await order.markAsPaid(refToVerify, "card");
  res
    .status(200)
    .json({ success: true, message: "Payment verified", order: updatedOrder });
});

// ═════════════════════════════════════════════════════════════
//  GET SINGLE ORDER
// ═════════════════════════════════════════════════════════════
const getOrder = asyncHandler(async (req, res) => {
  const { userId, isAdmin } = getAuthActor(req);
  if (!userId && !isAdmin) {
    res.status(401);
    throw new Error("Not authorized");
  }
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("rider", "name email profilePicture phone")
    .populate("station", "name address coordinates phone");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!canAccessOrder(req, order)) {
    res.status(403);
    throw new Error("Not allowed");
  }
  res.status(200).json(shapeOrderForCaller(order, req.user));
});

// ═════════════════════════════════════════════════════════════
//  GET MY ORDERS
// ═════════════════════════════════════════════════════════════
const getMyOrders = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error("Not authorized");
  }
  const { month, year, status, paid, deliveryStatus, orderType } = req.query;
  const filter = { user: req.user._id };
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
    .sort({ createdAt: -1 })
    .populate("rider", "name profilePicture phone")
    .populate("station", "name address");

  res.status(200).json(orders.map((o) => shapeOrderForCaller(o, req.user)));
});

// ═════════════════════════════════════════════════════════════
//  GET MY TOTAL SPENT
// ═════════════════════════════════════════════════════════════
const getMyTotalSpent = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error("Not authorized");
  }
  const { month, year, paid, orderType } = req.query;
  if (!month || !year) {
    res.status(400);
    throw new Error("month and year are required");
  }
  const { m, y } = parseMonthYear(month, year);
  const matchStage = {
    user: req.user._id,
    orderMonth: m,
    orderYear: y,
    paid: paid !== undefined ? paid === "true" : true,
  };
  if (orderType) matchStage.orderType = orderType;
  const result = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: "$totalAmount" },
        count: { $sum: 1 },
        totalLiters: { $sum: "$quantity" },
        totalKg: { $sum: { $ifNull: ["$gasDetails.quantityKg", 0] } },
      },
    },
  ]);
  res.status(200).json({
    month: m,
    year: y,
    paid: matchStage.paid,
    totalSpent: result[0]?.totalSpent || 0,
    ordersCount: result[0]?.count || 0,
    totalLiters: result[0]?.totalLiters || 0,
    totalKg: result[0]?.totalKg || 0,
  });
});

// ═════════════════════════════════════════════════════════════
//  GET ACTIVE ORDER
// ═════════════════════════════════════════════════════════════
const getMyActiveOrder = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error("Not authorized");
  }
  const activeOrder = await Order.findOne({
    user: req.user._id,
    paid: true,
    status: { $in: ["processing"] },
    deliveryStatus: {
      $in: ["pending", "accepted", "picked_up", "in_transit", "delivered"],
    },
  })
    .sort({ createdAt: -1 })
    .populate("rider", "name profilePicture phone")
    .populate("station", "name address");

  res
    .status(200)
    .json(activeOrder ? shapeOrderForCaller(activeOrder, req.user) : null);
});

// ═════════════════════════════════════════════════════════════
//  GET DELIVERY STATUS
// ═════════════════════════════════════════════════════════════
const getDeliveryStatus = asyncHandler(async (req, res) => {
  const { userId, isAdmin } = getAuthActor(req);
  if (!userId && !isAdmin) {
    res.status(401);
    throw new Error("Not authorized");
  }
  const order = await Order.findById(req.params.id)
    .select(
      "user rider station status deliveryStatus fulfillmentType orderType estimatedDeliveryMinutes scheduledDate scheduledTime acceptedAt pickedUpAt deliveredAt completedAt customerConfirmedAt verificationScannedAt"
    )
    .populate("rider", "name email profilePicture phone")
    .populate("station", "name address coordinates");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!canAccessOrder(req, order)) {
    res.status(403);
    throw new Error("Not allowed");
  }
  res.status(200).json({
    status: order.status,
    deliveryStatus: order.deliveryStatus,
    fulfillmentType: order.fulfillmentType,
    orderType: order.orderType,
    rider: order.rider,
    station: order.station,
    estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
    scheduledDate: order.scheduledDate,
    scheduledTime: order.scheduledTime,
    acceptedAt: order.acceptedAt,
    pickedUpAt: order.pickedUpAt,
    deliveredAt: order.deliveredAt,
    completedAt: order.completedAt,
    customerConfirmedAt: order.customerConfirmedAt,
    verificationScannedAt: order.verificationScannedAt,
  });
});

// ═════════════════════════════════════════════════════════════
//  ADMIN: GET ALL ORDERS
// ═════════════════════════════════════════════════════════════
const getOrders = asyncHandler(async (req, res) => {
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
    .populate("rider", "name email profilePicture phone")
    .populate("station", "name address")
    .sort({ createdAt: -1 });
  res.status(200).json(orders);
});

// ═════════════════════════════════════════════════════════════
//  ADMIN: UPDATE ORDER STATUS
// ═════════════════════════════════════════════════════════════
const updateOrderStatus = asyncHandler(async (req, res) => {
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
  if (order.verificationScannedAt && status && status !== "completed") {
    res.status(400);
    throw new Error("Order is already confirmed by QR scan");
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

// ═════════════════════════════════════════════════════════════
//  ADMIN: DASHBOARD STATS
// ═════════════════════════════════════════════════════════════
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
      orderType: "fuel",
    }),
    Order.countDocuments({
      paid: true,
      status: "processing",
      deliveryStatus: {
        $in: ["accepted", "picked_up", "in_transit", "delivered"],
      },
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

// ═════════════════════════════════════════════════════════════
//  VERIFY PAYMENT & GET ORDER
//  (handles FLX_ normal orders and SUB_ subscription refs)
// ═════════════════════════════════════════════════════════════
const verifyPaymentAndGetOrder = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  if (!reference) {
    res.status(400);
    throw new Error("Reference is required");
  }

  const data = await verifyPaystackPayment(reference);
  if (!data || data.status !== "success") {
    res.status(400);
    throw new Error("Payment not successful");
  }

  // ─── Handle subscription references (SUB_) ────────────────
  if (reference.startsWith("SUB_")) {
    const userId = data.metadata?.userId;
    if (!userId) {
      res.status(400);
      throw new Error("User not found in payment metadata");
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const { cylinderSize, quantityKg } = data.metadata;
    if (!cylinderSize || !quantityKg) {
      res.status(400);
      throw new Error("Invalid subscription metadata");
    }

    let order = await Order.findOne({ paymentReference: reference });

    if (order) {
      order.paid = true;
      order.status = "processing";
      order.deliveryStatus = "pending";
      order.paymentDate = new Date();
      order.paymentMethod = "card";
      // Assign a station if not set
      if (!order.station) {
        const station = await findFulfillingStation({
          lat: order.deliveryCoordinates?.lat,
          lng: order.deliveryCoordinates?.lng,
          cylinderSize,
          stationId: undefined,
        }).catch(() => null);
        if (station) order.station = station._id;
      }
      await order.save();
    } else {
      const gasContentCost = quantityKg * GAS_PRICE_PER_KG;
      const cylinderCost = CYLINDER_COST[cylinderSize] || 0;
      const total = gasContentCost + cylinderCost;
      order = await Order.create({
        user: user._id,
        orderType: "gas",
        gasDetails: {
          cylinderSize,
          quantityKg,
          isFirstTime: true,
          cylinderCost,
          gasContentCost,
        },
        deliveryAddress: "",
        scheduleType: "now",
        fulfillmentType: "delivery",
        status: "processing",
        paid: true,
        paymentReference: reference,
        paymentMethod: "card",
        paymentDate: new Date(),
        subtotal: gasContentCost + cylinderCost,
        deliveryFee: 0,
        serviceTax: 0,
        totalAmount: total,
        deliveryStatus: "pending",
        verificationToken: generateVerificationToken(),
      });
    }

    const now = new Date();
    const nextBilling = new Date(now);
    nextBilling.setDate(nextBilling.getDate() + SUBSCRIPTION_DAYS);
    const graceEnd = new Date(nextBilling);
    graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);

    user.gasSubscription = {
      cylinderSize,
      status: "active",
      startDate: now,
      nextBillingDate: nextBilling,
      gracePeriodEnd: graceEnd,
      createdAt: now,
      updatedAt: now,
    };
    await user.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email")
      .populate("rider", "name email profilePicture phone")
      .populate("station", "name address");

    return res.status(200).json({
      order: shapeOrderForCaller(populatedOrder, req.user || user),
      subscription: user.gasSubscription,
      isSubscription: true,
    });
  }

  // ─── Normal order references (FLX_) ──────────────────────
  const order = await Order.findOne({ paymentReference: reference })
    .populate("user", "name email")
    .populate("rider", "name email profilePicture phone")
    .populate("station", "name address");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isOwner = req.user && String(order.user._id) === String(req.user._id);
  const hasValidRef = reference === order.paymentReference;
  if (!isOwner && !hasValidRef) {
    res.status(403);
    throw new Error("Not allowed");
  }

  if (!order.paid) {
    const expectedKobo = Math.round(Number(order.totalAmount) * 100);
    if (Number(data.amount) !== expectedKobo) {
      res.status(400);
      throw new Error("Payment amount mismatch");
    }
    await order.markAsPaid(reference, "card");
  }

  const refreshedOrder = await Order.findById(order._id)
    .populate("user", "name email")
    .populate("rider", "name email profilePicture phone")
    .populate("station", "name address");

  res.status(200).json({
    order: shapeOrderForCaller(refreshedOrder, req.user),
    isSubscription: false,
  });
});

// ═════════════════════════════════════════════════════════════
//  INITIALIZE PAYMENT FOR EXISTING ORDER
// ═════════════════════════════════════════════════════════════
const initializePaymentForOrder = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error("Not authorized");
  }
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not allowed");
  }
  if (order.paid) {
    res.status(400);
    throw new Error("Order already paid");
  }
  const amountInKobo = Math.round(Number(order.totalAmount) * 100);
  const reference = `FLX_${order._id}_${Date.now()}`;
  const paystackData = await initializePaystackPayment({
    email: req.user.email,
    amountInKobo,
    reference,
    orderId: order._id,
  });
  const authUrl = paystackData?.authorization_url;
  const paystackRef = paystackData?.reference;
  if (!authUrl || !paystackRef) {
    res.status(502);
    throw new Error("Failed to initialize Paystack payment");
  }
  order.paymentReference = paystackRef;
  order.paymentMethod = "card";
  await order.save();
  res.status(200).json({
    authorization_url: authUrl,
    reference: paystackRef,
    orderId: order._id,
  });
});

// ═════════════════════════════════════════════════════════════
//  VERIFY ORDER BY QR TOKEN  ⭐ NEW
// ═════════════════════════════════════════════════════════════
// @desc    Confirm an order by scanning the customer's QR token
// @route   POST /api/orders/verify
// @access  Private (assigned fuel rider / assigned station rider /
//                   station admin or staff for pickup / main admin)
const verifyOrderByToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || !String(token).trim()) {
    res.status(400);
    throw new Error("token is required");
  }

  const caller = req.user;
  if (!caller) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const order = await Order.findOne({ verificationToken: String(token).trim() });
  if (!order) {
    res.status(404);
    throw new Error("Invalid QR code — order not found");
  }

  if (order.verificationScannedAt) {
    res.status(400);
    throw new Error("This order has already been confirmed");
  }
  if (!order.paid) {
    res.status(400);
    throw new Error("Order is not paid");
  }
  if (order.status === "cancelled" || order.status === "failed") {
    res.status(400);
    throw new Error(`Order is ${order.status} and cannot be confirmed`);
  }

  // Permission check
  if (!canScanOrder(caller, order)) {
    res.status(403);
    throw new Error("You are not allowed to confirm this order");
  }

  // Atomic mark — guards against double-scan races
  const now = new Date();
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, verificationScannedAt: null },
    {
      $set: {
        status: "completed",
        deliveryStatus: "confirmed",
        verificationScannedAt: now,
        verificationScannedBy: caller._id,
        completedAt: order.completedAt || now,
        deliveredAt: order.deliveredAt || now,
        customerConfirmedAt: now,
      },
    },
    { new: true }
  );
  if (!updated) {
    res.status(400);
    throw new Error("This order has already been confirmed");
  }

  // ─── Gas: decrement station stock ─────────────────────────
  if (updated.orderType === "gas" && updated.station) {
    try {
      await decrementStationStock({
        stationId: updated.station,
        cylinderSize: updated.gasDetails?.cylinderSize,
        order: updated,
        performedBy: caller._id,
      });
    } catch (err) {
      // Roll back the completion so stock and state stay consistent
      updated.status = order.status;
      updated.deliveryStatus = order.deliveryStatus;
      updated.verificationScannedAt = undefined;
      updated.verificationScannedBy = undefined;
      updated.completedAt = order.completedAt;
      updated.customerConfirmedAt = undefined;
      await updated.save();

      res.status(400);
      throw new Error(err.message || "Failed to decrement stock");
    }
  }

  // ─── Rider commission ────────────────────────────────────
  const commission = calculateRiderCommission(updated);
  if (updated.rider && commission > 0 && !updated.commissionPaidToRider) {
    const rider = await User.findById(updated.rider);
    if (rider) {
      rider.walletBalance = Number(rider.walletBalance || 0) + commission;
      rider.totalEarnings = Number(rider.totalEarnings || 0) + commission;
      rider.completedDeliveries = Number(rider.completedDeliveries || 0) + 1;
      await rider.save();

      updated.riderCommission = commission;
      updated.commissionPaidToRider = true;
      await updated.save();
    }
  }

  const populated = await Order.findById(updated._id)
    .populate("user", "name email")
    .populate("rider", "name email profilePicture phone")
    .populate("station", "name address");

  res.status(200).json({
    success: true,
    message: "Order confirmed",
    order: shapeOrderForCaller(populated, caller),
  });
});

// ─── EXPORT ────────────────────────────────────────────────────
export {
  createOrder,
  getOrder,
  getOrders,
  getMyOrders,
  getMyTotalSpent,
  getMyActiveOrder,
  payOrder,
  getDeliveryStatus,
  updateOrderStatus,
  getDashboardStats,
  verifyPaymentAndGetOrder,
  initializePaymentForOrder,
  verifyOrderByToken,
};