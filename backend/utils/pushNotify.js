// utils/pushNotify.js
import admin from "firebase-admin";
import DeviceToken from "../models/deviceTokenModel.js";

// ═══════════════════════════════════════════════════════════
//  Firebase Admin initialization (lazy, once)
// ═══════════════════════════════════════════════════════════
let initialized = false;
let initError = null;

export const isPushConfigured = () => {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
};

const initFirebase = () => {
  if (initialized) return true;
  if (!isPushConfigured()) {
    initError = "Firebase Admin credentials missing";
    return false;
  }

  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Env vars often store the key with literal \n — turn them into real newlines
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    }
    initialized = true;
    return true;
  } catch (err) {
    initError = err.message;
    console.error("[push] Firebase Admin init failed:", err.message);
    return false;
  }
};

export const getPushStatus = () => ({
  configured: isPushConfigured(),
  initialized,
  error: initError,
});

// Lazy-init on first use
const messaging = () => {
  if (!initFirebase()) return null;
  return admin.messaging();
};

// ═══════════════════════════════════════════════════════════
//  Mark a token invalid (called when FCM says it's stale)
// ═══════════════════════════════════════════════════════════
const invalidateToken = async (token, reason) => {
  try {
    await DeviceToken.updateOne(
      { token },
      {
        $set: {
          isValid: false,
          invalidatedAt: new Date(),
          invalidReason: reason || "unknown",
        },
      }
    );
  } catch (err) {
    console.error("[push] failed to invalidate token:", err.message);
  }
};

// ═══════════════════════════════════════════════════════════
//  Low-level: send to a list of tokens
//  Returns { successCount, failureCount, invalidTokens }
// ═══════════════════════════════════════════════════════════
export const sendToTokens = async (
  tokens,
  { title, body, data = {}, link, imageUrl }
) => {
  const cleanTokens = Array.from(
    new Set((tokens || []).filter((t) => typeof t === "string" && t.length > 10))
  );

  if (cleanTokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const m = messaging();
  if (!m) {
    return {
      successCount: 0,
      failureCount: cleanTokens.length,
      invalidTokens: [],
      error: "Firebase not configured",
    };
  }

  // Android/iOS push payload
  // `data` values must all be strings
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  const message = {
    tokens: cleanTokens,
    notification: {
      title,
      body,
      ...(imageUrl && { imageUrl }),
    },
    data: {
      ...stringData,
      ...(link && { link }),
    },
    // Web push — tells the browser how to display it
    webpush: {
      notification: {
        title,
        body,
        ...(imageUrl && { icon: imageUrl, image: imageUrl }),
        ...(link && { click_action: link }),
      },
      fcmOptions: link ? { link } : undefined,
    },
    // Android
    android: {
      priority: "high",
      notification: {
        ...(imageUrl && { imageUrl }),
        ...(link && { clickAction: "FLANORX_OPEN" }),
      },
    },
    // APNs (iOS)
    apns: {
      payload: {
        aps: {
          sound: "default",
          ...(imageUrl && { "mutable-content": 1 }),
        },
      },
    },
  };

  try {
    const response = await m.sendEachForMulticast(message);

    // Which tokens failed permanently?
    const invalidTokens = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || "";
        // Only invalidate on hard errors, not transient ones
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument"
        ) {
          invalidTokens.push(cleanTokens[i]);
        }
      }
    });

    // Invalidate stale tokens
    for (const t of invalidTokens) {
      await invalidateToken(t, "stale");
    }

    // Mark the good ones as recently used
    const goodTokens = cleanTokens.filter((t) => !invalidTokens.includes(t));
    if (goodTokens.length > 0) {
      await DeviceToken.updateMany(
        { token: { $in: goodTokens } },
        { $set: { lastUsedAt: new Date() } }
      );
    }

    if (process.env.PUSH_DEBUG === "true") {
      console.log(
        `[push] sent to ${response.successCount}/${cleanTokens.length}, ${invalidTokens.length} invalid`
      );
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
    };
  } catch (err) {
    console.error("[push] sendToTokens error:", err.message);
    return {
      successCount: 0,
      failureCount: cleanTokens.length,
      invalidTokens: [],
      error: err.message,
    };
  }
};

// ═══════════════════════════════════════════════════════════
//  Send to a single user (all their valid devices)
// ═══════════════════════════════════════════════════════════
export const sendToUser = async (
  userId,
  { title, body, data = {}, link, imageUrl }
) => {
  if (!initFirebase()) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const tokens = await DeviceToken.find({
    user: userId,
    isValid: true,
  }).select("token");

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  return sendToTokens(
    tokens.map((t) => t.token),
    { title, body, data, link, imageUrl }
  );
};

// ═══════════════════════════════════════════════════════════
//  High-level event helpers
//  Same pattern as email — fire-and-forget, never throw.
// ═══════════════════════════════════════════════════════════

