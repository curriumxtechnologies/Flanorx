// routes/notificationRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  registerDeviceToken,
  unregisterDeviceToken,
  getMyDevices,
  sendTestPush,
  getNotificationStatus,
  sendPushToUser,
  broadcastPush,
  purgeInvalidTokens,
} from "../controllers/notificationController.js";

const router = express.Router();

// ─── Every notification route requires auth ────────────────
router.use(protect);

// ─── Client-side (any logged-in user) ──────────────────────
router.post("/token", registerDeviceToken);
router.delete("/token", unregisterDeviceToken);
router.get("/devices", getMyDevices);
router.post("/test", sendTestPush);

// ─── Admin ─────────────────────────────────────────────────
// Role checks are done in the controller
router.get("/status", getNotificationStatus);
router.post("/send/:userId", sendPushToUser);
router.post("/broadcast", broadcastPush);
router.delete("/invalid", purgeInvalidTokens);

export default router;