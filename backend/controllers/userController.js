// controllers/userController.js
import asyncHandler from "express-async-handler";
import { OAuth2Client } from "google-auth-library";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import { sendOtpEmail } from "../utils/resendOTP.js";
import {
  GRACE_PERIOD_DAYS,
  getActiveTermsDocuments,
  buildTermsAcceptances,
  getGraceDeadline,
} from "../utils/terms.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helpers ──────────────────────────────────────────────────
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const getOtpExpiry = () => new Date(Date.now() + 10 * 60 * 1000);

// ─── Shared auth response shape ──────────────────────────────
// Every auth entry point must return the same fields so the frontend
// can render role-aware navigation without an extra profile fetch.
const buildAuthResponse = (user, token) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  profile: user.profile,
  authMethod: user.authMethod,
  role: user.role || "user",
  riderType: user.riderType || null,
  station: user.station || null,
  stationRole: user.stationRole || null,
  // Lets the frontend decide immediately whether to open the terms modal
  // (and whether the "Remind me later" button is still allowed) without
  // waiting on /api/terms/status.
  termsAccepted: user.termsAccepted ?? true,
  termsGraceEndsAt: user.termsGraceEndsAt || null,
  termsGracePeriodDays: GRACE_PERIOD_DAYS,
  token,
});

// ─── Google Auth ──────────────────────────────────────────────
const getUserInfoFromAccessToken = async (accessToken) => {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch user info from Google");
  }

  return response.json();
};

