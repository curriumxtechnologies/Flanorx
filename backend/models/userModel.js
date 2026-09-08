import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Address sub‑document
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
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    profilePhoto: { type: String, default: "" },
    addresses: [addressSchema],

    // Google OAuth
    googleId: { type: String, default: null },

    // OTP for email verification
    otp: { type: String },
    otpExpires: { type: Date },

    // OTP for password reset
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },

    isVerified: { type: Boolean, default: false },
    authMethod: { type: String, enum: ["email", "google"], default: "email" },

    // 🆕 Role-based access
    role: {
      type: String,
      enum: ["user", "admin", "rider"],
      default: "user",
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;