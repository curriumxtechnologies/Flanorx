// models/gasSubscriptionModel.js
import mongoose from "mongoose";

const gasSubscriptionSchema = new mongoose.Schema(
  {
    // ─── Owner ───────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one subscription record per user
      index: true,
    },

    // ─── Plan ────────────────────────────────────────────────
    cylinderSize: {
      type: String,
      enum: ["3kg", "6kg", "12kg"],
      default: null,
    },

    status: {
      type: String,
      enum: ["none", "pending", "active", "expired", "cancelled"],
      default: "none",
    },

    // ─── Lifecycle dates ─────────────────────────────────────
    startDate: { type: Date, default: null },
    nextBillingDate: { type: Date, default: null },
    gracePeriodEnd: { type: Date, default: null },

    // ─── Reference to the payment that last activated/renewed it ──
    lastPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GasPayment",
      default: null,
    },
  },
  { timestamps: true }
);

const GasSubscription = mongoose.model("GasSubscription", gasSubscriptionSchema);

export default GasSubscription;