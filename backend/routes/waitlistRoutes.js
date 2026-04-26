// routes/waitlistRoutes.js
import express from "express";
import { joinWaitlist, getWaitlistEntries, getWaitlistStats } from "../controllers/waitlistController.js";
import { authenticateAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route - anyone can join
router.post("/", joinWaitlist);

// Admin routes
router.get("/", authenticateAdmin, getWaitlistEntries);
router.get("/stats", authenticateAdmin, getWaitlistStats);

export default router;