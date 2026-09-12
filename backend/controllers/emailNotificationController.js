// controllers/emailNotificationController.js
import asyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import {
  isEmailConfigured,
  notifyOrderEvent,
} from "../utils/emailNotify.js";
import { TEMPLATE_REGISTRY } from "../utils/emailTemplates.js";

// ═══════════════════════════════════════════════════════════
//  Scheduler config
// ═══════════════════════════════════════════════════════════
const SWEEP_INTERVAL_MS = 60 * 1000; // every 60 s
const INITIAL_DELAY_MS = 15 * 1000; // first run shortly after boot
const PENDING_THRESHOLD_MIN = 5; // email after 5 min unpaid
const SWEEP_BATCH_LIMIT = 25; // cap per sweep

let sweepInterval = null;
let bootTimer = null;
let isSweeping = false;

const isMainAdmin = (user) => user && user.role === "admin";

// ═══════════════════════════════════════════════════════════
//  Core: pending-order reminder sweep
// ═══════════════════════════════════════════════════════════
const runPendingReminderSweep = async () => {
  if (isSweeping) return; // never overlap
  isSweeping = true;

  try {
    if (!isEmailConfigured()) return;

    const cutoff = new Date(
      Date.now() - PENDING_THRESHOLD_MIN * 60 * 1000
    );

    const staleOrders = await Order.find({
      paid: false,
      status: "pending",
      pendingReminderSentAt: null,
      createdAt: { $lte: cutoff },
    })
      .sort({ createdAt: 1 })
      .limit(SWEEP_BATCH_LIMIT)
      .populate("user", "name email");

    if (staleOrders.length === 0) return;

    for (const order of staleOrders) {
      // No email address → mark as sent so we stop trying
      if (!order.user?.email) {
        order.pendingReminderSentAt = new Date();
        await order.save();
        continue;
      }

      const res = await notifyOrderEvent(order, "pending_reminder");

      // Mark as sent whether it succeeded OR was skipped — we never
      // want to retry forever for an invalid address or config issue.
      if (res.success || res.skipped) {
        order.pendingReminderSentAt = new Date();
        await order.save();
      } else {
        // Real API failure — leave flag null so next sweep retries
        console.warn(
          `[email] pending reminder failed for order ${order._id}:`,
          res.error
        );
      }
    }
  } catch (err) {
    console.error("[email] pending reminder sweep error:", err);
  } finally {
    isSweeping = false;
  }
};

// ═══════════════════════════════════════════════════════════
//  Boot / stop the scheduler
//  ⚠️ These are NOT exported inline — only in the bottom block.
// ═══════════════════════════════════════════════════════════
const startEmailScheduler = () => {
  if (sweepInterval) return;
  if (!isEmailConfigured()) {
    console.log(
      "[email] scheduler NOT started — RESEND_API_KEY is missing. Emails will not be sent."
    );
    return;
  }

  // First run shortly after boot
  bootTimer = setTimeout(() => {
    runPendingReminderSweep().catch(console.error);
    bootTimer = null;
  }, INITIAL_DELAY_MS);

  // Recurring sweep
  sweepInterval = setInterval(() => {
    runPendingReminderSweep().catch(console.error);
  }, SWEEP_INTERVAL_MS);

  console.log(
    `[email] scheduler started (every ${SWEEP_INTERVAL_MS / 1000}s, threshold ${PENDING_THRESHOLD_MIN} min)`
  );
};

const stopEmailScheduler = () => {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
  if (bootTimer) {
    clearTimeout(bootTimer);
    bootTimer = null;
  }
  console.log("[email] scheduler stopped");
};

// ═══════════════════════════════════════════════════════════
//  Admin endpoints (status + debug)
// ═══════════════════════════════════════════════════════════

// @desc    Email service status
// @route   GET /api/email/status
// @access  Private/Main Admin
const getEmailStatus = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can view email status");
  }

  const cutoff = new Date(
    Date.now() - PENDING_THRESHOLD_MIN * 60 * 1000
  );
  const awaitingReminder = await Order.countDocuments({
    paid: false,
    status: "pending",
    pendingReminderSentAt: null,
    createdAt: { $lte: cutoff },
  });

  res.status(200).json({
    configured: isEmailConfigured(),
    schedulerRunning: !!sweepInterval,
    from: process.env.RESEND_FROM || "Not set",
    replyTo: process.env.RESEND_REPLY_TO || "Not set",
    webUrl: process.env.WEB_URL || "Not set",
    config: {
      sweepIntervalSeconds: SWEEP_INTERVAL_MS / 1000,
      pendingThresholdMinutes: PENDING_THRESHOLD_MIN,
      sweepBatchLimit: SWEEP_BATCH_LIMIT,
    },
    pendingOrdersAwaitingReminder: awaitingReminder,
  });
});

// @desc    Force-run the pending reminder sweep (for testing)
// @route   POST /api/email/run-reminders
// @access  Private/Main Admin
const forceRunReminders = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can trigger the sweep");
  }

  if (!isEmailConfigured()) {
    res.status(400);
    throw new Error("Email is not configured (RESEND_API_KEY missing)");
  }

  const overrideMinutes = Number(req.body?.olderThanMinutes ?? 0);
  const cutoff = new Date(Date.now() - overrideMinutes * 60 * 1000);

  const staleOrders = await Order.find({
    paid: false,
    status: "pending",
    pendingReminderSentAt: null,
    createdAt: { $lte: cutoff },
  })
    .sort({ createdAt: 1 })
    .limit(SWEEP_BATCH_LIMIT)
    .populate("user", "name email");

  const results = [];
  for (const order of staleOrders) {
    if (!order.user?.email) {
      order.pendingReminderSentAt = new Date();
      await order.save();
      results.push({ orderId: order._id, status: "skipped_no_email" });
      continue;
    }

    const r = await notifyOrderEvent(order, "pending_reminder");
    if (r.success || r.skipped) {
      order.pendingReminderSentAt = new Date();
      await order.save();
    }
    results.push({
      orderId: order._id,
      email: order.user.email,
      status: r.success ? "sent" : r.skipped ? "skipped" : "failed",
      error: r.error || null,
    });
  }

  res.status(200).json({
    message: `Sweep complete — ${results.filter((r) => r.status === "sent").length} sent`,
    thresholdMinutes: overrideMinutes,
    results,
  });
});

// @desc    List available templates
// @route   GET /api/email/templates
// @access  Private/Main Admin
const getEmailTemplates = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can view templates");
  }
  res.status(200).json(TEMPLATE_REGISTRY);
});

// @desc    Manually trigger an order event email for one order
// @route   POST /api/email/order/:orderId/:event
// @access  Private/Main Admin
const triggerOrderEvent = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can trigger order emails");
  }

  const { orderId, event } = req.params;
  if (!event) {
    res.status(400);
    throw new Error("event is required");
  }

  const result = await notifyOrderEvent(orderId, event);

  if (!result.success) {
    res.status(400);
    throw new Error(result.error || "Failed to send email");
  }

  res.status(200).json({
    message: `"${event}" email sent`,
    id: result.id,
  });
});

// ═══════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════
export {
  startEmailScheduler,
  stopEmailScheduler,
  runPendingReminderSweep,
  getEmailStatus,
  forceRunReminders,
  getEmailTemplates,
  triggerOrderEvent,
};