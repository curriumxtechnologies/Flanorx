// routes/orderRoutes.js
import express from "express";
const router = express.Router();

import {
  createOrder,
  getOrder,
  getOrders,
  getMyOrders,
  getMyTotalSpent,
  getMyActiveOrder,
  payOrder,
  getDeliveryStatus,
  updateOrderStatus,
  getDashboardStats,
  verifyPaymentAndGetOrder,
  initializePaymentForOrder,
  verifyOrderByToken,
} from "../controllers/orderController.js";

import { protect } from "../middleware/authMiddleware.js";

// ─── Role check helpers (inline) ──────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403);
    return next(new Error("Admin access required"));
  }
  next();
};

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES (no auth required)
// ────────────────────────────────────────────────────────────────────────────

// Verify a Paystack payment reference and return the resulting order
// (handles both normal FLX_ orders and SUB_ subscription references)
router.get("/verify/:reference", verifyPaymentAndGetOrder);

// ────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED (USER) ROUTES
// ────────────────────────────────────────────────────────────────────────────
router.post("/", protect, createOrder);
router.get("/my", protect, getMyOrders);
router.get("/total-spent", protect, getMyTotalSpent);
router.get("/active", protect, getMyActiveOrder);
router.put("/:id/pay", protect, payOrder);
router.post("/:id/initialize-payment", protect, initializePaymentForOrder);

// ─── User, Rider, or Admin can view order & delivery status ──────────────
router.get("/:id/delivery-status", protect, getDeliveryStatus);
router.get("/:id", protect, getOrder);

// ────────────────────────────────────────────────────────────────────────────
// QR VERIFICATION — fuel & gas order confirmation
//
// Callers:
//   - Fuel delivery: the assigned fuel rider
//   - Gas delivery: the assigned station rider
//   - Gas pickup:   the station admin or staff
//   - Main admin:   any order
//
// Permission checks are handled inside the controller.
// ────────────────────────────────────────────────────────────────────────────
router.post("/verify", protect, verifyOrderByToken);

// ────────────────────────────────────────────────────────────────────────────
// ADMIN ONLY
// ────────────────────────────────────────────────────────────────────────────
router.get("/", protect, adminOnly, getOrders);
router.get("/stats/dashboard", protect, adminOnly, getDashboardStats);
router.put("/:id/status", protect, adminOnly, updateOrderStatus);

export default router;