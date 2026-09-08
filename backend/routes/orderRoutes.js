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
} from "../controllers/orderController.js";

import { protect } from "../middleware/authMiddleware.js";
import Order from "../models/orderModel.js";

// ─── Role check helpers (inline) ──────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403);
    return next(new Error("Admin access required"));
  }
  next();
};

const riderOrAdmin = (req, res, next) => {
  if (req.user?.role !== "rider" && req.user?.role !== "admin") {
    res.status(403);
    return next(new Error("Rider or admin access required"));
  }
  next();
};

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES (no auth required)
// ────────────────────────────────────────────────────────────────────────────
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
// ADMIN ONLY
// ────────────────────────────────────────────────────────────────────────────
router.get("/", protect, adminOnly, getOrders);
router.get("/stats/dashboard", protect, adminOnly, getDashboardStats);
router.put("/:id/status", protect, adminOnly, updateOrderStatus);

// ────────────────────────────────────────────────────────────────────────────
// RIDER + ADMIN ROUTES
// ────────────────────────────────────────────────────────────────────────────
// Riders & admins can update delivery status of assigned orders
router.put("/:id/delivery-status", protect, riderOrAdmin, updateOrderStatus);

// Riders & admins can get assigned orders (riders see their own, admins see all)
router.get("/rider/assigned", protect, riderOrAdmin, async (req, res) => {
  try {
    const filter = { deliveryStatus: { $in: ["pending", "accepted", "picked_up", "in_transit"] } };
    if (req.user.role === "rider") {
      filter.rider = req.user._id;
    }
    // For admins, we return all active deliveries (or we could return assigned to any rider)
    // We'll return all with the filter
    const orders = await Order.find(filter)
      .populate("user", "name email phone deliveryAddress")
      .populate("rider", "name phone");
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Riders can mark order as delivered (but admins can also do it via status update)
router.put("/:id/delivered", protect, riderOrAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    // If rider, they can only update if assigned to them
    if (req.user.role === "rider" && order.rider?.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not assigned to this order");
    }

    order.deliveryStatus = "delivered";
    order.status = "completed";
    await order.save();

    res.status(200).json({ message: "Order marked as delivered", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;