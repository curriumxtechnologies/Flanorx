// src/pages/GasSubscription.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import {
  Flame,
  Package,
  Calendar,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronLeft,
  RefreshCw,
  ArrowUpCircle,
  Wallet,
  TrendingUp,
  X,
  CreditCard,
  Receipt,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Bottombar from "../components/Bottombar";
import {
  useGetGasSubscriptionQuery,
  useGetGasPaymentHistoryQuery,
  useRenewGasSubscriptionMutation,
  useUpgradeGasSubscriptionMutation,
  useCancelGasSubscriptionMutation,
  useSubscribeCylinderOnlyMutation,
} from "../features/gasApiSlice";

// ─── Confirm Modal ─────────────────────────────────────────
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  loading,
  confirmText = "Confirm",
  variant = "primary",
}) => {
  if (!isOpen) return null;
  const btnColor =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-[#13ec5b] hover:bg-[#10d04e]";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 ${btnColor}`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Upgrade Modal ─────────────────────────────────────────
const UpgradeModal = ({ isOpen, onClose, onConfirm, currentSize, loading }) => {
  const [selectedSize, setSelectedSize] = useState("");
  const sizes = ["3kg", "6kg", "12kg"];
  const CYLINDER_COST = { "3kg": 100, "6kg": 200, "12kg": 300 };

  if (!isOpen) return null;

  const currentCost = CYLINDER_COST[currentSize] || 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Change Cylinder Size
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Current:{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            {currentSize}
          </span>
        </p>

        <div className="space-y-2 mb-6">
          {sizes.map((size) => {
            const newCost = CYLINDER_COST[size] || 0;
            const diff = newCost - currentCost;
            const isCurrent = size === currentSize;
            let label = "";
            if (isCurrent) label = "Current";
            else if (diff > 0) label = `+₦${diff} upgrade`;
            else if (diff < 0) label = "Free downgrade";
            else label = "Free";

            return (
              <button
                key={size}
                type="button"
                disabled={isCurrent}
                onClick={() => setSelectedSize(size)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition flex items-center justify-between ${
                  isCurrent
                    ? "border-gray-200 dark:border-gray-600 opacity-50 cursor-not-allowed"
                    : selectedSize === size
                    ? "border-[#13ec5b] bg-[#13ec5b]/10 text-gray-900 dark:text-white"
                    : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <span className="font-medium">{size}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedSize)}
            disabled={loading || !selectedSize}
            className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Cylinder Only Modal ───────────────────────────────────
const CylinderOnlyModal = ({ isOpen, onClose, onConfirm, loading, initialSize }) => {
  const [selectedSize, setSelectedSize] = useState(initialSize || "");
  const sizes = ["3kg", "6kg", "12kg"];
  const CYLINDER_COST = { "3kg": 100, "6kg": 200, "12kg": 300 };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Subscribe Cylinder Only
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          No gas is delivered — only the cylinder subscription is activated.
        </p>

        <div className="space-y-2 mb-6">
          {sizes.map((size) => {
            const isSelected = selectedSize === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition flex items-center justify-between ${
                  isSelected
                    ? "border-[#13ec5b] bg-[#13ec5b]/10 text-gray-900 dark:text-white"
                    : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <span className="font-medium">{size}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ₦{CYLINDER_COST[size]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedSize)}
            disabled={loading || !selectedSize}
            className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Payment History Item ──────────────────────────────────
const PaymentItem = ({ payment }) => {
  const getTypeLabel = (type) => {
    switch (type) {
      case "subscription_first":
        return "Subscribe + Gas";
      case "subscription_cylinder_only":
        return "Cylinder Only";
      case "subscription_renew":
        return "Renewal";
      case "subscription_upgrade":
        return "Upgrade";
      default:
        return type;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-[#13ec5b]/10 flex items-center justify-center flex-shrink-0">
          <Receipt className="h-4 w-4 text-[#13ec5b]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {getTypeLabel(payment.type)}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(
                payment.status
              )}`}
            >
              {payment.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span>{payment.cylinderSize}</span>
            {payment.quantityKg && (
              <>
                <span>·</span>
                <span>{payment.quantityKg} kg</span>
              </>
            )}
            <span>·</span>
            <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white ml-3 flex-shrink-0">
        ₦{payment.amount?.toFixed(2) || "0.00"}
      </span>
    </div>
  );
};

const GasSubscription = () => {
  const navigate = useNavigate();

  // ─── Queries & Mutations ──────────────────────────────────
  const {
    data: subscriptionData,
    isLoading,
    error,
    refetch,
  } = useGetGasSubscriptionQuery();

  const {
    data: paymentHistory = [],
    isLoading: paymentsLoading,
    refetch: refetchPayments,
  } = useGetGasPaymentHistoryQuery();

  const [renewGas, { isLoading: renewLoading }] = useRenewGasSubscriptionMutation();
  const [upgradeGas, { isLoading: upgradeLoading }] = useUpgradeGasSubscriptionMutation();
  const [cancelGas, { isLoading: cancelLoading }] = useCancelGasSubscriptionMutation();
  const [subscribeCylinderOnly, { isLoading: cylinderOnlyLoading }] = useSubscribeCylinderOnlyMutation();

  // ─── Local state ──────────────────────────────────────────
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCylinderOnlyModal, setShowCylinderOnlyModal] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // ─── Derived data ─────────────────────────────────────────
  const subscription = subscriptionData?.subscription || null;
  const isActive = subscriptionData?.isActive || false;
  const cylinderSize = subscriptionData?.cylinderSize || null;
  const daysRemaining = subscriptionData?.daysRemaining || 0;

  const nextBillingDate = subscription?.nextBillingDate
    ? new Date(subscription.nextBillingDate)
    : null;
  const startDate = subscription?.startDate
    ? new Date(subscription.startDate)
    : null;
  const gracePeriodEnd = subscription?.gracePeriodEnd
    ? new Date(subscription.gracePeriodEnd)
    : null;

  const isExpired = subscription?.status === "expired";
  const isCancelled = subscription?.status === "cancelled";
  const isPending = subscription?.status === "pending";
  const isNearExpiry = isActive && daysRemaining <= 7;

  // Latest pending payment from history (if any)
  const pendingPayment = useMemo(
    () => paymentHistory.find((p) => p.status === "pending"),
    [paymentHistory]
  );

  // ─── Handlers ─────────────────────────────────────────────
  const handleResumePayment = async () => {
    if (!pendingPayment) {
      toast.error("No pending payment found");
      refetchPayments();
      return;
    }

    try {
      switch (pendingPayment.type) {
        case "subscription_first":
          // Full subscribe + gas flow happens on /order/gas
          navigate("/order/gas");
          break;

        case "subscription_cylinder_only": {
          const result = await subscribeCylinderOnly({
            cylinderSize: pendingPayment.cylinderSize,
          }).unwrap();
          if (result.authorization_url) {
            window.location.href = result.authorization_url;
          } else {
            toast.error("Failed to initialize payment");
          }
          break;
        }

        case "subscription_renew": {
          const result = await renewGas().unwrap();
          if (result.authorization_url) {
            window.location.href = result.authorization_url;
          } else {
            toast.error("Failed to initialize payment");
          }
          break;
        }

        case "subscription_upgrade": {
          const result = await upgradeGas({
            newCylinderSize: pendingPayment.cylinderSize,
          }).unwrap();
          if (result.authorization_url) {
            window.location.href = result.authorization_url;
          } else {
            toast.error("Failed to initialize payment");
          }
          break;
        }

        default:
          toast.error("Unknown payment type");
      }
    } catch (err) {
      toast.error(err.data?.message || "Failed to resume payment");
    }
  };

  const handleCylinderOnlySubscribe = async (size) => {
    setShowCylinderOnlyModal(false);
    try {
      const result = await subscribeCylinderOnly({ cylinderSize: size }).unwrap();
      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        toast.error("Failed to initialize payment");
      }
    } catch (err) {
      toast.error(err.data?.message || "Failed to subscribe");
    }
  };

  const handleRenew = async () => {
    setShowRenewModal(false);
    try {
      const result = await renewGas().unwrap();
      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        toast.error("Failed to initialize renewal payment");
      }
    } catch (err) {
      toast.error(err.data?.message || "Failed to renew subscription");
    }
  };

  const handleUpgrade = async (newSize) => {
    setShowUpgradeModal(false);
    try {
      const result = await upgradeGas({ newCylinderSize: newSize }).unwrap();
      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else if (result.success) {
        refetch();
        refetchPayments();
        toast.success("Cylinder size changed successfully");
      } else {
        toast.error("Failed to change cylinder");
      }
    } catch (err) {
      toast.error(err.data?.message || "Failed to change cylinder");
    }
  };

  const handleCancel = async () => {
    setShowCancelModal(false);
    try {
      await cancelGas().unwrap();
      refetch();
      toast.success("Subscription cancelled");
    } catch (err) {
      toast.error(err.data?.message || "Failed to cancel subscription");
    }
  };

  // ─── Status helpers ───────────────────────────────────────
  const getStatusInfo = () => {
    if (!subscription || subscription.status === "none") {
      return {
        label: "No Subscription",
        color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      };
    }
    if (isCancelled) {
      return {
        label: "Cancelled",
        color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      };
    }
    if (isExpired) {
      return {
        label: "Expired",
        color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      };
    }
    if (isPending) {
      return {
        label: "Pending Payment",
        color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      };
    }
    if (isNearExpiry) {
      return {
        label: "Expiring Soon",
        color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      };
    }
    return {
      label: "Active",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    };
  };

  const statusInfo = getStatusInfo();

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ─── Loading ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#13ec5b]" />
            </div>
          </div>
        </div>
        <Bottombar />
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Failed to load subscription
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {error?.data?.message || "Please try again later."}
                </p>
                <button
                  onClick={() => refetch()}
                  className="mt-4 px-6 py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition inline-flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" /> Retry
                </button>
              </div>
            </div>
          </div>
        </div>
        <Bottombar />
      </div>
    );
  }

  const hasSubscription = !!subscription && subscription.status !== "none";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Gas Subscription
            </h1>
          </div>
          <button
            onClick={() => {
              refetch();
              refetchPayments();
            }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </header>

        <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
          {/* ─── No Subscription ──────────────────────────────── */}
          {!hasSubscription && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl p-8 text-center">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  No Gas Subscription
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Get your cylinder subscription and enjoy hassle-free gas swaps.
                  Already have gas in your cylinder? Subscribe cylinder-only.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => navigate("/order/gas")}
                    className="px-6 py-3 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition inline-flex items-center justify-center gap-2"
                  >
                    <Flame className="h-5 w-5" />
                    Subscribe + Order Gas
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCylinderOnlyModal(true)}
                    disabled={cylinderOnlyLoading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {cylinderOnlyLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                    Subscribe Cylinder Only
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Subscription active / pending ──────────────── */}
          {hasSubscription && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* LEFT COLUMN */}
              <div className="lg:col-span-2 space-y-5">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-[#13ec5b]/10 flex items-center justify-center">
                        <Flame className="h-7 w-7 text-[#13ec5b]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Current Plan
                        </p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {cylinderSize} Cylinder
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Pending warning */}
                {isPending && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-none sm:rounded-2xl p-5 text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Payment not completed</p>
                      <p className="mt-1 text-xs">
                        {pendingPayment
                          ? `Your ${pendingPayment.type.replace(
                              "subscription_",
                              ""
                            )} payment is pending. Complete it to activate.`
                          : "Complete your payment to activate the subscription."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-none sm:rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-[#13ec5b]" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Days Left
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {isActive ? daysRemaining : 0}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-none sm:rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-[#13ec5b]" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Renews On
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {nextBillingDate ? formatDate(nextBillingDate) : "—"}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#13ec5b]" />
                      Subscription Details
                    </h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        Cylinder Size
                      </span>
                      <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                        {cylinderSize}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        Status
                      </span>
                      <p className="text-gray-900 dark:text-white capitalize font-medium mt-0.5">
                        {subscription?.status || "—"}
                      </p>
                    </div>
                    {startDate && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          Started On
                        </span>
                        <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                          {formatDate(startDate)}
                        </p>
                      </div>
                    )}
                    {nextBillingDate && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          Next Billing
                        </span>
                        <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                          {formatDate(nextBillingDate)}
                        </p>
                      </div>
                    )}
                    {gracePeriodEnd && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          Grace Period Ends
                        </span>
                        <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                          {formatDate(gracePeriodEnd)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment History */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-[#13ec5b]" />
                      Payment History
                      {paymentHistory.length > 0 && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({paymentHistory.length})
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-[#13ec5b]">
                      {showPaymentHistory ? "Hide" : "Show"}
                    </span>
                  </button>
                  {showPaymentHistory && (
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      {paymentsLoading ? (
                        <div className="p-4 space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
                              <div className="flex-1">
                                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : paymentHistory.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No payments yet
                        </p>
                      ) : (
                        paymentHistory.map((payment) => (
                          <PaymentItem key={payment._id} payment={payment} />
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-none sm:rounded-2xl p-5 text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-2">How it works</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Your subscription is valid for 30 days from activation.</li>
                    <li>You get a 6-day grace period after expiry to renew.</li>
                    <li>Swap your empty cylinder anytime after activating.</li>
                    <li>Changing to a smaller cylinder is free.</li>
                    <li>Upgrading to a larger cylinder requires paying the difference.</li>
                  </ul>
                </div>
              </div>

              {/* RIGHT COLUMN – Actions */}
              <div className="lg:col-span-1 space-y-5">
                <div className="lg:sticky lg:top-24 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-[#13ec5b]" />
                      Manage
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Pending → Resume Payment */}
                    {isPending && (
                      <button
                        type="button"
                        onClick={handleResumePayment}
                        disabled={
                          cylinderOnlyLoading || renewLoading || upgradeLoading
                        }
                        className="w-full py-3 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {cylinderOnlyLoading || renewLoading || upgradeLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        Complete Payment
                      </button>
                    )}

                    {/* Renew */}
                    {(isActive || isExpired) && !isPending && (
                      <button
                        type="button"
                        onClick={() => setShowRenewModal(true)}
                        disabled={renewLoading}
                        className="w-full py-3 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {renewLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {isExpired ? "Reactivate" : "Renew"}
                      </button>
                    )}

                    {/* Upgrade */}
                    {(isActive || isNearExpiry) && !isPending && (
                      <button
                        type="button"
                        onClick={() => setShowUpgradeModal(true)}
                        disabled={upgradeLoading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {upgradeLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4" />
                        )}
                        Change Size
                      </button>
                    )}

                    {/* Order Swap */}
                    {isActive && !isPending && (
                      <button
                        type="button"
                        onClick={() => navigate("/order/gas")}
                        className="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition flex items-center justify-center gap-2"
                      >
                        <Package className="h-4 w-4" />
                        Order Gas Swap
                      </button>
                    )}

                    {/* Cancel */}
                    {isActive && !isPending && (
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        disabled={cancelLoading}
                        className="w-full py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition flex items-center justify-center gap-2 border border-red-200 dark:border-red-800 disabled:opacity-50"
                      >
                        {cancelLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Cancel
                      </button>
                    )}

                    {/* Start New (cancelled / expired beyond grace) */}
                    {(isCancelled ||
                      (isExpired &&
                        gracePeriodEnd &&
                        new Date() > gracePeriodEnd)) &&
                      !isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => navigate("/order/gas")}
                            className="w-full py-3 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                          >
                            <Flame className="h-4 w-4" />
                            New Subscription + Gas
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCylinderOnlyModal(true)}
                            disabled={cylinderOnlyLoading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {cylinderOnlyLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Package className="h-4 w-4" />
                            )}
                            Cylinder Only
                          </button>
                        </>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Bottombar />

      {/* ─── Modals ─────────────────────────────────────────── */}
      <CylinderOnlyModal
        isOpen={showCylinderOnlyModal}
        onClose={() => setShowCylinderOnlyModal(false)}
        onConfirm={handleCylinderOnlySubscribe}
        loading={cylinderOnlyLoading}
        initialSize={pendingPayment?.cylinderSize || cylinderSize || ""}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onConfirm={handleUpgrade}
        currentSize={cylinderSize}
        loading={upgradeLoading}
      />

      <ConfirmModal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        onConfirm={handleRenew}
        title="Renew Subscription"
        message={
          isExpired
            ? "Reactivate your subscription? You'll be redirected to complete payment."
            : "Renew your subscription for another 30 days? You'll be redirected to pay the cylinder fee."
        }
        loading={renewLoading}
        confirmText="Renew"
      />

      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel Subscription"
        message="Are you sure you want to cancel? You won't be able to swap cylinders until you subscribe again."
        loading={cancelLoading}
        confirmText="Yes, Cancel"
        variant="danger"
      />
    </div>
  );
};

export default GasSubscription;