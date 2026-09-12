// models/deviceTokenModel.js
import mongoose from "mongoose";

const deviceTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The FCM registration token
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Best-effort platform info
    platform: {
      type: String,
      enum: ["web", "android", "ios", "unknown"],
      default: "unknown",
    },

    // Best-effort device info (helps users see "iPhone", "Chrome on Windows", etc.)
    deviceLabel: { type: String, default: "" },
    userAgent: { type: String, default: "" },

    // Is this token still valid? FCM tells us when it isn't.
    isValid: { type: Boolean, default: true, index: true },

    // When we last got a successful send to this token
    lastUsedAt: { type: Date, default: null },

    // When FCM told us the token was stale
    invalidatedAt: { type: Date, default: null },
    invalidReason: { type: String, default: "" },
  },
  { timestamps: true }
);

// A user's tokens, sorted by most recent
deviceTokenSchema.index({ user: 1, createdAt: -1 });
deviceTokenSchema.index({ user: 1, isValid: 1 });

const DeviceToken = mongoose.model("DeviceToken", deviceTokenSchema);

export default DeviceToken;