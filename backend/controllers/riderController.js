// controllers/riderController.js
import asyncHandler from "express-async-handler";
import axios from "axios";
import User from "../models/userModel.js";
import Station from "../models/stationModel.js";

const PAYSTACK_BASE = "https://api.paystack.co";

// ─── Helpers ──────────────────────────────────────────────────
const getPaystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
});

// ─── Resolve bank account using Paystack ────────────────────
const resolveBankAccount = async (accountNumber, bankCode) => {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      { headers: getPaystackHeaders() }
    );
    if (response.data.status) {
      return response.data.data; // { account_number, account_name, bank_code }
    }
    throw new Error(response.data.message || "Bank resolution failed");
  } catch (error) {
    console.error(
      "Bank resolution error:",
      error.response?.data || error.message
    );
    throw new Error(
      "Could not verify bank account. Please check the number and bank."
    );
  }
};

// ─── Helper to get uploaded file URL from multer ────────────
const getFileUrl = (files, fieldName) => {
  const file = files?.[fieldName]?.[0];
  return file?.path || file?.secure_url || null;
};

// ═════════════════════════════════════════════════════════════
//  Apply to become a rider (FUEL rider)
//  @desc    User applies to become a fuel rider (submits verification)
//  @route   POST /api/users/rider/apply
//  @access  Private (user only)
// ═════════════════════════════════════════════════════════════
const applyForRider = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const {
    nin,
    fuelingStation,
    bankAccountNumber,
    bankName,
    bankCode,
    accountName,
    phone,
  } = req.body;

  // Required fields
  if (!nin || !fuelingStation) {
    res.status(400);
    throw new Error("NIN and fueling station are required");
  }
  if (!bankAccountNumber || !bankCode || !accountName) {
    res.status(400);
    throw new Error("Bank details are required");
  }

  // Validate NIN (11 digits)
  const cleanedNin = String(nin).replace(/\s+/g, "");
  if (!/^\d{11}$/.test(cleanedNin)) {
    res.status(400);
    throw new Error("NIN must be 11 digits");
  }

  // Check if NIN already used
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

  // ─── NEW: block station members from applying via this flow ─
  if (user.station) {
    res.status(400);
    throw new Error(
      "You are already part of a station. Ask your station admin to add you as a station rider instead."
    );
  }

  // Check existing status
  if (user.role === "rider") {
    res.status(400);
    throw new Error("You are already a verified rider");
  }
  if (user.verificationStatus === "pending") {
    res.status(400);
    throw new Error("Your application is already pending review");
  }

  // Get uploaded files
  const profilePicture = getFileUrl(req.files, "profilePicture");
  const ninPicture = getFileUrl(req.files, "ninPicture");
  const proofOfAddress = getFileUrl(req.files, "proofOfAddress");

  if (!proofOfAddress) {
    res.status(400);
    throw new Error("Proof of address image is required");
  }

  // ✅ Verify bank account via Paystack
  try {
    await resolveBankAccount(bankAccountNumber, bankCode);
  } catch (error) {
    res.status(400);
    throw new Error(`Bank verification failed: ${error.message}`);
  }

  // Save verification details
  user.nin = cleanedNin;
  user.fuelingStation = fuelingStation;
  user.proofOfAddress = proofOfAddress;
  if (profilePicture) user.profilePicture = profilePicture;
  if (ninPicture) user.ninPicture = ninPicture;
  user.bankAccountNumber = bankAccountNumber;
  user.bankName = bankName;
  user.bankCode = bankCode;
  user.accountName = accountName;
  if (phone) user.phone = phone;

  user.verificationStatus = "pending";
  user.verificationSubmittedAt = new Date();

  await user.save();

  res.status(200).json({
    message: "Application submitted successfully. Awaiting admin approval.",
    verificationStatus: user.verificationStatus,
  });
});

// ═════════════════════════════════════════════════════════════
//  Get rider application status
//  @desc    Get current rider application status and data
//  @route   GET /api/users/rider/status
//  @access  Private (user only)
// ═════════════════════════════════════════════════════════════
const getRiderApplicationStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "nin fuelingStation proofOfAddress profilePicture ninPicture bankAccountNumber bankName bankCode accountName phone verificationStatus rejectionReason verificationSubmittedAt role riderType station stationRole"
  );

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Optionally hydrate station info for the frontend
  let stationInfo = null;
  if (user.station) {
    const s = await Station.findById(user.station).select("name address status");
    if (s) {
      stationInfo = {
        _id: s._id,
        name: s.name,
        address: s.address,
        status: s.status,
      };
    }
  }

  res.status(200).json({
    role: user.role,
    riderType: user.riderType || null,
    station: stationInfo,
    stationRole: user.stationRole || null,
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
      bankCode: user.bankCode,
      accountName: user.accountName,
      phone: user.phone,
    },
  });
});

