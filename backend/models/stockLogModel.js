// models/stockLogModel.js
import mongoose from "mongoose";

const stockLogSchema = new mongoose.Schema(
  {
    // ─── Which station ───────────────────────────────────────
    station: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true,
      index: true,
    },

    // ─── What changed ────────────────────────────────────────
    cylinderSize: {
      type: String,
      enum: ["3kg", "6kg", "12kg"],
      required: true,
    },
    delta: {
      // positive = added (restock/adjust up), negative = removed (fulfilled/adjust down)
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: ["restock", "order_fulfilled", "adjustment"],
      required: true,
      index: true,
    },

    // ─── Related order (only for order_fulfilled) ────────────
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    // ─── Who did it ──────────────────────────────────────────
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: { type: String, default: "", trim: true, maxlength: 500 },

    // ─── Snapshots for audit clarity ─────────────────────────
    stockBefore: { type: Number, required: true, min: 0 },
    stockAfter: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// ─── Indexes ────────────────────────────────────────────────
stockLogSchema.index({ station: 1, createdAt: -1 });
stockLogSchema.index({ station: 1, cylinderSize: 1, createdAt: -1 });
stockLogSchema.index({ order: 1 });

const StockLog = mongoose.model("StockLog", stockLogSchema);

export default StockLog;