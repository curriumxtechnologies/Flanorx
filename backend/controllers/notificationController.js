// controllers/notificationController.js
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import DeviceToken from "../models/deviceTokenModel.js";
import User from "../models/userModel.js";
import {
  sendToUser,
  isPushConfigured,
  getPushStatus,
} from "../utils/pushNotify.js";

const isMainAdmin = (user) => user && user.role === "admin";

// ═══════════════════════════════════════════════════════════
//  Client-facing endpoints (any logged-in user)
// ═══════════════════════════════════════════════════════════

// @desc    Register a device token for the current user
// @route   POST /api/notifications/token
// @access  Private
// @body    { token, platform?, deviceLabel?, userAgent? }
const registerDeviceToken = asyncHandler(async (req, res) => {
  const { token, platform, deviceLabel, userAgent } = req.body || {};

  if (!token || typeof token !== "string" || token.length < 10) {
    res.status(400);
    throw new Error("A valid FCM token is required");
  }

  const normalizedPlatform = ["web", "android", "ios"].includes(platform)
    ? platform
    : "unknown";

  // Upsert by token. If the token already exists but belongs to a
  // different user (rare — device reassignment), we reassign it.
  const existing = await DeviceToken.findOne({ token });

  if (existing) {
    existing.user = req.user._id;
    existing.platform = normalizedPlatform;
    existing.deviceLabel = deviceLabel || existing.deviceLabel;
    existing.userAgent = userAgent || existing.userAgent;
    existing.isValid = true;
    existing.invalidatedAt = null;
    existing.invalidReason = "";
    await existing.save();

    return res.status(200).json({
      message: "Device token updated",
      tokenId: existing._id,
    });
  }

  const created = await DeviceToken.create({
    user: req.user._id,
    token,
    platform: normalizedPlatform,
    deviceLabel: deviceLabel || "",
    userAgent: userAgent || "",
    isValid: true,
  });

  res.status(201).json({
    message: "Device token registered",
    tokenId: created._id,
  });
});

// @desc    Unregister the current device's token
// @route   DELETE /api/notifications/token
// @access  Private
// @body    { token }
const unregisterDeviceToken = asyncHandler(async (req, res) => {
  const { token } = req.body || {};

  if (!token) {
    res.status(400);
    throw new Error("Token is required");
  }

  // Only allow deleting a token that belongs to the caller
  const deleted = await DeviceToken.findOneAndDelete({
    token,
    user: req.user._id,
  });

  if (!deleted) {
    // Idempotent — return success even if it was already gone
    return res.status(200).json({ message: "Token not found (already removed)" });
  }

  res.status(200).json({ message: "Token removed" });
});

// @desc    List the current user's registered devices
// @route   GET /api/notifications/devices
// @access  Private
const getMyDevices = asyncHandler(async (req, res) => {
  const devices = await DeviceToken.find({
    user: req.user._id,
    isValid: true,
  })
    .select("platform deviceLabel userAgent lastUsedAt createdAt")
    .sort({ createdAt: -1 });

  res.status(200).json(devices);
});

// @desc    Send a test push to the current user (all their devices)
// @route   POST /api/notifications/test
// @access  Private
const sendTestPush = asyncHandler(async (req, res) => {
  if (!isPushConfigured()) {
    res.status(400);
    throw new Error("Push notifications are not configured on the server");
  }

  const result = await sendToUser(req.user._id, {
    title: "Flanorx test notification",
    body: "If you can see this, push notifications are working.",
    link: "/dashboard",
    data: { type: "test" },
  });

  if (result.successCount === 0) {
    res.status(400);
    throw new Error(
      "No valid devices registered. Make sure the app has permission and has registered a token."
    );
  }

  res.status(200).json({
    message: `Test sent to ${result.successCount} device${
      result.successCount > 1 ? "s" : ""
    }`,
    result,
  });
});

// ═══════════════════════════════════════════════════════════
//  Admin endpoints
// ═══════════════════════════════════════════════════════════

