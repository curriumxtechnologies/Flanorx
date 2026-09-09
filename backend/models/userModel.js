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

    // ─── Rider‑specific fields ──────────────────────────────
    nin: { type: String, default: null },
    fuelingStation: { type: String, default: null },
    proofOfAddress: { type: String, default: null },
    ninPicture: { type: String, default: null },
    bankAccountNumber: { type: String, default: null },
    bankName: { type: String, default: null },
    bankCode: { type: String, default: null }, // ✅ Paystack bank code for commission payouts
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

    // ─── Gas Subscription ────────────────────────────────────
    gasSubscription: {
      cylinderSize: { type: String, enum: ["3kg", "6kg", "12kg"], default: null },
      status: { type: String, enum: ["active", "expired", "cancelled", "pending"], default: null },
      startDate: { type: Date, default: null },
      nextBillingDate: { type: Date, default: null },
      gracePeriodEnd: { type: Date, default: null },
      createdAt: { type: Date, default: null },
      updatedAt: { type: Date, default: null },
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

const User = mongoose.model("User", userSchema);
export default User;