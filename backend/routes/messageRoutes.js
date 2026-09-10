// routes/messageRoutes.js
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { protect } from "../middleware/authMiddleware.js";
import {
  previewRecipients,
  sendMessageController,
  sendToUser,
  sendToWaitlistEntry,
  sendTestMessage,
} from "../controllers/messageController.js";

const router = express.Router();

// ─── Cloudinary config (same pattern as userRoutes) ───────
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// ─── Storage for message attachments ──────────────────────
const attachmentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "message_attachments",
    resource_type: "auto",
    public_id: `${Date.now()}-${(file.originalname || "file").split(".")[0]}`,
  }),
});

const upload = multer({
  storage: attachmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

// =============================================
//           ADMIN ROUTES
// =============================================

// @route   GET  /api/messages/recipients
// @desc    Preview recipient count for an audience
router.get("/recipients", protect, previewRecipients);

// @route   POST /api/messages/send
// @desc    Flexible send — audience, userIds, waitlistIds, emails, or to
router.post(
  "/send",
  protect,
  upload.array("attachments", 5),
  sendMessageController
);

// @route   POST /api/messages/user/:userId
// @desc    Send a single message to one registered user
router.post(
  "/user/:userId",
  protect,
  upload.array("attachments", 5),
  sendToUser
);

// @route   POST /api/messages/waitlist/:entryId
// @desc    Send a single message to one waitlist entry
router.post(
  "/waitlist/:entryId",
  protect,
  upload.array("attachments", 5),
  sendToWaitlistEntry
);

// @route   POST /api/messages/test
// @desc    Send a test message to the admin's own email
router.post(
  "/test",
  protect,
  upload.array("attachments", 5),
  sendTestMessage
);

export default router;