// @desc    Push service status
// @route   GET /api/notifications/status
// @access  Private/Main Admin
const getNotificationStatus = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can view push status");
  }

  const [total, valid, invalid, byPlatform] = await Promise.all([
    DeviceToken.countDocuments(),
    DeviceToken.countDocuments({ isValid: true }),
    DeviceToken.countDocuments({ isValid: false }),
    DeviceToken.aggregate([
      { $match: { isValid: true } },
      { $group: { _id: "$platform", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  res.status(200).json({
    firebase: getPushStatus(),
    tokens: {
      total,
      valid,
      invalid,
      byPlatform: byPlatform.map((b) => ({
        platform: b._id || "unknown",
        count: b.count,
      })),
    },
  });
});

// @desc    Send a push to a single user (admin)
// @route   POST /api/notifications/send/:userId
// @access  Private/Main Admin
// @body    { title, body, link?, data? }
const sendPushToUser = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can send pushes");
  }

  const { userId } = req.params;
  const { title, body, link, data } = req.body || {};

  if (!title || !body) {
    res.status(400);
    throw new Error("title and body are required");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400);
    throw new Error("Invalid userId");
  }

  const user = await User.findById(userId).select("name email");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const result = await sendToUser(userId, {
    title,
    body,
    link,
    data,
  });

  res.status(200).json({
    message: `Sent to ${result.successCount} device${
      result.successCount === 1 ? "" : "s"
    }`,
    result,
  });
});

// @desc    Send a push to all users with role / riderType filters
// @route   POST /api/notifications/broadcast
// @access  Private/Main Admin
// @body    { title, body, link?, filters?: { role, riderType, station }, limit? }
const broadcastPush = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can broadcast pushes");
  }

  const { title, body, link, filters = {}, limit = 500 } = req.body || {};

  if (!title || !body) {
    res.status(400);
    throw new Error("title and body are required");
  }

  // Resolve user IDs that match the filters
  const userFilter = { isVerified: true };
  if (filters.role) userFilter.role = filters.role;
  if (filters.riderType) userFilter.riderType = filters.riderType;
  if (filters.station) userFilter.station = filters.station;

  const users = await User.find(userFilter)
    .select("_id")
    .limit(Math.min(Number(limit) || 500, 2000));

  if (users.length === 0) {
    res.status(400);
    throw new Error("No users matched the filters");
  }

  const userIds = users.map((u) => u._id);
  const tokens = await DeviceToken.find({
    user: { $in: userIds },
    isValid: true,
  }).select("token");

  if (tokens.length === 0) {
    res.status(400);
    throw new Error("No valid device tokens for these users");
  }

  // Send in batches of 500 (FCM multicast limit)
  const { sendToTokens } = await import("../utils/pushNotify.js");

  const allTokens = tokens.map((t) => t.token);
  const BATCH = 500;
  let successCount = 0;
  let failureCount = 0;
  const invalidTokens = [];

  for (let i = 0; i < allTokens.length; i += BATCH) {
    const slice = allTokens.slice(i, i + BATCH);
    const r = await sendToTokens(slice, {
      title,
      body,
      link,
      data: { type: "broadcast" },
    });
    successCount += r.successCount;
    failureCount += r.failureCount;
    invalidTokens.push(...r.invalidTokens);
  }

  res.status(200).json({
    message: `Broadcast sent — ${successCount} delivered, ${failureCount} failed`,
    summary: {
      usersTargeted: users.length,
      tokensTargeted: allTokens.length,
      successCount,
      failureCount,
      invalidated: invalidTokens.length,
    },
  });
});

// @desc    Clean up invalid tokens
// @route   DELETE /api/notifications/invalid
// @access  Private/Main Admin
const purgeInvalidTokens = asyncHandler(async (req, res) => {
  if (!isMainAdmin(req.user)) {
    res.status(403);
    throw new Error("Only the main admin can purge tokens");
  }

  // Delete tokens that have been marked invalid for 30+ days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await DeviceToken.deleteMany({
    isValid: false,
    invalidatedAt: { $lte: cutoff },
  });

  res.status(200).json({
    message: `Purged ${result.deletedCount} stale token${
      result.deletedCount === 1 ? "" : "s"
    }`,
  });
});

export {
  registerDeviceToken,
  unregisterDeviceToken,
  getMyDevices,
  sendTestPush,
  getNotificationStatus,
  sendPushToUser,
  broadcastPush,
  purgeInvalidTokens,
};