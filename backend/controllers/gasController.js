// controllers/gasController.js
import asyncHandler from "express-async-handler";
import axios from "axios";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";

const PAYSTACK_BASE = "https://api.paystack.co";

// ─── Gas constants ──────────────────────────────────────────
const GAS_PRICE_PER_KG = 1300;
const CYLINDER_COST = {
  "3kg": 600,
  "6kg": 1200,
  "12kg": 3000,
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
// @desc    Get current gas subscription for logged-in user
// @route   GET /api/gas/subscription
// @access  Private
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
      // Check grace period
      if (sub.gracePeriodEnd && now < sub.gracePeriodEnd) {
        isActive = true; // still active within grace
        daysRemaining = Math.ceil((sub.gracePeriodEnd - now) / (1000 * 60 * 60 * 24));
      } else {
        // expired
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

// ─── Subscribe (first time) ────────────────────────────────
// @desc    Create a new gas subscription (pay cylinder + gas)
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

  // Check if already has active subscription
  if (user.gasSubscription?.status === "active") {
    res.status(400);
    throw new Error("You already have an active subscription");
  }

  const gasContentCost = quantityKg * GAS_PRICE_PER_KG;
  const cylinderCost = CYLINDER_COST[cylinderSize] || 0;
  const total = gasContentCost + cylinderCost;

  // Create Paystack transaction
  const amountInKobo = Math.round(total * 100);
  const reference = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const metadata = {
    type: "subscription_first",
    userId: user._id.toString(),
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
    res.status(502);
    throw new Error("Failed to initialize Paystack payment");
  }

  // Store temporary subscription data in user (pending)
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
  });
});

// ─── Verify subscription payment ──────────────────────────
// @desc    Verify payment and activate subscription
// @route   GET /api/gas/subscription/verify
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

  // Find user by metadata
  const user = await User.findOne({ _id: data.metadata?.userId });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { cylinderSize, quantityKg } = data.metadata;
  if (!cylinderSize) {
    res.status(400);
    throw new Error("Invalid subscription metadata");
  }

  // Activate subscription
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

  // Also create a gas order for the initial gas content
  // (optional – we can let the user create order separately)
  // For simplicity, we'll create it automatically:
  const gasContentCost = quantityKg * GAS_PRICE_PER_KG;
  const cylinderCost = CYLINDER_COST[cylinderSize] || 0;
  const total = gasContentCost + cylinderCost;

  // Create an order for the gas content (already paid)
  // We'll mark it as paid and completed
  const order = await Order.create({
    user: user._id,
    orderType: "gas",
    gasDetails: {
      cylinderSize,
      quantityKg: quantityKg,
      isFirstTime: true,
      cylinderCost,
      gasContentCost,
    },
    deliveryAddress: "", // user will need to provide address for delivery later
    scheduleType: "now",
    status: "completed", // paid and delivered? Actually not delivered, but we can set to processing.
    paid: true,
    paymentReference: reference,
    paymentMethod: "card",
    paymentDate: new Date(),
    subtotal: gasContentCost + cylinderCost,
    deliveryFee: 0, // maybe they'll pay delivery later
    serviceTax: 0,
    totalAmount: total,
    deliveryStatus: "confirmed", // or pending delivery
    // you may want to set other fields as needed
  });

  res.status(200).json({
    success: true,
    message: "Subscription activated",
    subscription: user.gasSubscription,
    order,
  });
});

// ─── Renew subscription ──────────────────────────────────
// @desc    Renew an existing subscription (pay cylinder fee)
// @route   POST /api/gas/subscription/renew
// @access  Private
const renewGasSubscription = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const sub = user.gasSubscription;
  if (!sub || sub.status !== "active") {
    res.status(400);
    throw new Error("No active subscription to renew");
  }

  const now = new Date();
  if (sub.gracePeriodEnd && now > sub.gracePeriodEnd) {
    res.status(400);
    throw new Error("Subscription has expired beyond grace period. Please create a new subscription.");
  }

  const cylinderCost = CYLINDER_COST[sub.cylinderSize] || 0;
  if (cylinderCost === 0) {
    res.status(400);
    throw new Error("Invalid cylinder size");
  }

  // Create Paystack transaction for cylinder fee
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

  // Store pending renewal info (optional)
  // We'll use a separate field or just rely on the payment verification to update.

  res.status(200).json({
    authorization_url: paystackData.authorization_url,
    reference: paystackData.reference,
    amount: cylinderCost,
  });
});

// ─── Verify renewal payment ──────────────────────────────
// @desc    Verify renewal payment and extend subscription
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

  const sub = user.gasSubscription;
  if (!sub || sub.status !== "active") {
    // If expired but within grace, we can still renew
    if (sub?.status === "expired" && sub.gracePeriodEnd && new Date() < sub.gracePeriodEnd) {
      // allow renewal
    } else {
      res.status(400);
      throw new Error("No active subscription to renew");
    }
  }

  // Extend subscription by SUBSCRIPTION_DAYS from current nextBillingDate or from now
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
  sub.updatedAt = now;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Subscription renewed",
    subscription: sub,
  });
});

// ─── Upgrade subscription ────────────────────────────────
// @desc    Upgrade to a larger cylinder size
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

  const sub = user.gasSubscription;
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
  if (upgradeCost <= 0) {
    res.status(400);
    throw new Error("Downgrade is free. No payment needed.");
    // We can allow free downgrade directly without payment
    sub.cylinderSize = newCylinderSize;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Downgraded successfully",
      subscription: sub,
    });
  }

  // Create Paystack transaction for upgrade cost
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

  res.status(200).json({
    authorization_url: paystackData.authorization_url,
    reference: paystackData.reference,
    amount: upgradeCost,
  });
});

// ─── Verify upgrade payment ──────────────────────────────
// @desc    Verify upgrade payment and update cylinder size
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

  const sub = user.gasSubscription;
  if (!sub || sub.status !== "active") {
    res.status(400);
    throw new Error("No active subscription");
  }

  sub.cylinderSize = data.metadata.newCylinderSize;
  sub.updatedAt = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    message: "Upgrade successful",
    subscription: sub,
  });
});

// ─── Cancel subscription ──────────────────────────────────
// @desc    Cancel active subscription
// @route   DELETE /api/gas/subscription
// @access  Private
const cancelGasSubscription = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const sub = user.gasSubscription;
  if (!sub || sub.status !== "active") {
    res.status(400);
    throw new Error("No active subscription to cancel");
  }

  sub.status = "cancelled";
  sub.updatedAt = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    message: "Subscription cancelled",
  });
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