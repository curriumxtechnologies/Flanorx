// models/stationModel.js
import mongoose from "mongoose";

const CYLINDER_SIZES = ["3kg", "6kg", "12kg"];

const stationSchema = new mongoose.Schema(
  {
    // ─── Identity ────────────────────────────────────────────
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    operatingHours: { type: String, default: "", trim: true },

    // ─── Status ──────────────────────────────────────────────
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },

    // ─── Inventory (count of full cylinders per size) ────────
    stock: {
      "3kg": { type: Number, default: 0, min: 0 },
      "6kg": { type: Number, default: 0, min: 0 },
      "12kg": { type: Number, default: 0, min: 0 },
    },

    // ─── People ──────────────────────────────────────────────
    admin: {
      // The station admin (a User with stationRole = "admin")
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    teamMembers: [
      {
        // Staff who can log in and manage the station (User.stationRole = "staff")
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    riders: [
      {
        // Station riders (User.role = "rider", riderType = "station")
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ─── Audit ───────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // main admin who created the station
    },
  },
  { timestamps: true }
);

// ─── Virtual: is low on any cylinder size ───────────────────
stationSchema.virtual("lowStockSizes").get(function () {
  const LOW = 5;
  return CYLINDER_SIZES.filter((size) => (this.stock?.[size] || 0) < LOW);
});

// ─── Indexes ────────────────────────────────────────────────
stationSchema.index({ "coordinates.lat": 1, "coordinates.lng": 1 });
stationSchema.index({ admin: 1 });
stationSchema.index({ status: 1, createdAt: -1 });

const Station = mongoose.model("Station", stationSchema);

export default Station;