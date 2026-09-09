// routes/waitlistRoutes.js
import express from "express";
import {
  joinWaitlist,
  getWaitlistEntries,
  getWaitlistStats,
} from "../controllers/waitlistController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── Public route ──────────────────────────────────────────
// Anyone can join the waitlist
router.post("/", joinWaitlist);

// ─── Admin routes ──────────────────────────────────────────
// Protected by `protect` – role check is done inside the controller
router.get("/", protect, getWaitlistEntries);
router.get("/stats", protect, getWaitlistStats);

export default router;