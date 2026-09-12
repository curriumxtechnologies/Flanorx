// routes/emailNotificationRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getEmailStatus,
  forceRunReminders,
  getEmailTemplates,
  triggerOrderEvent,
} from "../controllers/emailNotificationController.js";

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403);
    return next(new Error("Admin access required"));
  }
  next();
};

router.use(protect, adminOnly);

// ─── Status ─────────────────────────────────────────────────
router.get("/status", getEmailStatus);
router.get("/templates", getEmailTemplates);

// ─── Debug / testing ────────────────────────────────────────
// Force-run the pending reminder sweep immediately.
// Body: { olderThanMinutes?: number } — 0 means include everything
router.post("/run-reminders", forceRunReminders);

// Manually fire any order event for a single order.
// Example: POST /api/email/order/64f.../paid
router.post("/order/:orderId/:event", triggerOrderEvent);

export default router;