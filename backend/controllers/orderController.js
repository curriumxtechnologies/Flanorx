// controllers/orderController.js
import asyncHandler from "express-async-handler";
import axios from "axios";
import Order from "../models/orderModel.js";

const PAYSTACK_BASE = "https://api.paystack.co";

// ─── Helpers ────────────────────────────────────────────────────────────────
const parseMonthYear = (month, year) => {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12) throw new Error("Invalid month");
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new Error("Invalid year");
  return { m, y };
};

const getAuthActor = (req) => ({
  userId: req.user?._id || null,
  riderId: req.rider?._id || null,
  isAdmin: req.user?.role === "admin",
});

const canAccessOrder = (req, order) => {
  const { userId, riderId, isAdmin } = getAuthActor(req);
  if (isAdmin) return true;
  if (userId && order.user?.toString() === userId.toString()) return true;
  if (riderId && order.rider?.toString() === riderId.toString()) return true;
  return false;
};

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

// ─── Gas price & cylinder cost ─────────────────────────────────────────────
const GAS_PRICE_PER_KG = 1300;
const CYLINDER_COST = { "3kg": 600, "6kg": 1200, "12kg": 3000 };

const calculateGasOrder = (cylinderSize, quantityKg, isFirstTime) => {
  const gasContentCost = quantityKg * GAS_PRICE_PER_KG;
  const cylinderCost = isFirstTime ? (CYLINDER_COST[cylinderSize] || 0) : 0;
  const subtotal = gasContentCost + cylinderCost;
  const deliveryFee = 500;
  const serviceTax = Math.round(subtotal * 0.075);
  const total = subtotal + deliveryFee + serviceTax;
  return { gasContentCost, cylinderCost, subtotal, deliveryFee, serviceTax, total };
};

// ─── CREATE ORDER (Fuel & Gas) ─────────────────────────────────────────────
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

  let orderData = {
    user: req.user._id,
    orderType,
    deliveryAddress,
    scheduleType,
    deliveryStatus: "pending",
    status: "pending",
    paid: false,
    notes: notes || "",
    estimatedDeliveryMinutes: estimatedDeliveryMinutes || (scheduleType === "now" ? 30 : null),
  };

  if (deliveryCoordinates?.lat !== undefined && deliveryCoordinates?.lng !== undefined) {
    orderData.deliveryCoordinates = {
      lat: Number(deliveryCoordinates.lat),
      lng: Number(deliveryCoordinates.lng),
    };
  }

  if (scheduleType === "scheduled") {
    orderData.scheduledDate = scheduledDate;
    orderData.scheduledTime = scheduledTime;
  }

  // ─── FUEL ──────────────────────────────────────────────────────────────
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

    const priceCalculation = Order.calculatePrice(fuelType, parsedQuantity);
    orderData.fuelType = fuelType;
    orderData.quantity = parsedQuantity;
    orderData.fuelPricePerLiter = priceCalculation.pricePerLiter;
    orderData.subtotal = priceCalculation.subtotal;
    orderData.deliveryFee = priceCalculation.deliveryFee;
    orderData.serviceTax = priceCalculation.serviceTax;
    orderData.totalAmount = priceCalculation.total;
    orderData.estimatedDeliveryMinutes = estimatedDeliveryMinutes || 30;
  }

  // ─── GAS ──────────────────────────────────────────────────────────────
  else if (orderType === "gas") {
    const { cylinderSize, quantityKg, isFirstTime } = gasDetails || {};
    if (!cylinderSize || !quantityKg) {
      res.status(400);
      throw new Error("gasDetails: cylinderSize and quantityKg are required");
    }
    if (!["3kg", "6kg", "12kg"].includes(cylinderSize)) {
      res.status(400);
      throw new Error("Invalid cylinderSize, must be 3kg, 6kg, or 12kg");
    }
    const kg = Number(quantityKg);
    if (!Number.isFinite(kg) || kg <= 0) {
      res.status(400);
      throw new Error("quantityKg must be a positive number");
    }
    const firstTime = isFirstTime === true;
    const gasCalc = calculateGasOrder(cylinderSize, kg, firstTime);

    orderData.gasDetails = {
      cylinderSize,
      quantityKg: kg,
      isFirstTime: firstTime,
      cylinderCost: gasCalc.cylinderCost,
      gasContentCost: gasCalc.gasContentCost,
    };
    orderData.subtotal = gasCalc.subtotal;
    orderData.deliveryFee = gasCalc.deliveryFee;
    orderData.serviceTax = gasCalc.serviceTax;
    orderData.totalAmount = gasCalc.total;
    orderData.estimatedDeliveryMinutes = estimatedDeliveryMinutes || 45;
  }

  // Create order
  const created = await Order.create(orderData);

  // Initiate Paystack
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

  res.status(201).json({
    order: created,
    authorization_url: authUrl,
    reference: paystackRef,
  });
});

