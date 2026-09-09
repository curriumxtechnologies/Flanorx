// controllers/riderController.js
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";

// ─── Helper to get uploaded file URL from multer ──────────────
const getFileUrl = (files, fieldName) => {
  const file = files?.[fieldName]?.[0];
  return file?.path || file?.secure_url || null;
};

// ─── Apply to become a rider ──────────────────────────────────
// @desc    User applies to become a rider (submits verification)
// @route   POST /api/users/rider/apply
// @access  Private (user only)
const applyForRider = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const {
    nin,
    fuelingStation,
    bankAccountNumber,
    bankName,
    accountName,
    phone,
  } = req.body;

  // Required fields
  if (!nin || !fuelingStation) {
    res.status(400);
    throw new Error("NIN and fueling station are required");
  }

  // Validate NIN (11 digits)
  const cleanedNin = String(nin).replace(/\s+/g, "");
  if (!/^\d{11}$/.test(cleanedNin)) {
    res.status(400);
    throw new Error("NIN must be 11 digits");
  }

  // Check if NIN already used by another user
  const existingNin = await User.findOne({
    nin: cleanedNin,
    _id: { $ne: userId },
  });
  if (existingNin) {
    res.status(409);
    throw new Error("This NIN is already registered");
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // If already a rider or application pending, prevent re‑submission
  if (user.role === "rider") {
    res.status(400);
    throw new Error("You are already a verified rider");
  }
  if (user.verificationStatus === "pending") {
    res.status(400);
    throw new Error("Your application is already pending review");
  }

  // Get uploaded files (Cloudinary URLs)
  const profilePicture = getFileUrl(req.files, "profilePicture");
  const ninPicture = getFileUrl(req.files, "ninPicture");
  const proofOfAddress = getFileUrl(req.files, "proofOfAddress");

  if (!proofOfAddress) {
    res.status(400);
    throw new Error("Proof of address image is required");
  }

  // Save verification details
  user.nin = cleanedNin;
  user.fuelingStation = fuelingStation;
  user.proofOfAddress = proofOfAddress;
  if (profilePicture) user.profilePicture = profilePicture;
  if (ninPicture) user.ninPicture = ninPicture;
  if (bankAccountNumber) user.bankAccountNumber = bankAccountNumber;
  if (bankName) user.bankName = bankName;
  if (accountName) user.accountName = accountName;
  if (phone) user.phone = phone;

  // Set status to pending – role remains "user" until approved
  user.verificationStatus = "pending";
  user.verificationSubmittedAt = new Date();

  await user.save();

  res.status(200).json({
    message: "Application submitted successfully. Awaiting admin approval.",
    verificationStatus: user.verificationStatus,
  });
});

// ─── Get rider application status ────────────────────────────
// @desc    Get current rider application status and data
// @route   GET /api/users/rider/status
// @access  Private (user only)
const getRiderApplicationStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "nin fuelingStation proofOfAddress profilePicture ninPicture bankAccountNumber bankName accountName phone verificationStatus rejectionReason verificationSubmittedAt role"
  );

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    role: user.role,
    verificationStatus: user.verificationStatus || "none",
    rejectionReason: user.rejectionReason || null,
    verificationSubmittedAt: user.verificationSubmittedAt || null,
    data: {
      nin: user.nin,
      fuelingStation: user.fuelingStation,
      proofOfAddress: user.proofOfAddress,
      profilePicture: user.profilePicture,
      ninPicture: user.ninPicture,
      bankAccountNumber: user.bankAccountNumber,
      bankName: user.bankName,
      accountName: user.accountName,
      phone: user.phone,
    },
  });
});

