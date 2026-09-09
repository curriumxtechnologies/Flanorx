// routes/adminRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getRiderApplications,
  approveRider,
  rejectRider,
  getAllRiders,
  getActiveDeliveries,
} from "../controllers/adminController.js";

const router = express.Router();

// ─── Middleware to check if user is admin ──────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403);
    return next(new Error("Admin access required"));
  }
  next();
};

// ─── Apply adminOnly to all routes in this file ─────────────
router.use(protect, adminOnly);

// ─── Order Management ────────────────────────────────────────
// GET    /api/admin/orders          – List all orders (with filters)
// PUT    /api/admin/orders/:id/status – Update order status
// GET    /api/admin/stats           – Dashboard statistics
router.route("/orders")
  .get(getAllOrders);

router.put("/orders/:id/status", updateOrderStatus);
router.get("/stats", getDashboardStats);

// ─── User Management ─────────────────────────────────────────
// GET    /api/admin/users           – List all users
// GET    /api/admin/users/:id       – Get user by ID
// PUT    /api/admin/users/:id/role  – Update user role
// DELETE /api/admin/users/:id       – Delete user
router.route("/users")
  .get(getAllUsers);

router.route("/users/:id")
  .get(getUserById)
  .delete(deleteUser);

router.put("/users/:id/role", updateUserRole);

// ─── Rider Application Management ──────────────────────────
// GET    /api/admin/riders/applications – List all applications (filter by status)
// PUT    /api/admin/riders/:userId/approve – Approve a rider application
// PUT    /api/admin/riders/:userId/reject  – Reject a rider application
// GET    /api/admin/riders           – List all approved riders
router.get("/riders/applications", getRiderApplications);
router.put("/riders/:userId/approve", approveRider);
router.put("/riders/:userId/reject", rejectRider);
router.get("/riders", getAllRiders);

// ─── Delivery Monitoring ─────────────────────────────────────
// GET    /api/admin/deliveries/active – Get all active deliveries
router.get("/deliveries/active", getActiveDeliveries);

export default router;