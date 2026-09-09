// controllers/gasController.js
import asyncHandler from "express-async-handler";
import axios from "axios";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";

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

// ─── Get current subscription ──────────────────────────────
const getGasSubscription = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("gasSubscription");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const sub = user.gasSubscription;
  let isActive = false;
  let daysRemaining = 0;

  if (sub && sub.status === "active" && sub.nextBillingDate) {
    const now = new Date();
    const expiry = new Date(sub.nextBillingDate);
    if (now < expiry) {
      isActive = true;
      daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    } else {
      if (sub.gracePeriodEnd && now < sub.gracePeriodEnd) {
        isActive = true;
        daysRemaining = Math.ceil((sub.gracePeriodEnd - now) / (1000 * 60 * 60 * 24));
      } else {
        sub.status = "expired";
        await user.save();
      }
    }
  }

  res.status(200).json({
    subscription: sub || null,
    isActive,
    daysRemaining,
    cylinderSize: sub?.cylinderSize || null,
  });
});

// ─── Subscribe (first time) – creates order immediately ──
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

  if (user.gasSubscription?.status === "active") {
    res.status(400);
    throw new Error("You already have an active subscription");
  }

  // ─── Calculate totals ──────────────────────────────────────
  const gasContentCost = quantityKg * GAS_PRICE_PER_KG;
  const cylinderCost = CYLINDER_COST[cylinderSize] || 0;
  const total = gasContentCost + cylinderCost;

  // ─── Create order first (pending payment) ──────────────────
  const orderData = {
    user: user._id,
    orderType: "gas",
    gasDetails: {
      cylinderSize,
      quantityKg: quantityKg,
      isFirstTime: true,
      cylinderCost,
      gasContentCost,
    },
    deliveryAddress: "", // will be updated later when user provides address
    scheduleType: "now",
    status: "pending",
    paid: false,
    subtotal: gasContentCost + cylinderCost,
    deliveryFee: 0,
    serviceTax: 0,
    totalAmount: total,
    deliveryStatus: "pending",
  };
  const order = await Order.create(orderData);

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

  // ─── Store pending subscription in user (optional) ────────
  user.gasSubscription = {
    cylinderSize,
    status: "pending",
    startDate: null,
    nextBillingDate: null,
    gracePeriodEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await user.save();

  res.status(200).json({
    authorization_url: paystackData.authorization_url,
    reference: paystackData.reference,
    amount: total,
    orderId: order._id,
  });
});

// ─── Verify subscription payment (called by frontend) ──────
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

  // Find the order using the reference
  let order = await Order.findOne({ paymentReference: reference });
  if (!order) {
    // Fallback: create order if missing (should not happen)
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
      status: "completed",
      paid: true,
      paymentReference: reference,
      paymentMethod: "card",
      paymentDate: new Date(),
      subtotal: total,
      deliveryFee: 0,
      serviceTax: 0,
      totalAmount: total,
      deliveryStatus: "confirmed",
    });
  } else {
    // Mark order as paid
    order.paid = true;
    order.status = "completed";
    order.paymentDate = new Date();
    order.paymentMethod = "card";
    order.deliveryStatus = "confirmed";
    await order.save();
  }

  // Activate subscription
  const now = new Date();
  const nextBilling = new Date(now);
  nextBilling.setDate(nextBilling.getDate() + SUBSCRIPTION_DAYS);
  const graceEnd = new Date(nextBilling);
  graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);

  user.gasSubscription = {
    cylinderSize: data.metadata.cylinderSize,
    status: "active",
    startDate: now,
    nextBillingDate: nextBilling,
    gracePeriodEnd: graceEnd,
    createdAt: now,
    updatedAt: now,
  };
  await user.save();

  res.status(200).json({
    success: true,
    message: "Subscription activated",
    subscription: user.gasSubscription,
    order,
  });
});

// ─── Renew subscription ──────────────────────────────────
const renewGasSubscription = asyncHandler(async (req, res) => {
  // ... (same as before, but we can keep it unchanged)
});

// ─── Verify renewal payment ──────────────────────────────
const verifyRenewalPayment = asyncHandler(async (req, res) => {
  // ... unchanged
});

// ─── Upgrade subscription ────────────────────────────────
const upgradeGasSubscription = asyncHandler(async (req, res) => {
  // ... unchanged
});

// ─── Verify upgrade payment ──────────────────────────────
const verifyUpgradePayment = asyncHandler(async (req, res) => {
  // ... unchanged
});

// ─── Cancel subscription ──────────────────────────────────
const cancelGasSubscription = asyncHandler(async (req, res) => {
  // ... unchanged
});

export {
  getGasSubscription,
  subscribeGas,
  verifySubscriptionPayment,
  renewGasSubscription,
  verifyRenewalPayment,
  upgradeGasSubscription,
  verifyUpgradePayment,
  cancelGasSubscription,
};