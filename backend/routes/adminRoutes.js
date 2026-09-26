// routes/adminRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  // Orders
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
  // Users
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  // Rider applications
  getRiderApplications,
  approveRider,
  rejectRider,
  // Riders
  getAllRiders,
  // Deliveries
  getActiveDeliveries,
  // Stations overview
  getStationsOverview,
} from "../controllers/adminController.js";

import {
  // Station CRUD
  createStation,
  getAllStations,
  getStationById,
  updateStation,
  deleteStation,
  assignStationAdmin,
  // Station admin: riders
  adminAddStationRider,
  adminRemoveStationRider,
  // Station admin: stock
  adminAdjustStock,
  adminGetStationLogs,
} from "../controllers/stationController.js";

import {
  updateTerms,
  getTermsHistory,
} from "../controllers/termsController.js";

const router = express.Router();

// ─── Middleware: admin only for every route in this file ───
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403);
    return next(new Error("Admin access required"));
  }
  next();
};

router.use(protect, adminOnly);

// ─── Order Management ────────────────────────────────────────
router.get("/orders", getAllOrders);
router.put("/orders/:id/status", updateOrderStatus);
router.get("/stats", getDashboardStats);

// ─── User Management ─────────────────────────────────────────
router.get("/users", getAllUsers);
router.route("/users/:id").get(getUserById).delete(deleteUser);
router.put("/users/:id/role", updateUserRole);

// ─── Rider Application Management ────────────────────────────
router.get("/riders/applications", getRiderApplications);
router.put("/riders/:userId/approve", approveRider);
router.put("/riders/:userId/reject", rejectRider);
router.get("/riders", getAllRiders);

// ─── Delivery Monitoring ─────────────────────────────────────
router.get("/deliveries/active", getActiveDeliveries);

// ═══════════════════════════════════════════════════════════
//  STATION MANAGEMENT (main admin only)
// ═══════════════════════════════════════════════════════════

// Overview across all stations (single call)
router.get("/stations/overview", getStationsOverview);

// Station CRUD
router.route("/stations").post(createStation).get(getAllStations);

router
  .route("/stations/:id")
  .get(getStationById)
  .put(updateStation)
  .delete(deleteStation);

// Assign / reassign the station admin
router.put("/stations/:id/assign-admin", assignStationAdmin);

// Station riders (add / remove)
router.post("/stations/:id/riders", adminAddStationRider);
router.delete("/stations/:id/riders/:userId", adminRemoveStationRider);

// Stock override + audit log
router.post("/stations/:id/adjust-stock", adminAdjustStock);
router.get("/stations/:id/logs", adminGetStationLogs);

// ═══════════════════════════════════════════════════════════
//  TERMS & PRIVACY MANAGEMENT
// ═══════════════════════════════════════════════════════════

// @route   PUT /api/admin/terms/:type
// @desc    Publish a new version of the terms or privacy document.
//          Archives the old copy into history, auto-bumps the version
//          (unless you pass an explicit `version`), then flips EVERY
//          user's termsAccepted back to false with a fresh 10-day
//          grace window — which re-triggers the acceptance modal
//          on the frontend for everyone.
//
//          Body: {
//            title?,          // optional, defaults to existing / DEFAULT_TITLES
//            content,         // required — markdown / HTML / plain text
//            version?,        // optional, auto-bumped if omitted
//            updateNotice?,   // optional "we updated X" banner text
//            effectiveFrom?,  // optional Date
//            isActive?        // optional boolean
//          }
//
//          :type = "terms" | "privacy"
// @access  Private/Admin
router.put("/terms/:type", updateTerms);

// @route   GET /api/admin/terms/:type/history
// @desc    Full version history + audit trail for a policy document.
//          Returns the current live version plus every archived copy.
// @access  Private/Admin
router.get("/terms/:type/history", getTermsHistory);

export default router;