// ═════════════════════════════════════════════════════════════
//  Update rider application
//  @desc    Update verification details (if status pending/rejected)
//  @route   PUT /api/users/rider/update
//  @access  Private (user only)
// ═════════════════════════════════════════════════════════════
const updateRiderApplication = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.verificationStatus === "approved" || user.role === "rider") {
    res.status(400);
    throw new Error("You cannot update an approved application");
  }

  // Station members shouldn't be using this flow either
  if (user.station) {
    res.status(400);
    throw new Error(
      "You are already part of a station. Contact your station admin to update your details."
    );
  }

  const {
    nin,
    fuelingStation,
    bankAccountNumber,
    bankName,
    bankCode,
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

  // Update bank details if provided
  if (bankAccountNumber && bankCode) {
    try {
      await resolveBankAccount(bankAccountNumber, bankCode);
    } catch (error) {
      res.status(400);
      throw new Error(`Bank verification failed: ${error.message}`);
    }
    user.bankAccountNumber = bankAccountNumber;
    user.bankCode = bankCode;
  }
  if (bankName) user.bankName = bankName;
  if (accountName) user.accountName = accountName;

  if (fuelingStation) user.fuelingStation = fuelingStation;
  if (phone) user.phone = phone;

  // Update files if new ones uploaded
  const profilePicture = getFileUrl(req.files, "profilePicture");
  const ninPicture = getFileUrl(req.files, "ninPicture");
  const proofOfAddress = getFileUrl(req.files, "proofOfAddress");

  if (profilePicture) user.profilePicture = profilePicture;
  if (ninPicture) user.ninPicture = ninPicture;
  if (proofOfAddress) user.proofOfAddress = proofOfAddress;

  // Reset to pending if previously rejected
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

// ═════════════════════════════════════════════════════════════
//  Resolve bank account (public endpoint for frontend)
//  @desc    Verify bank account and return account name
//  @route   POST /api/riders/resolve-bank
//  @access  Private (user only)
// ═════════════════════════════════════════════════════════════
const resolveBank = asyncHandler(async (req, res) => {
  const { accountNumber, bankCode } = req.body;
  if (!accountNumber || !bankCode) {
    res.status(400);
    throw new Error("Account number and bank code are required");
  }

  try {
    const data = await resolveBankAccount(accountNumber, bankCode);
    res.status(200).json({
      success: true,
      account_name: data.account_name,
      account_number: data.account_number,
      bank_code: data.bank_code,
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || "Bank resolution failed");
  }
});

// ═════════════════════════════════════════════════════════════
//  Admin: Get all rider applications
//  @desc    Admin get all applications (filter by status)
//  @route   GET /api/admin/riders/applications
//  @access  Private/Admin
// ═════════════════════════════════════════════════════════════
const getRiderApplications = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const filter = {};
  if (status) {
    filter.verificationStatus = status;
  } else {
    filter.verificationStatus = { $in: ["pending", "approved", "rejected"] };
  }

  const users = await User.find(filter)
    .select(
      "name email phone nin fuelingStation proofOfAddress profilePicture ninPicture bankAccountNumber bankName bankCode accountName verificationStatus rejectionReason verificationSubmittedAt role riderType station stationRole createdAt"
    )
    .populate("station", "name address")
    .sort({ verificationSubmittedAt: -1 });

  res.status(200).json(users);
});

// ═════════════════════════════════════════════════════════════
//  Admin: Approve a rider application (fuel rider)
//  @desc    Admin approves a rider application
//  @route   PUT /api/admin/riders/:userId/approve
//  @access  Private/Admin
// ═════════════════════════════════════════════════════════════
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

  // Safety: don't approve a user who somehow belongs to a station
  if (user.station) {
    res.status(400);
    throw new Error(
      "This user is part of a station. Manage them from the station controller instead."
    );
  }

  user.verificationStatus = "approved";
  user.role = "rider";
  user.riderType = "fuel"; // ⭐ this flow creates fuel riders
  user.verificationReviewedAt = new Date();
  user.verificationReviewedBy = req.user._id;

  await user.save();

  res.status(200).json({
    message:
      "Rider application approved. User is now a fuel rider.",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      riderType: user.riderType,
      verificationStatus: user.verificationStatus,
    },
  });
});

// ═════════════════════════════════════════════════════════════
//  Admin: Reject a rider application
//  @desc    Admin rejects a rider application with reason
//  @route   PUT /api/admin/riders/:userId/reject
//  @access  Private/Admin
// ═════════════════════════════════════════════════════════════
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

// ═════════════════════════════════════════════════════════════
//  Get banks (Paystack passthrough)
//  @desc    List Nigerian banks
//  @route   GET /api/riders/banks
//  @access  Private
// ═════════════════════════════════════════════════════════════
const getBanks = asyncHandler(async (req, res) => {
  const response = await axios.get(`${PAYSTACK_BASE}/bank`, {
    headers: getPaystackHeaders(),
  });
  if (response.data.status) {
    const banks = response.data.data.map((b) => ({
      code: b.code,
      name: b.name,
    }));
    res.status(200).json(banks);
  } else {
    res.status(500);
    throw new Error("Failed to fetch banks");
  }
});

export {
  applyForRider,
  getRiderApplicationStatus,
  updateRiderApplication,
  getBanks,
  resolveBank,
  getRiderApplications,
  approveRider,
  rejectRider,
};