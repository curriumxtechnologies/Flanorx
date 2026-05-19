import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Address Schema for saved addresses
const addressSchema = mongoose.Schema({
  label: { 
    type: String, 
    enum: ["HOME", "WORK", "OTHER"], 
    default: "HOME" 
  },
  address: { 
    type: String, 
    required: true 
  },
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    profilePhoto: { type: String, default: "" },
    addresses: [addressSchema],  // Add this field
    googleId: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    authMethod: { type: String, enum: ["email", "google"], default: "email" }
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;