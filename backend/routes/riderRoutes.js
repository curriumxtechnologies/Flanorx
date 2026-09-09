import express from "express";
import {
  applyForRider,
  getRiderApplicationStatus,
  updateRiderApplication,
  getRiderApplications,
  approveRider,
  rejectRider,
} from "../controllers/riderController.js";
import { protect } from "../middleware/authMiddleware.js";  // ✅ role checks are inside controller
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const router = express.Router();

// ─── Cloudinary configuration ──────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// ─── Multer storage ─────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "flanorx_rider_credentials",
    allowed_formats: ["jpg", "png", "jpeg"],
  }),
});

const upload = multer({ storage });

cloudinary.api
  .ping()
  .then(() => console.log("✅ Cloudinary connected successfully"))
  .catch((err) => console.error("❌ Cloudinary not connected:", err?.message));

// ──────────────────────────────────────────────────────────────
// 🔹 USER (logged‑in) endpoints – access via /api/users/rider
// ──────────────────────────────────────────────────────────────

// @route   POST /api/users/rider/apply
// @desc    Submit application to become a rider
// @access  Private (user only)
router.post(
  "/apply",
  protect,
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "ninPicture", maxCount: 1 },
    { name: "proofOfAddress", maxCount: 1 },
  ]),
  applyForRider
);

// @route   GET /api/users/rider/status
// @desc    Get current application status and submitted data
// @access  Private (user only)
router.get("/status", protect, getRiderApplicationStatus);

// @route   PUT /api/users/rider/update
// @desc    Update application details (if pending/rejected)
// @access  Private (user only)
router.put(
  "/update",
  protect,
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "ninPicture", maxCount: 1 },
    { name: "proofOfAddress", maxCount: 1 },
  ]),
  updateRiderApplication
);

// ──────────────────────────────────────────────────────────────
// 🔸 ADMIN‑only endpoints – access via /api/admin/riders
// ──────────────────────────────────────────────────────────────

// @route   GET /api/admin/riders/applications?status=pending
// @desc    Get all rider applications (filter by status)
// @access  Private/Admin
router.get("/applications", protect, (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}, getRiderApplications);

// @route   PUT /api/admin/riders/:userId/approve
// @desc    Approve a rider application
// @access  Private/Admin
router.put("/:userId/approve", protect, (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}, approveRider);

// @route   PUT /api/admin/riders/:userId/reject
// @desc    Reject a rider application with a reason
// @access  Private/Admin
router.put("/:userId/reject", protect, (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}, rejectRider);

export default router;