// utils/emailNotify.js
import { Resend } from "resend";
import { buildEmailHtml } from "./buildEmailHtml.js";
import {
  ORDER_TEMPLATES,
  RIDER_TEMPLATES,
  STATION_RIDER_TEMPLATES,
} from "./emailTemplates.js";

// ─── Setup ────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS =
  process.env.RESEND_FROM || "Flanorx <onboarding@flanorx.com>";
const REPLY_TO = process.env.RESEND_REPLY_TO || "flanorx1@gmail.com";

const BULK_BATCH_DELAY_MS = 120;

export const isEmailConfigured = () => Boolean(process.env.RESEND_API_KEY);

// ─── Recipient normalization ──────────────────────────────
const normalizeRecipients = (to) => {
  const list = Array.isArray(to) ? to : [to];
  return Array.from(
    new Set(
      list
        .filter(Boolean)
        .map((r) => String(r).trim().toLowerCase())
        .filter((r) => r.includes("@"))
    )
  );
};

// ═══════════════════════════════════════════════════════════
//  Low-level: send one email
// ═══════════════════════════════════════════════════════════
export const sendEmail = async ({
  to,
  subject,
  body,
  html,
  text,
  ctaLabel,
  ctaUrl,
  preheader,
  replyTo,
  tags,
}) => {
  if (!isEmailConfigured()) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return { success: false, skipped: true, error: "Email not configured" };
  }

  if (!subject || !String(subject).trim()) {
    return { success: false, error: "Subject is required" };
  }

  const recipients = normalizeRecipients(to);
  if (recipients.length === 0) {
    return { success: false, error: "No valid recipients" };
  }

  try {
    const htmlBody =
      html ||
      buildEmailHtml({
        body: body || "",
        subject,
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
        preheader: preheader || subject,
      });

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipients,
      subject,
      html: htmlBody,
      text: text || body || "",
      reply_to: replyTo || REPLY_TO,
      ...(tags && { tags }),
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message || "Resend error" };
    }

    return { success: true, id: data?.id, recipients };
  } catch (err) {
    console.error("[email] sendEmail threw:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
};

// ═══════════════════════════════════════════════════════════
//  Low-level: send many
// ═══════════════════════════════════════════════════════════
export const sendBulkEmails = async ({
  recipients = [],
  subject,
  body,
  html,
  text,
  ctaLabel,
  ctaUrl,
  preheader,
  tags,
}) => {
  const list = normalizeRecipients(recipients);
  const summary = { total: list.length, sent: 0, failed: 0, errors: [] };

  for (const to of list) {
    const res = await sendEmail({
      to,
      subject,
      body,
      html,
      text,
      ctaLabel,
      ctaUrl,
      preheader,
      tags,
    });
    if (res.success) summary.sent += 1;
    else {
      summary.failed += 1;
      summary.errors.push({ to, error: res.error });
    }
    await new Promise((r) => setTimeout(r, BULK_BATCH_DELAY_MS));
  }

  return summary;
};

// ═══════════════════════════════════════════════════════════
//  High-level: order event
//  Called automatically from order/delivery controllers.
//
//  Usage:
//    notifyOrderEvent(orderId, "confirmed").catch(console.error);
// ═══════════════════════════════════════════════════════════
export const notifyOrderEvent = async (orderOrId, event) => {
  try {
    if (!isEmailConfigured()) {
      return { success: false, skipped: true, error: "Email not configured" };
    }

    const builder = ORDER_TEMPLATES[event];
    if (!builder) {
      return { success: false, error: `No template for order event "${event}"` };
    }

    // Lazy-load Order to avoid a circular import if Order is imported elsewhere
    const { default: Order } = await import("../models/orderModel.js");
    const id = typeof orderOrId === "object" ? orderOrId._id : orderOrId;

    const order = await Order.findById(id).populate("user", "name email");
    if (!order) return { success: false, error: "Order not found" };
    if (!order.user?.email) {
      return { success: false, skipped: true, error: "Customer has no email" };
    }

    const tpl = builder(order);
    return await sendEmail({
      to: order.user.email,
      subject: tpl.subject,
      preheader: tpl.preheader,
      body: tpl.body,
      ctaLabel: tpl.ctaLabel,
      ctaUrl: tpl.ctaUrl,
      tags: [{ name: "event", value: `order_${event}` }],
    });
  } catch (err) {
    console.error("[email] notifyOrderEvent failed:", err);
    return { success: false, error: err.message };
  }
};

// ═══════════════════════════════════════════════════════════
//  High-level: rider application event
//  Usage: notifyRiderEvent(userId, "approved").catch(console.error);
// ═══════════════════════════════════════════════════════════
export const notifyRiderEvent = async (userOrId, event, extra = {}) => {
  try {
    if (!isEmailConfigured()) {
      return { success: false, skipped: true, error: "Email not configured" };
    }

    const builder = RIDER_TEMPLATES[event];
    if (!builder) {
      return { success: false, error: `No template for rider event "${event}"` };
    }

    const { default: User } = await import("../models/userModel.js");
    const id = typeof userOrId === "object" ? userOrId._id : userOrId;

    const user = await User.findById(id).select("name email");
    if (!user) return { success: false, error: "User not found" };
    if (!user.email) {
      return { success: false, skipped: true, error: "User has no email" };
    }

    const tpl = builder(user, extra);
    return await sendEmail({
      to: user.email,
      subject: tpl.subject,
      preheader: tpl.preheader,
      body: tpl.body,
      ctaLabel: tpl.ctaLabel,
      ctaUrl: tpl.ctaUrl,
      tags: [{ name: "event", value: `rider_${event}` }],
    });
  } catch (err) {
    console.error("[email] notifyRiderEvent failed:", err);
    return { success: false, error: err.message };
  }
};

// ═══════════════════════════════════════════════════════════
//  High-level: station rider assigned a delivery
//  Usage: notifyStationRiderAssigned(orderId, riderId).catch(console.error);
// ═══════════════════════════════════════════════════════════
export const notifyStationRiderAssigned = async (orderId, riderId) => {
  try {
    if (!isEmailConfigured()) {
      return { success: false, skipped: true, error: "Email not configured" };
    }

    const { default: Order } = await import("../models/orderModel.js");
    const { default: User } = await import("../models/userModel.js");

    const order = await Order.findById(orderId).populate(
      "station",
      "name address"
    );
    if (!order) return { success: false, error: "Order not found" };

    const rider = await User.findById(riderId).select("name email");
    if (!rider?.email) {
      return { success: false, skipped: true, error: "Rider has no email" };
    }

    const tpl = STATION_RIDER_TEMPLATES.assigned(order, order.station);
    return await sendEmail({
      to: rider.email,
      subject: tpl.subject,
      preheader: tpl.preheader,
      body: tpl.body,
      ctaLabel: tpl.ctaLabel,
      ctaUrl: tpl.ctaUrl,
      tags: [{ name: "event", value: "station_rider_assigned" }],
    });
  } catch (err) {
    console.error("[email] notifyStationRiderAssigned failed:", err);
    return { success: false, error: err.message };
  }
};

export default {
  sendEmail,
  sendBulkEmails,
  notifyOrderEvent,
  notifyRiderEvent,
  notifyStationRiderAssigned,
  isEmailConfigured,
};