const googleAuth = asyncHandler(async (req, res) => {
  const { token: googleToken } = req.body;

  if (!googleToken) {
    res.status(400);
    throw new Error("Google token is required");
  }

  let googleId, email, name, picture;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    googleId = payload.sub;
    email = payload.email;
    name = payload.name;
    picture = payload.picture;
  } catch (err) {
    const userInfo = await getUserInfoFromAccessToken(googleToken);
    googleId = userInfo.sub || `google-${userInfo.email}`;
    email = userInfo.email;
    name = userInfo.name;
    picture = userInfo.picture;
  }

  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (!user) {
    const baseUsername = (email?.split("@")[0] || name || "user")
      .toLowerCase()
      .replace(/\s+/g, "");

    let username = baseUsername;
    let counter = 1;

    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter++}`;
    }

    // Google sign-in never has a checkbox to tick, so a brand new Google
    // user starts un-accepted with a fresh 10-day grace window. The modal
    // picks them up on first load.
    const termsDocuments = await getActiveTermsDocuments();
    const nothingToAccept = termsDocuments.length === 0;

    user = await User.create({
      googleId,
      name: name || "",
      username,
      email,
      profile: picture || "",
      password: `google-auth-${googleId}`,
      isVerified: true,
      authMethod: "google",
      termsAccepted: nothingToAccept,
      termsAcceptedAt: nothingToAccept ? new Date() : null,
      termsGraceEndsAt: nothingToAccept ? null : getGraceDeadline(),
      termsAcceptances: [],
    });
  } else if (!user.googleId) {
    user.googleId = googleId;
    user.isVerified = true;
    await user.save();
  }

  const token = generateToken(res, user._id);

  res.status(200).json(buildAuthResponse(user, token));
});

// ─── Register ──────────────────────────────────────────────────
const registerUser = asyncHandler(async (req, res) => {
  const { email, password, name, username, acceptedTerms } = req.body;

  if (!email || !password || !name) {
    res.status(400);
    throw new Error("Please provide email, password, and name");
  }
  if (password.length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  // ── Terms gate ───────────────────────────────────────────────
  // The "I have read and accepted" checkbox. No acceptance, no account.
  if (acceptedTerms !== true) {
    res.status(400);
    throw new Error(
      "You must read and accept the Terms of Service and Privacy Policy to create an account."
    );
  }

  const existingUser = await User.findOne({ email });

  if (existingUser && existingUser.isVerified) {
    res.status(400);
    throw new Error("User already exists with this email");
  }

  if (existingUser && !existingUser.isVerified) {
    await User.deleteOne({ _id: existingUser._id });
    console.log(
      `🗑️ Deleted unverified user: ${email} (ID: ${existingUser._id})`
    );
  }

  let finalUsername = username;
  if (!finalUsername) {
    const base = email.split("@")[0].toLowerCase().replace(/\s+/g, "");
    let candidate = base;
    let counter = 1;
    while (await User.findOne({ username: candidate })) {
      candidate = `${base}${counter++}`;
    }
    finalUsername = candidate;
  } else {
    const existing = await User.findOne({ username: finalUsername });
    if (existing) {
      res.status(400);
      throw new Error("Username already taken");
    }
  }

  const otp = generateOtp();
  const otpExpires = getOtpExpiry();

  // Snapshot the exact versions the user saw on screen.
  const termsDocuments = await getActiveTermsDocuments();
  const acceptedAt = new Date();

  const user = await User.create({
    email,
    password,
    name,
    username: finalUsername,
    isVerified: false,
    authMethod: "email",
    otp,
    otpExpires,
    deleteAfter: new Date(Date.now() + 6 * 60 * 1000),
    // ── Terms acceptance recorded at signup ──
    termsAccepted: true,
    termsAcceptedAt: acceptedAt,
    termsGraceEndsAt: null,
    termsAcceptances: buildTermsAcceptances(termsDocuments, req, acceptedAt),
  });

  await sendOtpEmail(email, otp);

  res.status(201).json({
    message: "User registered. Please verify your email with the OTP sent.",
    email: user.email,
  });
});

// ─── Verify OTP ───────────────────────────────────────────────
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.status(400);
    throw new Error("Email and OTP are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error("User already verified");
  }

  if (user.otp !== otp || user.otpExpires < new Date()) {
    res.status(400);
    throw new Error("Invalid or expired OTP");
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  user.deleteAfter = null;
  await user.save();

  const token = generateToken(res, user._id);

  res.status(200).json(buildAuthResponse(user, token));
});

// ─── Resend OTP ───────────────────────────────────────────────
const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error("User already verified");
  }

  const otp = generateOtp();
  const otpExpires = getOtpExpiry();

  user.otp = otp;
  user.otpExpires = otpExpires;
  user.deleteAfter = new Date(Date.now() + 6 * 60 * 1000);
  await user.save();

  await sendOtpEmail(email, otp);

  res.status(200).json({ message: "New OTP sent to your email" });
});

// ─── Login ─────────────────────────────────────────────────────
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!user.isVerified && user.authMethod === "email") {
    res.status(401);
    throw new Error(
      "Please verify your email first. Check OTP or request a new one."
    );
  }

  if (user.authMethod === "email") {
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid email or password");
    }
  } else {
    res.status(400);
    throw new Error(
      "This account uses Google Sign-In. Please use Google login."
    );
  }

  const token = generateToken(res, user._id);

  res.status(200).json(buildAuthResponse(user, token));
});

// ─── Forgot Password ──────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({
      message: "If that email exists, an OTP has been sent.",
    });
  }

  const resetOtp = generateOtp();
  const resetOtpExpires = getOtpExpiry();

  user.resetOtp = resetOtp;
  user.resetOtpExpires = resetOtpExpires;
  await user.save();

  await sendOtpEmail(email, resetOtp, "Password Reset OTP");

  res.status(200).json({
    message: "If that email exists, an OTP has been sent.",
  });
});

// ─── Verify Reset OTP ─────────────────────────────────────────
// Step 1 of the password reset flow: confirm the OTP is valid BEFORE
// letting the user pick a new password. The OTP is intentionally NOT
// cleared here — resetPassword will consume it in the next step.
const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.status(400);
    throw new Error("Email and OTP are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!user.resetOtp || !user.resetOtpExpires) {
    res.status(400);
    throw new Error("No password reset request found. Please request a new code.");
  }

  if (user.resetOtpExpires < new Date()) {
    res.status(400);
    throw new Error("Code has expired. Please request a new one.");
  }

  if (user.resetOtp !== otp) {
    res.status(400);
    throw new Error("Invalid code. Please check and try again.");
  }

  // Verified — the OTP stays on the user so resetPassword can consume it.
  res.status(200).json({
    message: "Code verified. You can now set a new password.",
    verified: true,
  });
});

// ─── Reset Password ───────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    res.status(400);
    throw new Error("Email, OTP, and new password are required");
  }

  if (newPassword.length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.resetOtp !== otp || user.resetOtpExpires < new Date()) {
    res.status(400);
    throw new Error("Invalid or expired OTP");
  }

  user.password = newPassword;
  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;
  await user.save();

  res.status(200).json({ message: "Password reset successfully" });
});

// ─── Get Profile ──────────────────────────────────────────────
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select(
      "-password -otp -otpExpires -resetOtp -resetOtpExpires -deleteAfter"
    )
    .populate("station", "name address status");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.status(200).json(user);
});

// ─── Update Profile ────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const { name, username, profilePhoto } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (name) user.name = name;

  if (username) {
    const existing = await User.findOne({
      username,
      _id: { $ne: user._id },
    });
    if (existing) {
      res.status(400);
      throw new Error("Username already taken");
    }
    user.username = username;
  }

  if (profilePhoto) {
    if (!profilePhoto.startsWith("data:image/")) {
      res.status(400);
      throw new Error("Invalid image format. Please provide a valid image.");
    }
    const base64Data = profilePhoto.split(",")[1];
    if (!base64Data) {
      res.status(400);
      throw new Error("Invalid image data format");
    }
    const sizeInBytes = Buffer.byteLength(base64Data, "base64");
    if (sizeInBytes > 5 * 1024 * 1024) {
      res.status(400);
      throw new Error("Image size exceeds 5MB limit");
    }
    user.profilePhoto = profilePhoto;
  }

  await user.save();

  const updatedUser = user.toObject();
  delete updatedUser.password;
  delete updatedUser.otp;
  delete updatedUser.otpExpires;
  delete updatedUser.resetOtp;
  delete updatedUser.resetOtpExpires;
  delete updatedUser.deleteAfter;

  res.status(200).json(updatedUser);
});

// ─── Change Password ──────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.authMethod === "google") {
    res.status(400);
    throw new Error(
      "Google accounts use Google Sign-In. Password cannot be changed here."
    );
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  if (newPassword.length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: "Password updated successfully" });
});

// ─── Upload Profile Photo ─────────────────────────────────────
const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No image file uploaded");
  }

  const imageUrl = req.file.path || req.file.location;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.profilePhoto = imageUrl;
  await user.save();

  res.status(200).json({
    message: "Profile photo updated successfully",
    profilePhoto: user.profilePhoto,
  });
});

// ─── Delete Account ───────────────────────────────────────────
const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  await user.deleteOne();

  const isProd = process.env.NODE_ENV === "production";
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });

  res.json({ message: "Account deleted successfully" });
});

// ─── Logout ───────────────────────────────────────────────────
const logoutUser = asyncHandler(async (req, res) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });

  res.status(200).json({ message: "Logged out successfully" });
});

// ─── Exports ──────────────────────────────────────────────────
export {
  googleAuth,
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePhoto,
  deleteAccount,
  logoutUser,
};