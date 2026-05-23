// routes/userRoutes.js
import express from "express";
import { 
  googleAuth, 
  logoutUser,
  uploadProfilePhoto,  // ← Import from userController
  changePassword,
  deleteAccount
} from "../controllers/userController.js";
import { 
  protect 
} from "../middleware/authMiddleware.js";
import {
  getUserProfile,
  updateUserProfile,
  addAddress,
  getOrderStats,
  getRecentOrders,
  getUserAddresses,
  deleteAddress,
  setDefaultAddress
} from "../controllers/orderController.js";

const router = express.Router();

// Public routes
router.post("/google", googleAuth);
router.post("/logout", logoutUser);

// Protected routes (require authentication)
router.route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.post("/avatar", protect, uploadProfilePhoto);
router.get("/orders/stats", protect, getOrderStats);
router.get("/orders/recent", protect, getRecentOrders);
router.get("/addresses", protect, getUserAddresses);
router.post("/address", protect, addAddress);
router.delete("/address/:addressId", protect, deleteAddress);
router.put("/address/:addressId/default", protect, setDefaultAddress);

// New routes for settings page
router.put("/change-password", protect, changePassword);
router.delete("/account", protect, deleteAccount);

export default router;