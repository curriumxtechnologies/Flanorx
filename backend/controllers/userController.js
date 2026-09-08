// controllers/userController.js
import asyncHandler from "express-async-handler";
import { OAuth2Client } from "google-auth-library";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import { sendOtpEmail } from "../utils/resendOTP.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: generate random 6-digit OTP
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Helper: set OTP expiry (10 minutes)
const getOtpExpiry = () => new Date(Date.now() + 10 * 60 * 1000);

// ----------------------------------------------------------------------
// GOOGLE AUTH (unchanged)
// ----------------------------------------------------------------------
const getUserInfoFromAccessToken = async (accessToken) => {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

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

    user = await User.create({
      googleId,
      name: name || "",
      username,
      email,
      profile: picture || "",
      password: `google-auth-${googleId}`,
      isVerified: true,
      authMethod: "google",
    });
  } else if (!user.googleId) {
    user.googleId = googleId;
    user.isVerified = true;
    await user.save();
  }

  const token = generateToken(res, user._id);

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    authMethod: user.authMethod,
    token,
  });
});

// ----------------------------------------------------------------------
// EMAIL / PASSWORD AUTH
// ----------------------------------------------------------------------

// @desc    Register a new user (send OTP)
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { email, password, name, username } = req.body;

  // Basic validations
  if (!email || !password || !name) {
    res.status(400);
    throw new Error("Please provide email, password, and name");
  }
  if (password.length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  // Check if user already exists
  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists with that email or username");
  }

  // Generate a unique username if not provided
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
    // Check uniqueness
    const existing = await User.findOne({ username: finalUsername });
    if (existing) {
      res.status(400);
      throw new Error("Username already taken");
    }
  }

  // Generate OTP
  const otp = generateOtp();
  const otpExpires = getOtpExpiry();

  // Create user (not verified yet)
  const user = await User.create({
    email,
    password,
    name,
    username: finalUsername,
    isVerified: false,
    authMethod: "email",
    otp,
    otpExpires,
  });

  // Send OTP via email
  await sendOtpEmail(email, otp);

  res.status(201).json({
    message: "User registered. Please verify your email with the OTP sent.",
    email: user.email,
  });
});

// @desc    Verify OTP
// @route   POST /api/users/verify-otp
// @access  Public
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

  // Check OTP and expiry
  if (user.otp !== otp || user.otpExpires < new Date()) {
    res.status(400);
    throw new Error("Invalid or expired OTP");
  }

  // Mark as verified and clear OTP fields
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  // Generate token and send response
  const token = generateToken(res, user._id);

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    authMethod: user.authMethod,
    token,
  });
});

// @desc    Resend OTP
// @route   POST /api/users/resend-otp
// @access  Public
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

  // Generate new OTP and update
  const otp = generateOtp();
  const otpExpires = getOtpExpiry();

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save();

  await sendOtpEmail(email, otp);

  res.status(200).json({ message: "New OTP sent to your email" });
});

// @desc    Login user (email + password)
// @route   POST /api/users/login
// @access  Public
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

  // Check if user is verified (unless Google auth)
  if (!user.isVerified && user.authMethod === "email") {
    res.status(401);
    throw new Error("Please verify your email first. Check OTP or request a new one.");
  }

  // Validate password (for email auth)
  if (user.authMethod === "email") {
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid email or password");
    }
  } else {
    // If user has google auth, they shouldn't login with password
    res.status(400);
    throw new Error("This account uses Google Sign-In. Please use Google login.");
  }

  const token = generateToken(res, user._id);

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    authMethod: user.authMethod,
    token,
  });
});

// ----------------------------------------------------------------------
// PASSWORD RESET (FORGOT / RESET)
// ----------------------------------------------------------------------

// @desc    Request password reset OTP
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email });
  // For security, do not reveal if user exists
  if (!user) {
    return res.status(200).json({ message: "If that email exists, an OTP has been sent." });
  }

  // Generate OTP for password reset
  const resetOtp = generateOtp();
  const resetOtpExpires = getOtpExpiry();

  user.resetOtp = resetOtp;
  user.resetOtpExpires = resetOtpExpires;
  await user.save();

  await sendOtpEmail(email, resetOtp, "Password Reset OTP");

  res.status(200).json({ message: "If that email exists, an OTP has been sent." });
});

// @desc    Reset password using OTP
// @route   POST /api/users/reset-password
// @access  Public
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

  // Check reset OTP
  if (user.resetOtp !== otp || user.resetOtpExpires < new Date()) {
    res.status(400);
    throw new Error("Invalid or expired OTP");
  }

  // Update password and clear reset fields
  user.password = newPassword;
  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;
  await user.save();

  res.status(200).json({ message: "Password reset successfully" });
});

// ----------------------------------------------------------------------
// AUTHENTICATED USER ACTIONS
// ----------------------------------------------------------------------

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -otp -otpExpires -resetOtp -resetOtpExpires");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.status(200).json(user);
});

// @desc    Update user profile (name, username, profile photo)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, username, profilePhoto } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Update fields if provided
  if (name) user.name = name;
  if (username) {
    // Check if username is taken (by another user)
    const existing = await User.findOne({ username, _id: { $ne: user._id } });
    if (existing) {
      res.status(400);
      throw new Error("Username already taken");
    }
    user.username = username;
  }
  if (profilePhoto) {
    // Validate base64 image size etc (similar to uploadProfilePhoto)
    // We'll reuse the same validation, but we can call uploadProfilePhoto separately
    // For simplicity, we'll allow updating profilePhoto here as well.
    // But we can keep both; we'll add validation.
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

  // Return updated user (without sensitive fields)
  const updatedUser = user.toObject();
  delete updatedUser.password;
  delete updatedUser.otp;
  delete updatedUser.otpExpires;
  delete updatedUser.resetOtp;
  delete updatedUser.resetOtpExpires;

  res.status(200).json(updatedUser);
});

// @desc    Change password (authenticated user)
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.authMethod === "google") {
    res.status(400);
    throw new Error("Google accounts use Google Sign-In. Password cannot be changed here.");
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

// @desc    Upload profile photo (separate endpoint, but can be integrated into updateProfile)
// @route   POST /api/users/upload-profile-photo
// @access  Private
// Modified uploadProfilePhoto to work with multer + Cloudinary
const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No image file uploaded");
  }

  // Cloudinary returns the URL in req.file.path or req.file.location
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

// @desc    Delete account
// @route   DELETE /api/users/delete-account
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  await user.deleteOne();

  // Clear cookie
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

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Private
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

// ----------------------------------------------------------------------
// EXPORTS
// ----------------------------------------------------------------------
export {
  googleAuth,
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePhoto,
  deleteAccount,
  logoutUser,
};