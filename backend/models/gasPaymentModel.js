// models/gasPaymentModel.js
import mongoose from "mongoose";

const gasPaymentSchema = new mongoose.Schema(
  {
    // ─── Who paid ────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ─── Which subscription this payment relates to ─────────
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GasSubscription",
      default: null,
    },

    // ─── What kind of payment this was ───────────────────────
    type: {
      type: String,
      enum: [
        "subscription_first",       // subscribe + gas order (new)
        "subscription_renew",       // renew existing subscription
        "subscription_upgrade",     // pay the difference to upgrade cylinder size
        "subscription_cylinder_only", // cylinder only, no gas order
      ],
      required: true,
    },

    // ─── What was purchased ──────────────────────────────────
    cylinderSize: {
      type: String,
      enum: ["3kg", "6kg", "12kg"],
      default: null,
    },
    quantityKg: { type: Number, default: 0, min: 0 },

    // ─── Money ────────────────────────────────────────────────
    amount: { type: Number, required: true, min: 0 },

    // ─── Paystack ─────────────────────────────────────────────
    reference: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "card" },
    paidAt: { type: Date, default: null },

    // ─── Link to the resulting Order, when one is created ────
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  { timestamps: true }
);

gasPaymentSchema.index({ user: 1, createdAt: -1 });

const GasPayment = mongoose.model("GasPayment", gasPaymentSchema);

export default GasPayment;