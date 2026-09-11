// routes/deliveryRoutes.js
import express from "express";
import {
  getAvailableDeliveries,
  getMyAssignedDeliveries,
  acceptDelivery,
  updateDeliveryProgress,
  getDeliveryDetails,
  getRiderEarnings,
} from "../controllers/deliveryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── Rider‑only routes (role + riderType enforced in controller) ─────────
// Fuel riders use /available. Station riders use /my-deliveries.
router.get("/available", protect, getAvailableDeliveries);
router.get("/my-deliveries", protect, getMyAssignedDeliveries);
router.get("/rider/earnings", protect, getRiderEarnings);

// Fuel riders claim an open order (gas orders are station-assigned)
router.put("/:id/accept", protect, acceptDelivery);

// Rider progresses picked_up / in_transit / delivered.
// NOTE: "delivered" is a status only — the order is completed when the
// customer's QR is scanned via POST /api/orders/verify.
router.put("/:id/status", protect, updateDeliveryProgress);

// ─── Mixed access (rider, user, station member, admin) — controller checks ─
// ⚠️ This must come LAST!
router.get("/:id", protect, getDeliveryDetails);

export default router;