// models/termsModel.js
import mongoose from "mongoose";

const termsHistorySchema = new mongoose.Schema(
  {
    version: String,
    title: String,
    content: String,
    updateNotice: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const termsSchema = new mongoose.Schema(
  {
    // "terms" = Terms of Service, "privacy" = Privacy Policy.
    // One document per type — add to the enum if you add more (e.g. "cookies").
    type: {
      type: String,
      enum: ["terms", "privacy"],
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    // Markdown / HTML / plain text — whatever the frontend renders.
    content: { type: String, required: true },
    version: { type: String, required: true, default: "1.0.0" },
    // The "we've updated our Privacy Policy" line shown in the modal.
    updateNotice: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
    effectiveFrom: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Every previous version, kept for legal audit.
    history: { type: [termsHistorySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Terms", termsSchema);