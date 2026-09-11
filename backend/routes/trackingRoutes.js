// routes/trackingRoutes.js  — UNCHANGED
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

router.post("/:orderId/start", protect, startTracking);
router.put("/:orderId/user-location", protect, updateUserLocation);
router.put("/:orderId/rider-location", protect, updateRiderLocation);
router.get("/:orderId", protect, getTracking);
router.put("/:orderId/stop", protect, stopTracking);

export default router;