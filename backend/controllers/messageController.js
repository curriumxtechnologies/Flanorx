// controllers/messageController.js
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import Waitlist from "../models/waitlistModel.js";
import {
  sendBulkMessages,
  sendMessage,
} from "../utils/resendMessage.js";

// ─── Helper: enforce admin ────────────────────────────────
const ensureAdmin = (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403);
    throw new Error("Admin access required");
  }
};

// ─── Helper: build attachments from uploaded files ────────
const buildAttachments = (files = []) =>
  files.map((file) => ({
    filename: file.originalname,
    path: file.path || file.secure_url,
  }));

// ─── Helper: dedupe emails ────────────────────────────────
const dedupeEmails = (list = []) => {
  const set = new Set();
  list.forEach((e) => {
    if (e && typeof e === "string") set.add(e.toLowerCase().trim());
  });
  return Array.from(set);
};

/**
 * Resolve recipients from ANY of these sources:
 *  - `audience`: "waitlist" | "users" | "both"  (with optional filters)
 *  - `userIds`: [ObjectId]                       (registered users)
 *  - `waitlistIds`: [ObjectId]                   (waitlist entries)
 *  - `emails`: ["x@y.com"]                       (raw emails)
 *  - `to`: "x@y.com"                             (single raw email)
 *
 * All sources are merged and de-duplicated.
 */
const resolveRecipients = async ({
  audience,
  userIds,
  waitlistIds,
  emails,
  to,
  filters = {},
}) => {
  const collected = [];

  // ─── Audience-based ─────────────────────────────────
  if (audience && ["waitlist", "users", "both"].includes(audience)) {
    if (audience === "waitlist" || audience === "both") {
      const q = {};
      if (filters.city) q.city = filters.city;
      if (filters.userType) q.userType = filters.userType;
      const entries = await Waitlist.find(q).select("email");
      entries.forEach((e) => collected.push(e.email));
    }

    if (audience === "users" || audience === "both") {
      const q = { isVerified: true };
      if (filters.role) q.role = filters.role;
      const users = await User.find(q).select("email");
      users.forEach((u) => collected.push(u.email));
    }
  }

  // ─── Explicit user IDs ──────────────────────────────
  if (Array.isArray(userIds) && userIds.length > 0) {
    const validIds = userIds.filter((id) => mongoose.isValidObjectId(id));
    if (validIds.length > 0) {
      const users = await User.find({ _id: { $in: validIds } }).select("email");
      users.forEach((u) => collected.push(u.email));
    }
  }

  // ─── Explicit waitlist IDs ──────────────────────────
  if (Array.isArray(waitlistIds) && waitlistIds.length > 0) {
    const validIds = waitlistIds.filter((id) => mongoose.isValidObjectId(id));
    if (validIds.length > 0) {
      const entries = await Waitlist.find({ _id: { $in: validIds } }).select(
        "email"
      );
      entries.forEach((e) => collected.push(e.email));
    }
  }

  // ─── Explicit email list ────────────────────────────
  if (Array.isArray(emails) && emails.length > 0) {
    emails.forEach((e) => collected.push(e));
  }

  // ─── Single recipient ───────────────────────────────
  if (to && typeof to === "string") {
    collected.push(to);
  }

  return dedupeEmails(collected);
};

// ─── Shared validation for message body ───────────────────
const validateMessageBody = (subject, html, text) => {
  if (!subject || !subject.trim()) {
    return "Subject is required";
  }
  if ((!html || !html.trim()) && (!text || !text.trim())) {
    return "Message body (HTML or text) is required";
  }
  return null;
};

// @desc    Preview number of recipients for a target
// @route   GET /api/messages/recipients
// @access  Private/Admin
const previewRecipients = asyncHandler(async (req, res) => {
  ensureAdmin(req, res);

  const { audience, city, userType, role } = req.query;

  const recipients = await resolveRecipients({
    audience,
    filters: { city, userType, role },
  });

  res.status(200).json({
    success: true,
    audience: audience || null,
    count: recipients.length,
  });
});

