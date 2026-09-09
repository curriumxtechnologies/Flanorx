// routes/trackingRoutes.js
import express from "express";
const router = express.Router();

import {
  startTracking,
  updateUserLocation,
  updateRiderLocation,
  getTracking,
  stopTracking,
} from "../controllers/trackingController.js";

import { protect } from "../middleware/authMiddleware.js";

// ─────────────────────────────────────────────────────────────
// Tracking Routes – all routes require authentication (protect)
// Role‑based permissions are enforced inside the controllers
// using req.user.role
// ─────────────────────────────────────────────────────────────

// Rider starts tracking for an order (only riders allowed – checked in controller)
router.post("/:orderId/start", protect, startTracking);

// User updates their location (only users allowed – checked in controller)
router.put("/:orderId/user-location", protect, updateUserLocation);

// Rider updates their location (only riders allowed – checked in controller)
router.put("/:orderId/rider-location", protect, updateRiderLocation);

// Get tracking details – accessible by user, rider, or admin (controller checks)
router.get("/:orderId", protect, getTracking);

// Stop tracking – accessible by rider or admin (controller checks)
router.put("/:orderId/stop", protect, stopTracking);

export default router;