// controllers/gasController.js
import asyncHandler from "express-async-handler";
import axios from "axios";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import GasSubscription from "../models/gasSubscriptionModel.js";
import GasPayment from "../models/gasPaymentModel.js";

const PAYSTACK_BASE = "https://api.paystack.co";

// ─── TESTING PRICES (matches frontend) ──────────────────────
const GAS_PRICE_PER_KG = 10;
const CYLINDER_COST = {
  "3kg": 100,
  "6kg": 200,
  "12kg": 300,
};
const SUBSCRIPTION_DAYS = 30;
const GRACE_DAYS = 6;

// ─── Paystack helpers ──────────────────────────────────────
const getPaystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
});

const initializePaystackPayment = async ({ email, amountInKobo, reference, metadata }) => {
  const initResp = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    {
      email,
      amount: amountInKobo,
      reference,
      callback_url: process.env.PAYSTACK_CALLBACK_URL,
      metadata: { ...metadata, app: "flanorx" },
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

// ─── Helper: get or create the subscription doc for a user ──
const getOrCreateSubscription = async (userId) => {
  let sub = await GasSubscription.findOne({ user: userId });
  if (!sub) {
    sub = await GasSubscription.create({ user: userId, status: "none" });
  }
  return sub;
};

// ─── Helper: compute isActive/daysRemaining, flip to expired if needed ──
const evaluateSubscription = async (sub) => {
  if (!sub || sub.status !== "active" || !sub.nextBillingDate) {
    return { isActive: false, daysRemaining: 0 };
  }
  const now = new Date();
  const expiry = new Date(sub.nextBillingDate);

  if (now < expiry) {
    const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return { isActive: true, daysRemaining };
  }

  if (sub.gracePeriodEnd && now < new Date(sub.gracePeriodEnd)) {
    const daysRemaining = Math.ceil((new Date(sub.gracePeriodEnd) - now) / (1000 * 60 * 60 * 24));
    return { isActive: true, daysRemaining };
  }

  // Expired beyond grace — persist the flip
  sub.status = "expired";
  await sub.save();
  return { isActive: false, daysRemaining: 0 };
};

// ─── Get current subscription ──────────────────────────────
// @route   GET /api/gas/subscription
// @access  Private
const getGasSubscription = asyncHandler(async (req, res) => {
  const sub = await GasSubscription.findOne({ user: req.user._id });

  if (!sub) {
    return res.status(200).json({
      subscription: null,
      isActive: false,
      daysRemaining: 0,
      cylinderSize: null,
    });
  }

  const { isActive, daysRemaining } = await evaluateSubscription(sub);

  res.status(200).json({
    subscription: sub,
    isActive,
    daysRemaining,
    cylinderSize: sub.cylinderSize || null,
  });
});

// ─── Get payment / transaction history ───────────────────────
// @route   GET /api/gas/subscription/payments
// @access  Private
const getGasPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await GasPayment.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate("order", "orderId status deliveryStatus");

  res.status(200).json(payments);
});

