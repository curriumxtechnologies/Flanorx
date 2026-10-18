// routes/refillRoutes.js
//
// Third-party refill station routes.
//
// Mounting (server.js / app.js):
//   import { refillRoutes, refillAdminRoutes } from "./routes/refillRoutes.js";
//   app.use("/api/refill",       refillRoutes);
//   app.use("/api/admin/refill", protect, adminOnly, refillAdminRoutes);
//
// File fields expected on multipart endpoints:
//   • businessLicense  — 1 file,  image (jpg/png/webp) or PDF
//   • shopPhotos       — up to 10, images only
//   • cylinderPhotos   — up to 10, images only
//
// Structured fields (coordinates, supportedCylinderSizes, cylinderPrices)
// must arrive JSON-encoded as form-data strings; the controller decodes them.

import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { protect } from "../middleware/authMiddleware.js";

import {
  // Application
  applyAsRefillStation,
  getMyRefillApplication,
  // Discovery
  getNearbyRefillStations,
  getRefillStationPublic,
  // Customer orders
  createRefillOrder,
  verifyRefillPayment,
  getMyRefillOrders,
  getRefillOrder,
  confirmRefillOrder,
  cancelRefillOrder,
  // Station side
  getMyRefillStation,
  updateMyRefillStation,
  updateMyRefillStationDocuments,
  getRefillStationDashboard,
  getRefillStationOrders,
  acceptRefillOrder,
  rejectRefillOrder,
  assignRefillRider,
  markRefillReady,
  markRefillDelivered,
  completeRefillOrder,
  getRefillTeam,
  searchUsersForRefillStation,
  addRefillTeamMember,
  removeRefillTeamMember,
  // Commission / invoices (station side)
  getMyRefillCommission,
  getMyRefillInvoices,
  payRefillInvoice,
  verifyRefillInvoicePayment,
  // Admin
  adminGetRefillStations,
  adminGetRefillStationById,
  adminApproveRefillStation,
  adminRejectRefillStation,
  adminBanRefillStation,
  adminUnbanRefillStation,
  adminOverrideCommissionRate,
  adminGetRefillSettings,
  adminUpdateRefillSettings,
  adminGetRefillInvoices,
  adminMarkInvoicePaid,
  adminWaiveInvoice,
  adminGenerateInvoicesForPeriod,
  adminRunAgingAndAutoBan,
  adminGetRefillStats,
  adminGetRefillOrders,
} from "../controllers/refillController.js";

// =============================================
//         CLOUDINARY CONFIGURATION
// =============================================
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// One storage, folders decided per-field.
//   businessLicense  → refill_documents/licenses        (image or PDF)
//   shopPhotos       → refill_documents/shop_photos      (images only)
//   cylinderPhotos   → refill_documents/cylinder_photos  (images only)
const refillStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    if (file.fieldname === "businessLicense") {
      return {
        folder: "refill_documents/licenses",
        allowed_formats: ["jpg", "png", "jpeg", "webp", "pdf"],
        resource_type: "auto",
      };
    }
    const folder =
      file.fieldname === "shopPhotos"
        ? "refill_documents/shop_photos"
        : "refill_documents/cylinder_photos";

    return {
      folder,
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      resource_type: "image",
      transformation: [
        { width: 1200, height: 1200, crop: "limit", quality: "auto" },
      ],
    };
  },
});

const upload = multer({
  storage: refillStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 21,                  // 1 license + 10 shop + 10 cylinder
  },
});

// Reusable field spec used by both apply and update-documents
const refillDocumentsUpload = upload.fields([
  { name: "businessLicense", maxCount: 1 },
  { name: "shopPhotos", maxCount: 10 },
  { name: "cylinderPhotos", maxCount: 10 },
]);

// Verify Cloudinary connection once at boot (matches userRoutes pattern)
cloudinary.api
  .ping()
  .then(() => console.log("✅ Cloudinary connected (refill routes)"))
  .catch((err) =>
    console.error("❌ Cloudinary connection failed (refill):", err.message)
  );

// =============================================
//          MAIN ROUTER  →  /api/refill
// =============================================
const refillRoutes = express.Router();

// ─── Application ─────────────────────────────────────────
// @route   POST /api/refill/stations/apply
// @desc    Apply to become a refill station. Requires business
//          license + shop photos + cylinder photos via multipart.
// @access  Private (multipart/form-data)
refillRoutes.post(
  "/stations/apply",
  protect,
  refillDocumentsUpload,
  applyAsRefillStation
);

// @route   GET /api/refill/stations/application/me
// @desc    Get my application / station profile
// @access  Private
refillRoutes.get("/stations/application/me", protect, getMyRefillApplication);

// ─── Discovery ───────────────────────────────────────────
// NOTE: static paths (/nearby, /me/*) MUST come before /:id.
// @route   GET /api/refill/stations/nearby
// @access  Private
refillRoutes.get("/stations/nearby", protect, getNearbyRefillStations);

// ─── Station self-service (owner/staff) ─────────────────
// @route   GET  /api/refill/stations/me
// @route   PUT  /api/refill/stations/me   (text fields only)
// @access  Private (refill station owner/staff)
refillRoutes
  .route("/stations/me")
  .get(protect, getMyRefillStation)
  .put(protect, updateMyRefillStation);

// @route   PUT /api/refill/stations/me/documents
// @desc    Replace license / shop photos / cylinder photos.
//          Replacing the license forces re-approval.
// @access  Private (owner) — multipart/form-data
refillRoutes.put(
  "/stations/me/documents",
  protect,
  refillDocumentsUpload,
  updateMyRefillStationDocuments
);

// @route   GET /api/refill/stations/me/dashboard
refillRoutes.get("/stations/me/dashboard", protect, getRefillStationDashboard);

