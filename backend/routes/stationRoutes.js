// routes/stationRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  // Public / any auth user
  getNearbyStations,
  // Station scope (admin + staff)
  getMyStation,
  getStationDashboard,
  getStationInventory,
  restockInventory,
  getInventoryLogs,
  getStationOrders,
  assignRiderToOrder,
  markOrderReady,
  // Station admin only
  getStationTeam,
  addStationTeamMember,
  removeStationTeamMember,
  searchUsersForStation,
  getStationRiders,
  addStationRider,
  removeStationRider,
} from "../controllers/stationController.js";

// ─── Router mounted at /api/stations ────────────────────────
export const publicRouter = express.Router();

// @route   GET /api/stations/nearby?lat=&lng=&radiusKm=
// @desc    Get active stations nearest to a coordinate
// @access  Private (any logged-in user)
publicRouter.get("/nearby", protect, getNearbyStations);

// ─── Router mounted at /api/station ─────────────────────────
export const stationRouter = express.Router();

// Role / station-scope checks live in the controller
stationRouter.use(protect);

// ─── My station ─────────────────────────────────────────────
stationRouter.get("/me", getMyStation);
stationRouter.get("/dashboard", getStationDashboard);

// ─── Inventory ──────────────────────────────────────────────
stationRouter.get("/inventory", getStationInventory);
stationRouter.post("/inventory/restock", restockInventory);
stationRouter.get("/inventory/logs", getInventoryLogs);

// ─── Orders ─────────────────────────────────────────────────
stationRouter.get("/orders", getStationOrders);
stationRouter.put("/orders/:id/assign-rider", assignRiderToOrder);
stationRouter.put("/orders/:id/mark-ready", markOrderReady);

// ─── Team (station admin only) ──────────────────────────────
stationRouter.get("/team", getStationTeam);
stationRouter.post("/team", addStationTeamMember);
stationRouter.delete("/team/:userId", removeStationTeamMember);

// ─── Users search (station admin only) ──────────────────────
// Used by the Team & Riders pages to find users to add.
// Must come BEFORE any /:something catch-alls (none exist here, but
// keep it grouped with admin-only routes for clarity).
stationRouter.get("/users/search", searchUsersForStation);

// ─── Riders (station admin only) ────────────────────────────
stationRouter.get("/riders", getStationRiders);
stationRouter.post("/riders", addStationRider);
stationRouter.delete("/riders/:userId", removeStationRider);

// NOTE: The QR-scan endpoints for pickup and delivery are unified in
// POST /api/orders/verify — the controller decides who is allowed
// based on the order (fuel delivery / gas delivery / gas pickup).