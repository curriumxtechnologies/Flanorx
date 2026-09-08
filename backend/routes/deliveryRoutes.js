import express from "express";
import {
  getAvailableDeliveries,
  getMyAssignedDeliveries,
  acceptDelivery,
  updateDeliveryProgress,
  confirmDeliveryByCustomer,
  getDeliveryDetails,
  getRiderEarnings,
} from "../controllers/deliveryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── Rider‑only routes (check role in controller) ─────────────────────────
router.get("/available", protect, getAvailableDeliveries);
router.get("/my-deliveries", protect, getMyAssignedDeliveries);
router.get("/rider/earnings", protect, getRiderEarnings);
router.put("/:id/accept", protect, acceptDelivery);
router.put("/:id/status", protect, updateDeliveryProgress);

// ─── Customer confirms delivery ────────────────────────────────────────────
router.put("/:id/confirm", protect, confirmDeliveryByCustomer);

// ─── Mixed access (rider, user, admin) – handled in controller ────────────
router.get("/:id", protect, getDeliveryDetails);

export default router;