// @route   GET /api/refill/stations/me/orders
refillRoutes.get("/stations/me/orders", protect, getRefillStationOrders);

// @route   PUT /api/refill/stations/me/orders/:id/accept
refillRoutes.put(
  "/stations/me/orders/:id/accept",
  protect,
  acceptRefillOrder
);

// @route   PUT /api/refill/stations/me/orders/:id/reject
refillRoutes.put(
  "/stations/me/orders/:id/reject",
  protect,
  rejectRefillOrder
);

// @route   PUT /api/refill/stations/me/orders/:id/assign-rider
refillRoutes.put(
  "/stations/me/orders/:id/assign-rider",
  protect,
  assignRefillRider
);

// @route   PUT /api/refill/stations/me/orders/:id/ready
refillRoutes.put("/stations/me/orders/:id/ready", protect, markRefillReady);

// @route   PUT /api/refill/stations/me/orders/:id/deliver
refillRoutes.put(
  "/stations/me/orders/:id/deliver",
  protect,
  markRefillDelivered
);

// @route   PUT /api/refill/stations/me/orders/:id/complete
refillRoutes.put(
  "/stations/me/orders/:id/complete",
  protect,
  completeRefillOrder
);

// ─── Team management (owner only) ───────────────────────
// @route   GET  /api/refill/stations/me/team
refillRoutes.get("/stations/me/team", protect, getRefillTeam);

// @route   GET  /api/refill/stations/me/users/search?q=
refillRoutes.get(
  "/stations/me/users/search",
  protect,
  searchUsersForRefillStation
);

// @route   POST /api/refill/stations/me/team
refillRoutes.post("/stations/me/team", protect, addRefillTeamMember);

// @route   DELETE /api/refill/stations/me/team/:userId
refillRoutes.delete(
  "/stations/me/team/:userId",
  protect,
  removeRefillTeamMember
);

// ─── Commission / invoices (station side) ──────────────
// @route   GET /api/refill/stations/me/commission
refillRoutes.get("/stations/me/commission", protect, getMyRefillCommission);

// @route   GET /api/refill/stations/me/invoices
refillRoutes.get("/stations/me/invoices", protect, getMyRefillInvoices);

// @route   POST /api/refill/stations/me/invoices/:id/pay
refillRoutes.post(
  "/stations/me/invoices/:id/pay",
  protect,
  payRefillInvoice
);

// @route   GET /api/refill/stations/me/invoices/verify?reference=
// NOTE: must be declared AFTER /invoices/:id/pay is fine because the
// methods differ (GET vs POST) — but defining verify first is safer.
refillRoutes.get(
  "/stations/me/invoices/verify",
  protect,
  verifyRefillInvoicePayment
);

// ─── Public station profile (must come AFTER /me/*) ────
// @route   GET /api/refill/stations/:id
// @access  Private
refillRoutes.get("/stations/:id", protect, getRefillStationPublic);

// =============================================
//         CUSTOMER ORDER ROUTES
// =============================================

// @route   POST /api/refill/orders
// @access  Private
refillRoutes.post("/orders", protect, createRefillOrder);

// @route   GET /api/refill/orders/verify?reference=
// @access  Private — must come before /orders/:id
refillRoutes.get("/orders/verify", protect, verifyRefillPayment);

// @route   GET /api/refill/orders/my
// @access  Private — must come before /orders/:id
refillRoutes.get("/orders/my", protect, getMyRefillOrders);

// @route   GET   /api/refill/orders/:id
// @route   PUT   /api/refill/orders/:id/confirm
// @route   PUT   /api/refill/orders/:id/cancel
refillRoutes.get("/orders/:id", protect, getRefillOrder);
refillRoutes.put("/orders/:id/confirm", protect, confirmRefillOrder);
refillRoutes.put("/orders/:id/cancel", protect, cancelRefillOrder);

// =============================================
//       ADMIN ROUTER  →  /api/admin/refill
//       (mount with protect + adminOnly middleware at the app level)
// =============================================
const refillAdminRoutes = express.Router();

// ─── Stations ────────────────────────────────────────────
refillAdminRoutes.get("/stations", adminGetRefillStations);
refillAdminRoutes.get("/stations/:id", adminGetRefillStationById);

refillAdminRoutes.put(
  "/stations/:id/approve",
  adminApproveRefillStation
);
refillAdminRoutes.put(
  "/stations/:id/reject",
  adminRejectRefillStation
);
refillAdminRoutes.put("/stations/:id/ban", adminBanRefillStation);
refillAdminRoutes.put("/stations/:id/unban", adminUnbanRefillStation);
refillAdminRoutes.put(
  "/stations/:id/commission",
  adminOverrideCommissionRate
);

// ─── Platform settings (commission %, grace days) ───────
refillAdminRoutes.get("/settings", adminGetRefillSettings);
refillAdminRoutes.put("/settings", adminUpdateRefillSettings);

// ─── Invoices ────────────────────────────────────────────
refillAdminRoutes.get("/invoices", adminGetRefillInvoices);
refillAdminRoutes.put("/invoices/:id/mark-paid", adminMarkInvoicePaid);
refillAdminRoutes.put("/invoices/:id/waive", adminWaiveInvoice);

// Cron-safe generators
refillAdminRoutes.post(
  "/invoices/generate",
  adminGenerateInvoicesForPeriod
);
refillAdminRoutes.post("/invoices/run-aging", adminRunAgingAndAutoBan);

// ─── Orders & overview stats ─────────────────────────────
refillAdminRoutes.get("/orders", adminGetRefillOrders);
refillAdminRoutes.get("/stats", adminGetRefillStats);

// =============================================
//                 EXPORTS
// =============================================
export { refillRoutes, refillAdminRoutes };
export default refillRoutes;