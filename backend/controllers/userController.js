// controllers/userController.js
import asyncHandler from "express-async-handler";
import { OAuth2Client } from "google-auth-library";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

// ========== ADD THIS FUNCTION ==========
const uploadProfilePhoto = asyncHandler(async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    // Validate image data
    if (!imageUrl) {
      res.status(400);
      throw new Error("No image data provided");
    }
    
    // Check if it's a valid base64 image
    if (!imageUrl.startsWith('data:image/')) {
      res.status(400);
      throw new Error("Invalid image format. Please provide a valid image.");
    }
    
    // Check file size (approximate from base64)
    const base64Data = imageUrl.split(',')[1];
    const sizeInBytes = Buffer.byteLength(base64Data, 'base64');
    if (sizeInBytes > 5 * 1024 * 1024) { // 5MB limit
      res.status(400);
      throw new Error("Image size exceeds 5MB limit");
    }
    
    // Update user's profilePhoto
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    
    user.profilePhoto = imageUrl;
    await user.save();
    
    res.status(200).json({
      message: "Profile photo updated successfully",
      profilePhoto: imageUrl
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(error.status || 500);
    throw new Error(error.message || "Failed to upload avatar");
  }
});
// ========== END OF ADDED FUNCTION ==========

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

const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  
  await user.deleteOne();
  
  // Clear cookie on account deletion
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

// EXPORT - all functions including the new one
export {
  googleAuth,
  logoutUser,
  changePassword,
  deleteAccount,
  uploadProfilePhoto  // ← Make sure this is included!
};