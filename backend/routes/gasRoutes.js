// routes/gasRoutes.js  — UNCHANGED
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

router.get("/subscription", protect, getGasSubscription);
router.get("/subscription/payments", protect, getGasPaymentHistory);

router.post("/subscription", protect, subscribeGas);
router.get("/subscription/verify", protect, verifySubscriptionPayment);

router.post("/subscription/renew", protect, renewGasSubscription);
router.get("/subscription/verify-renewal", protect, verifyRenewalPayment);

router.post("/subscription/upgrade", protect, upgradeGasSubscription);
router.get("/subscription/verify-upgrade", protect, verifyUpgradePayment);

router.delete("/subscription", protect, cancelGasSubscription);

router.post("/subscription/cylinder", protect, subscribeCylinderOnly);
router.get("/subscription/verify-cylinder", protect, verifyCylinderOnlyPayment);

export default router;