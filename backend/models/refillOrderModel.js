// models/refillOrderModel.js
//
// A customer order placed against a third-party refill station.
// Flow: pending → paid → accepted → ready → (delivered) → completed
// Side paths: cancelled (customer), rejected (station), disputed (admin)

import mongoose from "mongoose";

const CYLINDER_SIZES = ["3kg", "6kg", "12kg", "25kg", "50kg"];

const refillOrderSchema = new mongoose.Schema(
  {
    // ── Parties ───────────────────────────────────────────
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    station: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefillStation",
      required: true,
    },

    // ── Line item ─────────────────────────────────────────
    cylinderSize: {
      type: String,
      enum: CYLINDER_SIZES,
      required: true,
    },
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    refillType: {
      type: String,
      enum: ["refill", "swap", "new"],
      default: "refill",
    },

    // ── Fulfilment ────────────────────────────────────────
    fulfillmentType: {
      type: String,
      enum: ["pickup", "delivery"],
      required: true,
    },
    deliveryAddress: { type: String, default: "" },
    deliveryCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    // Free-form — controller doesn't interpret these, only stores them.
    scheduledDate: { type: String, default: null },
    scheduledTime: { type: String, default: null },

    // ── Pricing ───────────────────────────────────────────
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    // ── Status ────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        "pending",   // created, awaiting Paystack
        "paid",      // paid, awaiting station accept/reject
        "accepted",  // station is working on it
        "ready",     // pickup ready, or delivery out
        "delivered", // delivery handed off
        "completed", // finalised — commission accrued
        "cancelled",
        "rejected",
        "disputed",
      ],
      default: "pending",
      required: true,
    },
    deliveryStatus: {
      type: String,
      enum: ["pending", "accepted", "in_transit", "delivered", "confirmed"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    paymentReference: { type: String, default: null },
    paymentMethod: { type: String, default: "card" },
    paidAt: { type: Date, default: null },

    notes: { type: String, default: "", maxlength: 1000 },
    // Reserved for future QR-confirmation flow (mirrors Order.verificationToken).
    verificationToken: { type: String, default: null },

    // ── Accept / reject trail ─────────────────────────────
    acceptedAt: { type: Date, default: null },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: { type: Date, default: null },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: { type: String, default: null },

    // ── Rider assignment (delivery only) ──────────────────
    assignedRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    riderAssignedAt: { type: Date, default: null },
    riderAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ── Timeline ──────────────────────────────────────────
    readyAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completionNote: { type: String, default: "" },
    customerConfirmedAt: { type: Date, default: null },

    // ── Cancellation ──────────────────────────────────────
    cancelledAt: { type: Date, default: null },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ── Commission (set on finalisation) ──────────────────
    commissionRate: { type: Number, default: 0, min: 0, max: 100 },
    commissionAmount: { type: Number, default: 0, min: 0 },
    commissionRecorded: { type: Boolean, default: false },
    commissionInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommissionInvoice",
      default: null,
    },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────
// Station order list.
refillOrderSchema.index({ station: 1, status: 1, createdAt: -1 });
// Invoice aggregation (completedAt range per station).
refillOrderSchema.index({ station: 1, status: 1, completedAt: -1 });
// Customer order history.
refillOrderSchema.index({ customer: 1, createdAt: -1 });
// Platform-wide stats.
refillOrderSchema.index({ status: 1, completedAt: -1 });
// Admin filter by station only.
refillOrderSchema.index({ station: 1, createdAt: -1 });

const RefillOrder = mongoose.model("RefillOrder", refillOrderSchema);
export default RefillOrder;