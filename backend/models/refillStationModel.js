// models/refillStationModel.js
//
// A third-party refill station. Distinct from Flanorx-owned `Station`:
// this entity is a small independent business that has been approved
// to serve customers on the platform.
//
// Lifecycle:
//   pending → (approved | rejected)
//   approved → banned (via auto-ban or admin)  → approved (after unbanned)

import mongoose from "mongoose";

const CYLINDER_SIZES = ["3kg", "6kg", "12kg", "25kg", "50kg"];

const refillStationSchema = new mongoose.Schema(
  {
    // ── Ownership ─────────────────────────────────────────
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Business identity ─────────────────────────────────
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      maxlength: 120,
    },
    contactPerson: {
      type: String,
      required: [true, "Contact person is required"],
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      maxlength: 40,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 200,
      default: "",
    },

    // ── Location ─────────────────────────────────────────
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      maxlength: 400,
    },
    coordinates: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
    },
    operatingHours: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },

    // ── Product catalogue ─────────────────────────────────
    supportedCylinderSizes: {
      type: [{ type: String, enum: CYLINDER_SIZES }],
      default: [],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "At least one supported cylinder size is required",
      },
    },
    // Dynamic map — keys match supportedCylinderSizes, values in NGN.
    // Plain object (Mixed) so the controller can spread/replace freely.
    cylinderPrices: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── Documents (Cloudinary URLs) ───────────────────────
    licenseUrl: {
      type: String,
      default: null,
    },
    licenseUploadedAt: { type: Date, default: null },
    // Stamped when an admin reviews and approves the license document.
    licenseVerifiedAt: { type: Date, default: null },
    shopPhotos: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: "Maximum of 10 shop photos allowed",
      },
    },
    cylinderPhotos: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: "Maximum of 10 cylinder photos allowed",
      },
    },
    logoUrl: { type: String, default: "" },

    // ── Delivery pricing ──────────────────────────────────
    // Multiplied by the haversine distance in km to compute deliveryFee.
    deliveryFeePerKm: {
      type: Number,
      default: 100,
      min: 0,
    },

    // ── Team ──────────────────────────────────────────────
    // Populated by addRefillTeamMember. Owner's own id is NOT stored here.
    teamMembers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    // Subset of teamMembers with refillStationRole === "rider".
    riders: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    // ── Review state ─────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "banned"],
      default: "pending",
      required: true,
    },
    rejectionReason: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ── Ban state ─────────────────────────────────────────
    banReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    unbannedAt: { type: Date, default: null },

    // ── Terms ─────────────────────────────────────────────
    termsAcceptedAt: { type: Date, default: null },

    // ── Commission ────────────────────────────────────────
    // null = use platform default (PlatformSetting.commissionRate)
    commissionRateOverride: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    totalCommissionOwed: { type: Number, default: 0, min: 0 },
    totalCommissionPaid: { type: Number, default: 0, min: 0 },

    // ── Ratings (public storefront) ──────────────────────
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────
// One refill station per user (the controller always updates `existing`).
refillStationSchema.index({ owner: 1 }, { unique: true });

// Admin lists (sort by newest first).
refillStationSchema.index({ status: 1, createdAt: -1 });

// Nearby search + admin text search.
refillStationSchema.index({ status: 1, "coordinates.lat": 1, "coordinates.lng": 1 });
refillStationSchema.index({ status: 1, businessName: 1 });

const RefillStation = mongoose.model("RefillStation", refillStationSchema);
export default RefillStation;