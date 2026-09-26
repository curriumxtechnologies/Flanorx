// models/userModel.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ─── Address sub‑document ─────────────────────────────────────
const addressSchema = mongoose.Schema(
  {
    label: {
      type: String,
      enum: ["HOME", "WORK", "OTHER"],
      default: "HOME",
    },
    address: {
      type: String,
      required: true,
    },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ─── Terms / Privacy acceptance sub‑document ─────────────────
// One entry per document type. Stores exactly which version was
// accepted, when, and from where — this is the audit trail.
const termsAcceptanceSchema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["terms", "privacy"],
      required: true,
    },
    version: { type: String, required: true },
    acceptedAt: { type: Date, default: Date.now },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { _id: false }
);

const userSchema = mongoose.Schema(
  {
    // ─── Basic info ──────────────────────────────────────────
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    profilePhoto: { type: String, default: "" },
    addresses: [addressSchema],

    // ─── Google OAuth ─────────────────────────────────────────
    googleId: { type: String, default: null },

    // ─── OTP for email verification ──────────────────────────
    otp: { type: String },
    otpExpires: { type: Date },

    // ─── OTP for password reset ──────────────────────────────
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },

    // ─── Account status ──────────────────────────────────────
    isVerified: { type: Boolean, default: false },
    authMethod: { type: String, enum: ["email", "google"], default: "email" },

    // ─── Role‑based access ──────────────────────────────────
    role: {
      type: String,
      enum: ["user", "admin", "rider"],
      default: "user",
    },

    // ⭐ NEW: rider sub-type. Only meaningful when role === "rider".
    //   "fuel"    → sees the open fuel delivery pool, accepts orders
    //   "station" → belongs to a station, receives gas assignments from it
    riderType: {
      type: String,
      enum: ["fuel", "station", null],
      default: null,
      index: true,
    },

    // ⭐ NEW: station membership.
    //   station     → the Station this user belongs to (if any)
    //   stationRole → "admin" | "staff" | "rider" (or null if not a member)
    station: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      default: null,
      index: true,
    },
    stationRole: {
      type: String,
      enum: ["admin", "staff", "rider", null],
      default: null,
      index: true,
    },

    // ─── Rider‑specific fields ──────────────────────────────
    nin: { type: String, default: null },
    fuelingStation: { type: String, default: null },
    proofOfAddress: { type: String, default: null },
    ninPicture: { type: String, default: null },
    bankAccountNumber: { type: String, default: null },
    bankName: { type: String, default: null },
    bankCode: { type: String, default: null },
    accountName: { type: String, default: null },

    verificationStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    rejectionReason: { type: String, default: null },
    verificationSubmittedAt: { type: Date, default: null },
    verificationReviewedAt: { type: Date, default: null },
    verificationReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ─── Rider wallet / earnings ────────────────────────────
    walletBalance: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0, min: 0 },
    completedDeliveries: { type: Number, default: 0, min: 0 },

    // ─── Gas Subscription ────────────────────────────────────
    gasSubscription: {
      cylinderSize: { type: String, enum: ["3kg", "6kg", "12kg"], default: null },
      status: {
        type: String,
        enum: ["active", "expired", "cancelled", "pending"],
        default: null,
      },
      startDate: { type: Date, default: null },
      nextBillingDate: { type: Date, default: null },
      gracePeriodEnd: { type: Date, default: null },
      createdAt: { type: Date, default: null },
      updatedAt: { type: Date, default: null },
    },

    // ─── Terms / Privacy acceptance ─────────────────────────
    // True only when the user has accepted EVERY currently active
    // document (terms + privacy) at its CURRENT version.
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: { type: Date, default: null },

    // While this date is in the future, the frontend modal may be
    // dismissed. Once it passes, acceptance is mandatory.
    // Set whenever an admin publishes a new version of any document.
    termsGraceEndsAt: { type: Date, default: null },

    // Audit trail: one entry per accepted document per version.
    termsAcceptances: {
      type: [termsAcceptanceSchema],
      default: [],
    },

    // ─── Auto‑delete unverified accounts after 6 minutes ───
    deleteAfter: {
      type: Date,
      default: null,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

// ─── Hash password before saving ─────────────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ─── Compare entered password with stored hash ──────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ─── Indexes ────────────────────────────────────────────────
userSchema.index({ role: 1, riderType: 1 });
userSchema.index({ station: 1, stationRole: 1 });
// Cheap "who still hasn't accepted?" queries for the admin side
// and the terms publish job.
userSchema.index({ termsAccepted: 1, termsGraceEndsAt: 1 });

const User = mongoose.model("User", userSchema);
export default User;