// ─── Subscribe (first time) ────────────────────────────────
// @route   POST /api/gas/subscription
// @access  Private
const subscribeGas = asyncHandler(async (req, res) => {
  const { cylinderSize, quantityKg } = req.body;

  if (!cylinderSize || !["3kg", "6kg", "12kg"].includes(cylinderSize)) {
    res.status(400);
    throw new Error("Valid cylinderSize is required");
  }
  if (!quantityKg || quantityKg <= 0) {
    res.status(400);
    throw new Error("quantityKg must be a positive number");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const sub = await getOrCreateSubscription(user._id);
  if (sub.status === "active") {
    res.status(400);
    throw new Error("You already have an active subscription");
  }

  // ─── Clean up stale pending gas orders + payments ─────────
  await Order.deleteMany({
    user: user._id,
    orderType: "gas",
    paid: false,
    status: "pending",
    "gasDetails.isFirstTime": true,
  });
  await GasPayment.deleteMany({
    user: user._id,
    type: "subscription_first",
    status: "pending",
  });

  // ─── Calculate totals ─────────────────────────────────────
  const gasContentCost = quantityKg * GAS_PRICE_PER_KG;
  const cylinderCost = CYLINDER_COST[cylinderSize] || 0;
  const total = gasContentCost + cylinderCost;

  // ─── Create order FIRST (pending payment) ─────────────────
  const order = await Order.create({
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
    status: "pending",
    paid: false,
    subtotal: gasContentCost + cylinderCost,
    deliveryFee: 0,
    serviceTax: 0,
    totalAmount: total,
    deliveryStatus: "pending",
  });

  // ─── Initialize Paystack payment ──────────────────────────
  const amountInKobo = Math.round(total * 100);
  const reference = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const metadata = {
    type: "subscription_first",
    userId: user._id.toString(),
    orderId: order._id.toString(),
    cylinderSize,
    quantityKg,
  };

  const paystackData = await initializePaystackPayment({
    email: user.email,
    amountInKobo,
    reference,
    metadata,
  });

  if (!paystackData.authorization_url || !paystackData.reference) {
    await Order.findByIdAndDelete(order._id);
    res.status(502);
    throw new Error("Failed to initialize Paystack payment");
  }

  // ─── Update order with payment reference ──────────────────
  order.paymentReference = paystackData.reference;
  await order.save();

  // ─── Create the payment/transaction record ────────────────
  const payment = await GasPayment.create({
    user: user._id,
    subscription: sub._id,
    type: "subscription_first",
    cylinderSize,
    quantityKg,
    amount: total,
    reference: paystackData.reference,
    status: "pending",
    order: order._id,
  });

  // ─── Mark subscription pending ─────────────────────────────
  sub.cylinderSize = cylinderSize;
  sub.status = "pending";
  sub.lastPayment = payment._id;
  await sub.save();

  res.status(200).json({
    authorization_url: paystackData.authorization_url,
    reference: paystackData.reference,
    amount: total,
    orderId: order._id,
  });
});

// ─── Verify subscription payment ───────────────────────────
// @route   GET /api/gas/subscription/verify?reference=SUB_xxx
// @access  Private
const verifySubscriptionPayment = asyncHandler(async (req, res) => {
  const { reference } = req.query;
  if (!reference) {
    res.status(400);
    throw new Error("Reference is required");
  }

  const data = await verifyPaystackPayment(reference);
  if (!data || data.status !== "success") {
    res.status(400);
    throw new Error("Payment verification failed");
  }

  const user = await User.findById(data.metadata?.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // ─── Find the payment record created in subscribeGas ──────
  const payment = await GasPayment.findOne({ reference });
  if (!payment) {
    res.status(404);
    throw new Error("Payment record not found for this reference");
  }

  // ─── Find the existing order created in subscribeGas ──────
  let order = await Order.findOne({ paymentReference: reference });

  if (order) {
    order.paid = true;
    order.status = "processing";
    order.deliveryStatus = "pending";
    order.paymentDate = new Date();
    order.paymentMethod = "card";
    await order.save();
  } else {
    const { cylinderSize, quantityKg } = data.metadata;
    const gasContentCost = quantityKg * GAS_PRICE_PER_KG;
    const cylinderCost = CYLINDER_COST[cylinderSize] || 0;
    const total = gasContentCost + cylinderCost;
    order = await Order.create({
      user: user._id,
      orderType: "gas",
      gasDetails: { cylinderSize, quantityKg, isFirstTime: true, cylinderCost, gasContentCost },
      deliveryAddress: "",
      scheduleType: "now",
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
    });
  }

  // ─── Mark payment record as successful ─────────────────────
  payment.status = "success";
  payment.paidAt = new Date();
  payment.order = order._id;
  await payment.save();

  // ─── Activate subscription ────────────────────────────────
  const sub = await getOrCreateSubscription(user._id);
  const now = new Date();
  const nextBilling = new Date(now);
  nextBilling.setDate(nextBilling.getDate() + SUBSCRIPTION_DAYS);
  const graceEnd = new Date(nextBilling);
  graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);

  sub.cylinderSize = data.metadata.cylinderSize;
  sub.status = "active";
  sub.startDate = now;
  sub.nextBillingDate = nextBilling;
  sub.gracePeriodEnd = graceEnd;
  sub.lastPayment = payment._id;
  await sub.save();

  res.status(200).json({
    success: true,
    message: "Subscription activated",
    subscription: sub,
    order,
    payment,
  });
});

// ─── Renew subscription ──────────────────────────────────
// @route   POST /api/gas/subscription/renew
// @access  Private
const renewGasSubscription = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const sub = await GasSubscription.findOne({ user: user._id });
  if (!sub || (sub.status !== "active" && sub.status !== "expired")) {
    res.status(400);
    throw new Error("No active subscription to renew");
  }

  const now = new Date();
  if (sub.gracePeriodEnd && now > new Date(sub.gracePeriodEnd)) {
    res.status(400);
    throw new Error("Subscription has expired beyond grace period. Please create a new subscription.");
  }

  const cylinderCost = CYLINDER_COST[sub.cylinderSize] || 0;
  if (cylinderCost === 0) {
    res.status(400);
    throw new Error("Invalid cylinder size");
  }

  // Clean up any stale pending renewal payments
  await GasPayment.deleteMany({
    user: user._id,
    type: "subscription_renew",
    status: "pending",
  });

  const amountInKobo = Math.round(cylinderCost * 100);
  const reference = `RENEW_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const metadata = {
    type: "subscription_renew",
    userId: user._id.toString(),
    cylinderSize: sub.cylinderSize,
  };

  const paystackData = await initializePaystackPayment({
    email: user.email,
    amountInKobo,
    reference,
    metadata,
  });

  if (!paystackData.authorization_url || !paystackData.reference) {
    res.status(502);
    throw new Error("Failed to initialize Paystack payment");
  }

  await GasPayment.create({
    user: user._id,
    subscription: sub._id,
    type: "subscription_renew",
    cylinderSize: sub.cylinderSize,
    amount: cylinderCost,
    reference: paystackData.reference,
    status: "pending",
  });

  res.status(200).json({
    authorization_url: paystackData.authorization_url,
    reference: paystackData.reference,
    amount: cylinderCost,
  });
});

// ─── Verify renewal payment ──────────────────────────────
// @route   GET /api/gas/subscription/verify-renewal
// @access  Private
const verifyRenewalPayment = asyncHandler(async (req, res) => {
  const { reference } = req.query;
  if (!reference) {
    res.status(400);
    throw new Error("Reference is required");
  }

  const data = await verifyPaystackPayment(reference);
  if (!data || data.status !== "success") {
    res.status(400);
    throw new Error("Payment verification failed");
  }

  const user = await User.findById(data.metadata?.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const payment = await GasPayment.findOne({ reference });
  if (!payment) {
    res.status(404);
    throw new Error("Payment record not found for this reference");
  }

  const sub = await GasSubscription.findOne({ user: user._id });
  if (!sub) {
    res.status(400);
    throw new Error("No subscription to renew");
  }

  const now = new Date();
  let nextBilling = sub.nextBillingDate ? new Date(sub.nextBillingDate) : now;
  if (nextBilling < now) {
    nextBilling = now;
  }
  nextBilling.setDate(nextBilling.getDate() + SUBSCRIPTION_DAYS);
  const graceEnd = new Date(nextBilling);
  graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);

  sub.status = "active";
  sub.nextBillingDate = nextBilling;
  sub.gracePeriodEnd = graceEnd;
  sub.lastPayment = payment._id;
  await sub.save();

  payment.status = "success";
  payment.paidAt = new Date();
  await payment.save();

  res.status(200).json({
    success: true,
    message: "Subscription renewed",
    subscription: sub,
    payment,
  });
});

// ─── Upgrade subscription ────────────────────────────────
// @route   POST /api/gas/subscription/upgrade
// @access  Private
const upgradeGasSubscription = asyncHandler(async (req, res) => {
  const { newCylinderSize } = req.body;
  if (!newCylinderSize || !["3kg", "6kg", "12kg"].includes(newCylinderSize)) {
    res.status(400);
    throw new Error("Valid newCylinderSize is required");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const sub = await GasSubscription.findOne({ user: user._id });
  if (!sub || sub.status !== "active") {
    res.status(400);
    throw new Error("No active subscription to upgrade");
  }

  const currentSize = sub.cylinderSize;
  if (currentSize === newCylinderSize) {
    res.status(400);
    throw new Error("Already on this cylinder size");
  }

  const currentCost = CYLINDER_COST[currentSize] || 0;
  const newCost = CYLINDER_COST[newCylinderSize] || 0;
  const upgradeCost = newCost - currentCost;

  // ─── Free downgrade: apply immediately, log a zero-cost record ──
  if (upgradeCost <= 0) {
    const oldSize = sub.cylinderSize;
    sub.cylinderSize = newCylinderSize;
    await sub.save();

    await GasPayment.create({
      user: user._id,
      subscription: sub._id,
      type: "subscription_upgrade",
      cylinderSize: newCylinderSize,
      amount: 0,
      reference: `DOWNGRADE_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      status: "success",
      paidAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Downgraded successfully",
      subscription: sub,
    });
  }

  const amountInKobo = Math.round(upgradeCost * 100);
  const reference = `UPGRADE_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const metadata = {
    type: "subscription_upgrade",
    userId: user._id.toString(),
    oldCylinderSize: currentSize,
    newCylinderSize,
    upgradeCost,
  };

  const paystackData = await initializePaystackPayment({
    email: user.email,
    amountInKobo,
    reference,
    metadata,
  });

  if (!paystackData.authorization_url || !paystackData.reference) {
    res.status(502);
    throw new Error("Failed to initialize Paystack payment");
  }

  await GasPayment.create({
    user: user._id,
    subscription: sub._id,
    type: "subscription_upgrade",
    cylinderSize: newCylinderSize,
    amount: upgradeCost,
    reference: paystackData.reference,
    status: "pending",
  });

  res.status(200).json({
    authorization_url: paystackData.authorization_url,
    reference: paystackData.reference,
    amount: upgradeCost,
  });
});

// ─── Verify upgrade payment ──────────────────────────────
// @route   GET /api/gas/subscription/verify-upgrade
// @access  Private
const verifyUpgradePayment = asyncHandler(async (req, res) => {
  const { reference } = req.query;
  if (!reference) {
    res.status(400);
    throw new Error("Reference is required");
  }

  const data = await verifyPaystackPayment(reference);
  if (!data || data.status !== "success") {
    res.status(400);
    throw new Error("Payment verification failed");
  }

  const user = await User.findById(data.metadata?.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const payment = await GasPayment.findOne({ reference });
  if (!payment) {
    res.status(404);
    throw new Error("Payment record not found for this reference");
  }

  const sub = await GasSubscription.findOne({ user: user._id });
  if (!sub || sub.status !== "active") {
    res.status(400);
    throw new Error("No active subscription");
  }

  sub.cylinderSize = data.metadata.newCylinderSize;
  sub.lastPayment = payment._id;
  await sub.save();

  payment.status = "success";
  payment.paidAt = new Date();
  await payment.save();

  res.status(200).json({
    success: true,
    message: "Upgrade successful",
    subscription: sub,
    payment,
  });
});

// ─── Cancel subscription ──────────────────────────────────
// @route   DELETE /api/gas/subscription
// @access  Private
const cancelGasSubscription = asyncHandler(async (req, res) => {
  const sub = await GasSubscription.findOne({ user: req.user._id });
  if (!sub || sub.status !== "active") {
    res.status(400);
    throw new Error("No active subscription to cancel");
  }

  sub.status = "cancelled";
  await sub.save();

  res.status(200).json({
    success: true,
    message: "Subscription cancelled",
  });
});

// ═══════════════════════════════════════════════════════════
// ─── SUBSCRIBE CYLINDER ONLY (no gas order) ────────────────
// ═══════════════════════════════════════════════════════════
// @desc    Pay only for cylinder subscription – no gas order created.
// @route   POST /api/gas/subscription/cylinder
// @access  Private
const subscribeCylinderOnly = asyncHandler(async (req, res) => {
  const { cylinderSize } = req.body;

  if (!cylinderSize || !["3kg", "6kg", "12kg"].includes(cylinderSize)) {
    res.status(400);
    throw new Error("Valid cylinderSize is required");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const sub = await getOrCreateSubscription(user._id);
  if (sub.status === "active") {
    res.status(400);
    throw new Error("You already have an active subscription");
  }

  const cylinderCost = CYLINDER_COST[cylinderSize] || 0;
  if (cylinderCost <= 0) {
    res.status(400);
    throw new Error("Invalid cylinder size");
  }

  // Clean up stale pending cylinder-only payments
  await GasPayment.deleteMany({
    user: user._id,
    type: "subscription_cylinder_only",
    status: "pending",
  });

  const amountInKobo = Math.round(cylinderCost * 100);
  const reference = `CYL_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const metadata = {
    type: "subscription_cylinder_only",
    userId: user._id.toString(),
    cylinderSize,
  };

  const paystackData = await initializePaystackPayment({
    email: user.email,
    amountInKobo,
    reference,
    metadata,
  });

  if (!paystackData.authorization_url || !paystackData.reference) {
    res.status(502);
    throw new Error("Failed to initialize Paystack payment");
  }

  const payment = await GasPayment.create({
    user: user._id,
    subscription: sub._id,
    type: "subscription_cylinder_only",
    cylinderSize,
    amount: cylinderCost,
    reference: paystackData.reference,
    status: "pending",
  });

  sub.cylinderSize = cylinderSize;
  sub.status = "pending";
  sub.lastPayment = payment._id;
  await sub.save();

  res.status(200).json({
    authorization_url: paystackData.authorization_url,
    reference: paystackData.reference,
    amount: cylinderCost,
  });
});