// ─── PAY ORDER (verify & mark paid) ────────────────────────────────────────
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
  res.status(200).json({ success: true, message: "Payment verified", order: updatedOrder });
});

// ─── GET SINGLE ORDER ──────────────────────────────────────────────────────
const getOrder = asyncHandler(async (req, res) => {
  const { userId, riderId, isAdmin } = getAuthActor(req);
  if (!userId && !riderId && !isAdmin) {
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
  if (!canAccessOrder(req, order)) {
    res.status(403);
    throw new Error("Not allowed");
  }
  res.status(200).json(order);
});

// ─── GET MY ORDERS ─────────────────────────────────────────────────────────
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
    .populate("rider", "name profilePicture phone");
  res.status(200).json(orders);
});

// ─── GET MY TOTAL SPENT ────────────────────────────────────────────────────
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

// ─── GET ACTIVE ORDER ──────────────────────────────────────────────────────
const getMyActiveOrder = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error("Not authorized");
  }
  const activeOrder = await Order.findOne({
    user: req.user._id,
    paid: true,
    status: { $in: ["processing"] },
    deliveryStatus: { $in: ["pending", "accepted", "picked_up", "in_transit", "delivered"] },
  })
    .sort({ createdAt: -1 })
    .populate("rider", "name profilePicture phone");
  res.status(200).json(activeOrder || null);
});

// ─── GET DELIVERY STATUS ──────────────────────────────────────────────────
const getDeliveryStatus = asyncHandler(async (req, res) => {
  const { userId, riderId, isAdmin } = getAuthActor(req);
  if (!userId && !riderId && !isAdmin) {
    res.status(401);
    throw new Error("Not authorized");
  }
  const order = await Order.findById(req.params.id)
    .select("user rider status deliveryStatus estimatedDeliveryMinutes scheduledDate scheduledTime acceptedAt pickedUpAt deliveredAt completedAt customerConfirmedAt")
    .populate("rider", "name email profilePicture phone");
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
    rider: order.rider,
    estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
    scheduledDate: order.scheduledDate,
    scheduledTime: order.scheduledTime,
    acceptedAt: order.acceptedAt,
    pickedUpAt: order.pickedUpAt,
    deliveredAt: order.deliveredAt,
    completedAt: order.completedAt,
    customerConfirmedAt: order.customerConfirmedAt,
  });
});

// ─── ADMIN: GET ALL ORDERS ─────────────────────────────────────────────────
const getOrders = asyncHandler(async (req, res) => {
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

// ─── ADMIN: UPDATE ORDER STATUS ──────────────────────────────────────────
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

// ─── ADMIN: DASHBOARD STATS ──────────────────────────────────────────────
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

// ─── VERIFY PAYMENT & GET ORDER ───────────────────────────────────────────
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
  const order = await Order.findOne({ paymentReference: reference })
    .populate("user", "name email")
    .populate("rider", "name email profilePicture phone");
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
    .populate("rider", "name email profilePicture phone");
  res.status(200).json({ order: refreshedOrder });
});

// ─── INITIALIZE PAYMENT FOR EXISTING ORDER ───────────────────────────────
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
  res.status(200).json({ authorization_url: authUrl, reference: paystackRef, orderId: order._id });
});

// ─── EXPORT (only order functions) ────────────────────────────────────────
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
};