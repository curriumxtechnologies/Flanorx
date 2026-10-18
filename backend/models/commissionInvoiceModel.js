// models/commissionInvoiceModel.js
//
// A monthly commission invoice generated for a refill station from the
// completed+uninvoiced orders in that calendar month.
//
// Status machine:
//   pending  → overdue  → paid   (or waived)
//   pending  → paid      (paid early)
//   pending  → waived
//   overdue  → paid / waived

import mongoose from "mongoose";

const commissionInvoiceSchema = new mongoose.Schema(
  {
    station: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefillStation",
      required: true,
    },

    // ── Billing period ────────────────────────────────────
    period: {
      month: { type: Number, required: true, min: 1, max: 12 },
      year: { type: Number, required: true, min: 2000, max: 2100 },
    },

    // ── Snapshot of what's being billed ───────────────────
    orderCount: { type: Number, default: 0, min: 0 },
    totalSales: { type: Number, default: 0, min: 0 },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    commissionOwed: { type: Number, required: true, min: 0 },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "RefillOrder" }],

    // ── Status ────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "overdue", "paid", "waived"],
      default: "pending",
      required: true,
    },

    // ── Deadlines ─────────────────────────────────────────
    dueDate: { type: Date, required: true },
    // dueDate + PlatformSetting.graceDays (snapshotted at generation time)
    graceEndsAt: { type: Date, required: true },

    // ── Payment ───────────────────────────────────────────
    paidAt: { type: Date, default: null },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentReference: { type: String, default: null },
    markedPaidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: { type: String, default: "" },

    // ── Waiver ────────────────────────────────────────────
    waivedAt: { type: Date, default: null },
    waivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    waiverReason: { type: String, default: null },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────
// One invoice per station per (month, year). Blocks silent duplicates.
// If a collision ever fires, it means the invoicing logic was run out of
// order — safer to error than to double-charge the station.
commissionInvoiceSchema.index(
  { station: 1, "period.year": 1, "period.month": 1 },
  { unique: true }
);

// Station dashboard: "open invoices" + aging cron.
commissionInvoiceSchema.index({ station: 1, status: 1, dueDate: 1 });
commissionInvoiceSchema.index({ status: 1, graceEndsAt: 1 });

// Admin lists by period.
commissionInvoiceSchema.index({ "period.year": 1, "period.month": 1 });

const CommissionInvoice = mongoose.model(
  "CommissionInvoice",
  commissionInvoiceSchema
);
export default CommissionInvoice;