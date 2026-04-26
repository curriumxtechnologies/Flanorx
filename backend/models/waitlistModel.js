// models/waitlistModel.js
import mongoose from "mongoose";

const waitlistSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      enum: ["Lagos", "Abuja", "Port Harcourt", "Other"],
    },
    userType: {
      type: String,
      required: [true, "User type is required"],
      enum: ["Customer", "Business / Company", "Rider", "Fuel Station / Partner"],
    },
    needs: {
      type: [String],
      enum: ["generator", "vehicle", "business", "fleet"],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "contacted", "converted", "declined"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate emails
waitlistSchema.index({ email: 1 }, { unique: true });

const Waitlist = mongoose.model("Waitlist", waitlistSchema);
export default Waitlist;