// @desc    Send message — flexible recipient targeting
// @route   POST /api/messages/send
// @access  Private/Admin
//
// Body (JSON or multipart) accepts ANY combination of:
//   audience:  "waitlist" | "users" | "both"
//   userIds:   ["..."]         (registered users by _id)
//   waitlistIds: ["..."]       (waitlist entries by _id)
//   emails:    ["a@b.com"]     (raw email list)
//   to:        "a@b.com"       (single raw email)
//
// Plus filters when using audience:
//   city, userType, role
//
// Plus message:
//   subject  (required)
//   html     (optional if text present)
//   text     (optional if html present)
//
// Attachments: multipart field "attachments" (up to 5 files)
const sendMessageController = asyncHandler(async (req, res) => {
  ensureAdmin(req, res);

  const {
    audience,
    userIds,
    waitlistIds,
    emails,
    to,
    subject,
    html,
    text,
    city,
    userType,
    role,
  } = req.body;

  // ─── Validate body ─────────────────────────────────────
  const bodyError = validateMessageBody(subject, html, text);
  if (bodyError) {
    res.status(400);
    throw new Error(bodyError);
  }

  // ─── Parse arrays if sent as JSON strings ──────────────
  const parseArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return val.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  // ─── Resolve recipients ────────────────────────────────
  const recipients = await resolveRecipients({
    audience,
    userIds: parseArray(userIds),
    waitlistIds: parseArray(waitlistIds),
    emails: parseArray(emails),
    to,
    filters: { city, userType, role },
  });

  if (recipients.length === 0) {
    res.status(400);
    throw new Error(
      "No recipients found. Provide an audience, userIds, waitlistIds, emails, or to."
    );
  }

  // ─── Attachments ───────────────────────────────────────
  const attachments = buildAttachments(req.files);

  // ─── Send ──────────────────────────────────────────────
  const result = await sendBulkMessages(recipients, {
    subject: subject.trim(),
    html: html?.trim() || undefined,
    text: text?.trim() || undefined,
    attachments,
  });

  res.status(200).json({
    success: true,
    message: `Message dispatched to ${result.success} of ${recipients.length} recipient(s)`,
    total: recipients.length,
    sent: result.success,
    failed: result.failed,
    errors: result.errors,
  });
});

// @desc    Send a single message to one user by ID
// @route   POST /api/messages/user/:userId
// @access  Private/Admin
//
// Convenience endpoint for the "Users" page — pass the user's _id,
// the controller fetches their email and sends.
const sendToUser = asyncHandler(async (req, res) => {
  ensureAdmin(req, res);

  const { userId } = req.params;
  const { subject, html, text } = req.body;

  if (!mongoose.isValidObjectId(userId)) {
    res.status(400);
    throw new Error("Invalid user ID");
  }

  const bodyError = validateMessageBody(subject, html, text);
  if (bodyError) {
    res.status(400);
    throw new Error(bodyError);
  }

  const user = await User.findById(userId).select("email name");
  if (!user || !user.email) {
    res.status(404);
    throw new Error("User not found");
  }

  const attachments = buildAttachments(req.files);

  await sendMessage({
    to: user.email,
    subject: subject.trim(),
    html: html?.trim() || undefined,
    text: text?.trim() || undefined,
    attachments,
  });

  res.status(200).json({
    success: true,
    message: `Message sent to ${user.email}`,
    recipient: { _id: user._id, email: user.email, name: user.name },
  });
});

// @desc    Send a single message to one waitlist entry by ID
// @route   POST /api/messages/waitlist/:entryId
// @access  Private/Admin
const sendToWaitlistEntry = asyncHandler(async (req, res) => {
  ensureAdmin(req, res);

  const { entryId } = req.params;
  const { subject, html, text } = req.body;

  if (!mongoose.isValidObjectId(entryId)) {
    res.status(400);
    throw new Error("Invalid waitlist entry ID");
  }

  const bodyError = validateMessageBody(subject, html, text);
  if (bodyError) {
    res.status(400);
    throw new Error(bodyError);
  }

  const entry = await Waitlist.findById(entryId).select("email fullName");
  if (!entry || !entry.email) {
    res.status(404);
    throw new Error("Waitlist entry not found");
  }

  const attachments = buildAttachments(req.files);

  await sendMessage({
    to: entry.email,
    subject: subject.trim(),
    html: html?.trim() || undefined,
    text: text?.trim() || undefined,
    attachments,
  });

  res.status(200).json({
    success: true,
    message: `Message sent to ${entry.email}`,
    recipient: {
      _id: entry._id,
      email: entry.email,
      name: entry.fullName,
    },
  });
});

// @desc    Send a test message to the admin's own email
// @route   POST /api/messages/test
// @access  Private/Admin
const sendTestMessage = asyncHandler(async (req, res) => {
  ensureAdmin(req, res);

  const { subject, html, text } = req.body;

  const bodyError = validateMessageBody(subject, html, text);
  if (bodyError) {
    res.status(400);
    throw new Error(bodyError);
  }

  const attachments = buildAttachments(req.files);

  await sendMessage({
    to: req.user.email,
    subject: subject.trim(),
    html: html?.trim() || undefined,
    text: text?.trim() || undefined,
    attachments,
  });

  res.status(200).json({
    success: true,
    message: `Test message sent to ${req.user.email}`,
  });
});

export {
  previewRecipients,
  sendMessageController,
  sendToUser,
  sendToWaitlistEntry,
  sendTestMessage,
};