// routes/gasRoutes.js
import express from "express";
import {
  getGasSubscription,
  getGasPaymentHistory,
  subscribeGas,
  verifySubscriptionPayment,
  renewGasSubscription,
  verifyRenewalPayment,
  upgradeGasSubscription,
  verifyUpgradePayment,
  cancelGasSubscription,
  subscribeCylinderOnly,
  verifyCylinderOnlyPayment,
} from "../controllers/gasController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── Subscription (read) ──────────────────────────────────────
router.get("/subscription", protect, getGasSubscription);
router.get("/subscription/payments", protect, getGasPaymentHistory);

// ─── Subscribe (with gas order) ───────────────────────────────
router.post("/subscription", protect, subscribeGas);
router.get("/subscription/verify", protect, verifySubscriptionPayment);

// ─── Renew ────────────────────────────────────────────────────
router.post("/subscription/renew", protect, renewGasSubscription);
router.get("/subscription/verify-renewal", protect, verifyRenewalPayment);

// ─── Upgrade / Change size ────────────────────────────────────
router.post("/subscription/upgrade", protect, upgradeGasSubscription);
router.get("/subscription/verify-upgrade", protect, verifyUpgradePayment);

// ─── Cancel ───────────────────────────────────────────────────
router.delete("/subscription", protect, cancelGasSubscription);

// ─── Cylinder-only subscription ───────────────────────────────
router.post("/subscription/cylinder", protect, subscribeCylinderOnly);
router.get("/subscription/verify-cylinder", protect, verifyCylinderOnlyPayment);

export default router;