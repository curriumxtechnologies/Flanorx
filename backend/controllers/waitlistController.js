// controllers/waitlistController.js
import asyncHandler from "express-async-handler";
import Waitlist from "../models/waitlistModel.js";

// @desc    Join the waitlist
// @route   POST /api/waitlist
// @access  Public
const joinWaitlist = asyncHandler(async (req, res) => {
  const { fullName, phone, email, city, userType, needs } = req.body;

  // Validate required fields
  if (!fullName || !phone || !email || !city || !userType) {
    res.status(400);
    throw new Error("Please fill in all required fields: name, phone, email, city, and user type");
  }

  // Check if email already exists
  const existingEntry = await Waitlist.findOne({ email: email.toLowerCase().trim() });

  if (existingEntry) {
    res.status(409);
    throw new Error("This email is already on the waitlist. We'll notify you when we launch!");
  }

  // Create waitlist entry
  const waitlistEntry = await Waitlist.create({
    fullName: fullName.trim(),
    phone: phone.trim(),
    email: email.toLowerCase().trim(),
    city,
    userType,
    needs: needs || [],
  });

  if (waitlistEntry) {
    res.status(201).json({
      success: true,
      message: "Successfully joined the waitlist! We'll notify you when Flanorx launches in your city.",
      data: {
        id: waitlistEntry._id,
        fullName: waitlistEntry.fullName,
        email: waitlistEntry.email,
        city: waitlistEntry.city,
        userType: waitlistEntry.userType,
      },
    });
  } else {
    res.status(400);
    throw new Error("Failed to join waitlist. Please try again.");
  }
});

// @desc    Get all waitlist entries (Admin only)
// @route   GET /api/waitlist
// @access  Private/Admin
const getWaitlistEntries = asyncHandler(async (req, res) => {
  const entries = await Waitlist.find({}).sort({ createdAt: -1 });
  res.status(200).json(entries);
});

// @desc    Get waitlist stats (Admin only)
// @route   GET /api/waitlist/stats
// @access  Private/Admin
const getWaitlistStats = asyncHandler(async (req, res) => {
  const totalEntries = await Waitlist.countDocuments();
  
  const cityBreakdown = await Waitlist.aggregate([
    { $group: { _id: "$city", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const userTypeBreakdown = await Waitlist.aggregate([
    { $group: { _id: "$userType", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const needsBreakdown = await Waitlist.aggregate([
    { $unwind: "$needs" },
    { $group: { _id: "$needs", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  res.status(200).json({
    totalEntries,
    cityBreakdown,
    userTypeBreakdown,
    needsBreakdown,
  });
});

export { joinWaitlist, getWaitlistEntries, getWaitlistStats };