// @desc  Notify a customer about an order event
export const notifyOrderPush = async (orderOrId, event) => {
  try {
    if (!initFirebase()) return { skipped: true };

    const { default: Order } = await import("../models/orderModel.js");
    const id = typeof orderOrId === "object" ? orderOrId._id : orderOrId;

    const order = await Order.findById(id).populate("user", "name email");
    if (!order?.user) return { skipped: true };

    const { title, body, link } = buildOrderPush(order, event);
    if (!title) return { skipped: true };

    const result = await sendToUser(order.user._id, {
      title,
      body,
      link,
      data: {
        event: `order_${event}`,
        orderId: String(order._id),
        type: "order",
      },
    });

    if (process.env.PUSH_DEBUG === "true") {
      console.log(`[push] order_${event} → ${result.successCount} devices`);
    }
    return result;
  } catch (err) {
    console.error("[push] notifyOrderPush failed:", err.message);
    return { error: err.message };
  }
};

// @desc  Notify a rider that a delivery was assigned to them
export const notifyRiderAssignedPush = async (orderId, riderId) => {
  try {
    if (!initFirebase()) return { skipped: true };

    const { default: Order } = await import("../models/orderModel.js");
    const order = await Order.findById(orderId).populate("station", "name");
    if (!order) return { skipped: true };

    const result = await sendToUser(riderId, {
      title: "New delivery assigned",
      body: `${order.station?.name || "Your station"} assigned you order #${
        order.orderId
      }`,
      link: "/rider/deliveries",
      data: {
        event: "rider_assigned",
        orderId: String(order._id),
        type: "delivery",
      },
    });

    return result;
  } catch (err) {
    console.error("[push] notifyRiderAssignedPush failed:", err.message);
    return { error: err.message };
  }
};

// @desc  Notify a rider about application approval
export const notifyRiderApplicationPush = async (userId, event, extra = {}) => {
  try {
    if (!initFirebase()) return { skipped: true };

    const titles = {
      approved: "Application approved 🎉",
      rejected: "An update on your application",
      applied: "Application received",
    };

    const bodies = {
      approved: "Welcome to Flanorx! Open the app to start delivering.",
      rejected:
        extra.reason || "We couldn't approve your application this time.",
      applied: "We're reviewing your rider application. We'll be in touch.",
    };

    return await sendToUser(userId, {
      title: titles[event] || "Flanorx",
      body: bodies[event] || "",
      link: "/rider/dashboard",
      data: {
        event: `rider_${event}`,
        type: "rider",
      },
    });
  } catch (err) {
    console.error("[push] notifyRiderApplicationPush failed:", err.message);
    return { error: err.message };
  }
};

// ═══════════════════════════════════════════════════════════
//  Order push templates
// ═══════════════════════════════════════════════════════════
const buildOrderPush = (order, event) => {
  const id = order.orderId || String(order._id).slice(-6);
  const shortTitle = `Order #${id}`;

  switch (event) {
    case "paid":
      return {
        title: "Payment confirmed",
        body: `Thanks! We're preparing ${shortTitle.toLowerCase()}.`,
        link: `/order/${order._id}`,
      };
    case "processing":
      return {
        title: `${shortTitle} is being prepared`,
        body: "We'll let you know when a rider picks it up.",
        link: `/order/${order._id}`,
      };
    case "accepted":
      return {
        title: "Rider on the way",
        body: `A rider accepted ${shortTitle.toLowerCase()} and is heading to pickup.`,
        link: `/tracking/${order._id}`,
      };
    case "picked_up":
      return {
        title: `${shortTitle} picked up`,
        body: "Your rider is on the way to you.",
        link: `/tracking/${order._id}`,
      };
    case "in_transit":
      return {
        title: "Almost there",
        body: "Your rider is close. Have your QR code ready.",
        link: `/order/${order._id}`,
      };
    case "delivered":
      return {
        title: "Rider has arrived",
        body: "Show them the QR code in the app to complete the delivery.",
        link: `/order/${order._id}`,
      };
    case "confirmed":
      return {
        title: `${shortTitle} completed`,
        body: "Thanks for choosing Flanorx!",
        link: `/order/${order._id}`,
      };
    case "cancelled":
      return {
        title: `${shortTitle} cancelled`,
        body: "Your order was cancelled. Tap for details.",
        link: `/orders`,
      };
    case "failed":
      return {
        title: "Payment failed",
        body: `We couldn't complete payment for ${shortTitle.toLowerCase()}. Try again.`,
        link: `/orders`,
      };
    default:
      return {};
  }
};

export default {
  sendToTokens,
  sendToUser,
  notifyOrderPush,
  notifyRiderAssignedPush,
  notifyRiderApplicationPush,
  isPushConfigured,
  getPushStatus,
};