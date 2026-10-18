// models/platformSettingModel.js
//
// Generic key-value store for platform-wide settings.
// Currently only the "refill" key exists, holding:
//   { commissionRate: 5,  graceDays: 10 }
// Both are editable from the admin dashboard via:
//   PUT /api/admin/refill/settings  { commissionRate, graceDays }

import mongoose from "mongoose";

const REFILL_KEY = "refill";

const platformSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // ── Refill-related (only meaningful when key === "refill") ─
    commissionRate: {
      type: Number,
      default: 5,
      min: 0,
      max: 100,
    },
    graceDays: {
      type: Number,
      default: 10,
      min: 0,
      max: 90,
    },

    // ── Audit ─────────────────────────────────────────────
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Convenience accessor used by the controller.
platformSettingSchema.statics.getRefill = async function () {
  return (
    (await this.findOne({ key: REFILL_KEY })) ||
    (await this.create({ key: REFILL_KEY }))
  );
};

const PlatformSetting = mongoose.model(
  "PlatformSetting",
  platformSettingSchema
);
export { REFILL_KEY };
export default PlatformSetting;