// ─── Update rider application (if pending or rejected) ──────
// @desc    Update verification details (if status pending/rejected)
// @route   PUT /api/users/rider/update
// @access  Private (user only)
const updateRiderApplication = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Only allow updates if status is pending or rejected
  if (user.verificationStatus === "approved" || user.role === "rider") {
    res.status(400);
    throw new Error("You cannot update an approved application");
  }

  const {
    nin,
    fuelingStation,
    bankAccountNumber,
    bankName,
    accountName,
    phone,
  } = req.body;

  // Validate NIN if provided
  if (nin) {
    const cleanedNin = String(nin).replace(/\s+/g, "");
    if (!/^\d{11}$/.test(cleanedNin)) {
      res.status(400);
      throw new Error("NIN must be 11 digits");
    }
    // Check uniqueness
    const existingNin = await User.findOne({
      nin: cleanedNin,
      _id: { $ne: user._id },
    });
    if (existingNin) {
      res.status(409);
      throw new Error("This NIN is already registered");
    }
    user.nin = cleanedNin;
  }

  if (fuelingStation) user.fuelingStation = fuelingStation;
  if (bankAccountNumber) user.bankAccountNumber = bankAccountNumber;
  if (bankName) user.bankName = bankName;
  if (accountName) user.accountName = accountName;
  if (phone) user.phone = phone;

  // Update files if new ones uploaded
  const profilePicture = getFileUrl(req.files, "profilePicture");
  const ninPicture = getFileUrl(req.files, "ninPicture");
  const proofOfAddress = getFileUrl(req.files, "proofOfAddress");

  if (profilePicture) user.profilePicture = profilePicture;
  if (ninPicture) user.ninPicture = ninPicture;
  if (proofOfAddress) user.proofOfAddress = proofOfAddress;

  // If previously rejected, reset to pending for re‑review
  if (user.verificationStatus === "rejected") {
    user.verificationStatus = "pending";
    user.rejectionReason = null;
    user.verificationSubmittedAt = new Date();
  }

  await user.save();

  res.status(200).json({
    message: "Application updated successfully.",
    verificationStatus: user.verificationStatus,
  });
});

// ─── Admin: Get all rider applications ──────────────────────
// @desc    Admin get all applications (filter by status)
// @route   GET /api/admin/riders/applications
// @access  Private/Admin
const getRiderApplications = asyncHandler(async (req, res) => {
  const { status } = req.query; // pending, approved, rejected, none

  const filter = { verificationStatus: status || { $ne: null } };
  // Also get those who have submitted at least some data
  // We'll only return users with verificationStatus set
  if (!status) {
    filter.verificationStatus = { $in: ["pending", "approved", "rejected"] };
  }

  const users = await User.find(filter)
    .select(
      "name email phone nin fuelingStation proofOfAddress profilePicture ninPicture bankAccountNumber bankName accountName verificationStatus rejectionReason verificationSubmittedAt role createdAt"
    )
    .sort({ verificationSubmittedAt: -1 });

  res.status(200).json(users);
});

// ─── Admin: Approve a rider application ──────────────────────
// @desc    Admin approves a rider application
// @route   PUT /api/admin/riders/:userId/approve
// @access  Private/Admin
const approveRider = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.verificationStatus !== "pending") {
    res.status(400);
    throw new Error("Only pending applications can be approved");
  }

  user.verificationStatus = "approved";
  user.role = "rider"; // 🎯 role changes to rider
  user.verificationReviewedAt = new Date();
  user.verificationReviewedBy = req.user._id;

  await user.save();

  res.status(200).json({
    message: "Rider application approved. User role updated to rider.",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      verificationStatus: user.verificationStatus,
    },
  });
});

// ─── Admin: Reject a rider application ──────────────────────
// @desc    Admin rejects a rider application with reason
// @route   PUT /api/admin/riders/:userId/reject
// @access  Private/Admin
const rejectRider = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    res.status(400);
    throw new Error("Rejection reason is required");
  }

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.verificationStatus !== "pending") {
    res.status(400);
    throw new Error("Only pending applications can be rejected");
  }

  user.verificationStatus = "rejected";
  user.rejectionReason = reason;
  user.verificationReviewedAt = new Date();
  user.verificationReviewedBy = req.user._id;

  // Role stays "user"
  await user.save();

  res.status(200).json({
    message: "Rider application rejected.",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      verificationStatus: user.verificationStatus,
      rejectionReason: user.rejectionReason,
    },
  });
});

export {
  applyForRider,
  getRiderApplicationStatus,
  updateRiderApplication,
  getRiderApplications,
  approveRider,
  rejectRider,
};