// ─── Verify cylinder-only payment ───────────────────────────
// @route   GET /api/gas/subscription/verify-cylinder
// @access  Private
const verifyCylinderOnlyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.query;
  if (!reference) {
    res.status(400);
    throw new Error("Reference is required");
  }

  const data = await verifyPaystackPayment(reference);
  if (!data || data.status !== "success") {
    res.status(400);
    throw new Error("Payment verification failed");
  }

  const user = await User.findById(data.metadata?.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const payment = await GasPayment.findOne({ reference });
  if (!payment) {
    res.status(404);
    throw new Error("Payment record not found for this reference");
  }

  const sub = await getOrCreateSubscription(user._id);

  // Idempotent – if already active, don't reactivate or double-mark
  if (sub.status === "active") {
    if (payment.status !== "success") {
      payment.status = "success";
      payment.paidAt = new Date();
      await payment.save();
    }
    return res.status(200).json({
      success: true,
      message: "Already activated",
      subscription: sub,
      payment,
    });
  }

  const now = new Date();
  const nextBilling = new Date(now);
  nextBilling.setDate(nextBilling.getDate() + SUBSCRIPTION_DAYS);
  const graceEnd = new Date(nextBilling);
  graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);

  sub.cylinderSize = data.metadata.cylinderSize;
  sub.status = "active";
  sub.startDate = now;
  sub.nextBillingDate = nextBilling;
  sub.gracePeriodEnd = graceEnd;
  sub.lastPayment = payment._id;
  await sub.save();

  payment.status = "success";
  payment.paidAt = new Date();
  await payment.save();

  res.status(200).json({
    success: true,
    message: "Cylinder subscription activated",
    subscription: sub,
    payment,
  });
});

export {
  getGasSubscription,
  getGasPaymentHistory,
  subscribeGas,
  verifySubscriptionPayment,
  renewGasSubscription,
  verifyRenewalPayment,
  upgradeGasSubscription,
  verifyUpgradePayment,
  cancelGasSubscription,
  subscribeCylinderOnly,
  verifyCylinderOnlyPayment,
};