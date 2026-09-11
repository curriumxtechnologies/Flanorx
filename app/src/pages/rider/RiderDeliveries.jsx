// src/pages/rider/RiderDeliveries.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  User,
  Wallet,
  Navigation,
  QrCode,
  Store,
  Flame,
  Phone,
  Mail,
  ChevronDown,
  Info,
} from "lucide-react";
import RiderSidebar from "../../components/rider/Sidebar";
import RiderBottombar from "../../components/rider/Bottombar";
import { useGetProfileQuery } from "../../features/userApiSlice";
import {
  useGetAvailableDeliveriesQuery,
  useGetMyAssignedDeliveriesQuery,
  useAcceptDeliveryMutation,
  useUpdateDeliveryProgressMutation,
} from "../../features/deliveryApiSlice";

// ═══════════════════════════════════════════════════════════
//  Confirm Modal
// ═══════════════════════════════════════════════════════════
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, loading }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => !loading && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Update Status Modal
// ═══════════════════════════════════════════════════════════
const UpdateStatusModal = ({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  loading,
}) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || "");
  if (!isOpen) return null;

  // Order of progress a rider should follow
  const allStatuses = [
    { value: "picked_up", label: "Picked Up", desc: "You've collected the order" },
    { value: "in_transit", label: "In Transit", desc: "On your way to the customer" },
    { value: "delivered", label: "Delivered", desc: "You've arrived — customer will scan QR" },
  ];

  // Only show statuses not already passed
  const currentIdx = allStatuses.findIndex((s) => s.value === currentStatus);
  const statusOptions = allStatuses.filter(
    (_, idx) => currentIdx === -1 || idx > currentIdx
  );

  const selectedOpt = allStatuses.find((s) => s.value === selectedStatus);
  const isDelivered = selectedStatus === "delivered";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => !loading && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Update Delivery Status
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          What's the current progress?
        </p>

        <div className="space-y-2 mb-4">
          {statusOptions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No further statuses available
            </p>
          ) : (
            statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedStatus(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
                  selectedStatus === opt.value
                    ? "border-[#13ec5b] bg-[#13ec5b]/10"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {opt.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {opt.desc}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Delivered warning — QR scan still needed */}
        {isDelivered && (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 mb-4 flex items-start gap-2">
            <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-yellow-800 dark:text-yellow-300">
              Marking as delivered <strong>does not complete the order</strong>.
              The customer will show you a QR code — scan it to finish.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedStatus)}
            disabled={loading || !selectedStatus}
            className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════
const RiderDeliveries = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  // ─── Determine rider type ─────────────────────────────────
  const { data: user } = useGetProfileQuery();
  const riderType = user?.riderType || userInfo?.riderType || "fuel";
  const isStationRider = riderType === "station";

  // Default tab depends on role
  const [activeTab, setActiveTab] = useState(
    isStationRider ? "my" : "available"
  );

  // ─── Queries ──────────────────────────────────────────────
  const {
    data: available = [],
    isLoading: availableLoading,
    error: availableError,
    refetch: refetchAvailable,
    isFetching: availableFetching,
  } = useGetAvailableDeliveriesQuery(undefined, {
    skip: isStationRider, // station riders have no access to the pool
    pollingInterval: 30000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: myDeliveries = [],
    isLoading: myLoading,
    error: myError,
    refetch: refetchMy,
    isFetching: myFetching,
  } = useGetMyAssignedDeliveriesQuery(undefined, {
    pollingInterval: 30000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const [acceptDelivery, { isLoading: acceptLoading }] =
    useAcceptDeliveryMutation();
  const [updateDeliveryProgress, { isLoading: updateLoading }] =
    useUpdateDeliveryProgressMutation();

  // ─── Modal state ──────────────────────────────────────────
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  // ─── Splits ───────────────────────────────────────────────
  const activeDeliveries = useMemo(
    () =>
      myDeliveries.filter(
        (d) =>
          d.status === "processing" &&
          ["accepted", "picked_up", "in_transit"].includes(d.deliveryStatus)
      ),
    [myDeliveries]
  );

  const awaitingScan = useMemo(
    () =>
      myDeliveries.filter(
        (d) => d.deliveryStatus === "delivered" && !d.verificationScannedAt
      ),
    [myDeliveries]
  );

  // ─── Handlers ──────────────────────────────────────────────
  const handleAccept = async (orderId) => {
    try {
      await acceptDelivery(orderId).unwrap();
      toast.success("Delivery accepted");
      refetchAvailable();
      refetchMy();
      setShowAcceptModal(false);
      setSelectedDelivery(null);
      setActiveTab("my");
    } catch (err) {
      toast.error(err.data?.message || "Failed to accept delivery");
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updateDeliveryProgress({
        id: orderId,
        deliveryStatus: newStatus,
      }).unwrap();
      toast.success("Status updated");
      refetchMy();
      setShowStatusModal(false);
      setStatusTarget(null);
      setSelectedDelivery(null);
    } catch (err) {
      toast.error(err.data?.message || "Failed to update status");
    }
  };

  const openDetailModal = (delivery) => {
    setSelectedDelivery(delivery);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDelivery(null);
  };

  const refresh = () => {
    if (!isStationRider) refetchAvailable();
    refetchMy();
  };

  // ─── Status colors ─────────────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
      case "accepted":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "picked_up":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "in_transit":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "delivered":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "confirmed":
        return "bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "accepted":
        return <Clock className="h-4 w-4" />;
      case "picked_up":
        return <Package className="h-4 w-4" />;
      case "in_transit":
        return <Truck className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      case "confirmed":
        return <QrCode className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const isOrderConfirmed = (d) => !!d.verificationScannedAt;
  const needsScan = (d) =>
    d.deliveryStatus === "delivered" && !d.verificationScannedAt;

  const isGas = (d) => d.orderType === "gas";
  const isPickup = (d) => d.fulfillmentType === "pickup";

  // ─── Slim List Item ────────────────────────────────────────
  const DeliveryItem = ({ delivery, isAvailable = false }) => {
    const scan = needsScan(delivery);
    const confirmed = isOrderConfirmed(delivery);

    return (
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer transition last:border-b-0"
        onClick={() => openDetailModal(delivery)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
              #{delivery.orderId || delivery._id.slice(-6)}
            </span>

            {/* Order type */}
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                isGas(delivery)
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              }`}
            >
              {isGas(delivery) ? (
                <Flame className="h-2.5 w-2.5" />
              ) : (
                <Truck className="h-2.5 w-2.5" />
              )}
              {isGas(delivery) ? "Gas" : "Fuel"}
            </span>

            {/* Delivery status */}
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${getStatusColor(
                delivery.deliveryStatus || "pending"
              )}`}
            >
              {getStatusIcon(delivery.deliveryStatus)}
              {delivery.deliveryStatus || "pending"}
            </span>

            {isAvailable && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 flex-shrink-0">
                Open
              </span>
            )}

            {scan && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-900 text-white dark:bg-gray-700 flex-shrink-0">
                <QrCode className="h-2.5 w-2.5" />
                Scan
              </span>
            )}

            {confirmed && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 flex-shrink-0">
                <CheckCircle className="h-2.5 w-2.5" />
                Done
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="truncate max-w-[120px]">
              {delivery.user?.name || "Unknown"}
            </span>
            <span className="flex-shrink-0">·</span>
            <span className="truncate">
              ₦{delivery.totalAmount?.toFixed(2) || "0.00"}
            </span>
            <span className="flex-shrink-0">·</span>
            <span className="flex-shrink-0">
              {new Date(delivery.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {isAvailable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDelivery(delivery);
                setShowAcceptModal(true);
              }}
              className="text-xs bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 px-3 py-1.5 rounded-lg transition font-semibold"
            >
              Accept
            </button>
          )}
          {!isAvailable && scan && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate("/rider/scan");
              }}
              className="text-xs bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-2.5 py-1.5 rounded-lg transition font-semibold flex items-center gap-1"
            >
              <QrCode className="h-3 w-3" />
              Scan
            </button>
          )}
          {!isAvailable && !scan && !confirmed && (
            <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg]" />
          )}
        </div>
      </div>
    );
  };

  // ─── Detail Modal ──────────────────────────────────────────
  const DetailModal = () => {
    if (!selectedDelivery) return null;
    const delivery = selectedDelivery;
    const isAvailable = activeTab === "available";
    const scan = needsScan(delivery);
    const confirmed = isOrderConfirmed(delivery);

    return (
      <>
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={closeDetailModal}
        />
        <div
          className="fixed z-50 bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto
            bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl
            lg:bottom-auto lg:top-0 lg:right-0 lg:left-auto lg:w-full lg:max-w-lg lg:rounded-none lg:h-full lg:max-h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              Order #{delivery.orderId || delivery._id.slice(-6)}
            </h3>
            <button
              onClick={closeDetailModal}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
            >
              <XCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Status row */}
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  isGas(delivery)
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                }`}
              >
                {isGas(delivery) ? (
                  <Flame className="h-3 w-3" />
                ) : (
                  <Truck className="h-3 w-3" />
                )}
                {isGas(delivery) ? "Gas" : "Fuel"}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  delivery.deliveryStatus
                )}`}
              >
                {getStatusIcon(delivery.deliveryStatus)}
                {delivery.deliveryStatus || "pending"}
              </span>
              {confirmed && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  <CheckCircle className="h-3 w-3" />
                  Confirmed
                </span>
              )}
            </div>

            {/* Customer */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <User className="h-3 w-3" /> Customer
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {delivery.user?.name || "Unknown"}
              </p>
              {delivery.user?.phone && (
                <a
                  href={`tel:${delivery.user.phone}`}
                  className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 hover:underline"
                >
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  {delivery.user.phone}
                </a>
              )}
            </div>

            {/* Items */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {isGas(delivery) ? "Gas Details" : "Fuel Details"}
              </p>
              {isGas(delivery) && delivery.gasDetails ? (
                <p className="text-sm text-gray-900 dark:text-white">
                  {delivery.gasDetails.cylinderSize} cylinder ·{" "}
                  {delivery.gasDetails.quantityKg} kg
                </p>
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">
                  {delivery.fuelType} · {delivery.quantity} L
                </p>
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Delivery earnings
                </span>
                <span className="text-sm font-bold text-[#0f9c46] dark:text-[#13ec5b]">
                  ₦{delivery.riderCommission?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>

            {/* Address */}
            {!isPickup(delivery) && delivery.deliveryAddress && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Delivery Address
                </p>
                <p className="text-sm text-gray-900 dark:text-white break-words">
                  {delivery.deliveryAddress}
                </p>
              </div>
            )}

            {/* Notes */}
            {delivery.notes && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Notes
                </p>
                <p className="text-sm text-gray-900 dark:text-white italic break-words">
                  "{delivery.notes}"
                </p>
              </div>
            )}

            {/* QR scan banner for delivered orders */}
            {scan && !isAvailable && (
              <div className="rounded-lg bg-gray-900 dark:bg-gray-800 p-4 text-center">
                <QrCode className="h-8 w-8 text-white mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">
                  Ready to confirm
                </p>
                <p className="text-xs text-gray-400 mt-1 mb-3">
                  Show the customer their QR or scan it now to complete this
                  delivery.
                </p>
                <button
                  onClick={() => {
                    closeDetailModal();
                    navigate("/rider/scan");
                  }}
                  className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  Scan QR code
                </button>
              </div>
            )}

            {/* Confirmed footer */}
            {confirmed && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2.5 rounded-lg">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Order confirmed</p>
                  {delivery.verificationScannedAt && (
                    <p className="text-[11px] opacity-80">
                      {new Date(
                        delivery.verificationScannedAt
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Update Status button */}
            {!isAvailable &&
              !scan &&
              !confirmed &&
              delivery.deliveryStatus !== "delivered" && (
                <button
                  onClick={() => {
                    setStatusTarget(delivery._id);
                    setShowStatusModal(true);
                  }}
                  className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg font-semibold transition"
                >
                  Update Status
                </button>
              )}

            {/* Accept button (available) */}
            {isAvailable && (
              <button
                onClick={() => setShowAcceptModal(true)}
                className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg font-semibold transition"
              >
                Accept Delivery
              </button>
            )}
          </div>
        </div>
      </>
    );
  };

  // ─── Main render ──────────────────────────────────────────
  const isLoading = myLoading || (!isStationRider && availableLoading);
  const error = myError || (!isStationRider && availableError);
  const isModalOpen = showDetailModal || showAcceptModal || showStatusModal;
  const isFetching = myFetching || (!isStationRider && availableFetching);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RiderSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
              Deliveries
            </h1>
            {isStationRider && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                Orders assigned by your station
              </p>
            )}
          </div>
          <button
            onClick={refresh}
            disabled={isFetching}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={`h-5 w-5 text-gray-500 dark:text-gray-400 ${
                isFetching ? "animate-spin" : ""
              }`}
            />
          </button>
        </header>

        <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
          {/* Awaiting scan banner */}
          {!isLoading && awaitingScan.length > 0 && (
            <div className="mb-4 rounded-2xl bg-gray-900 dark:bg-gray-800 border border-gray-800 dark:border-gray-700 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <QrCode className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {awaitingScan.length}{" "}
                    {awaitingScan.length === 1
                      ? "delivery is waiting"
                      : "deliveries are waiting"}{" "}
                    for a QR scan
                  </p>
                  <p className="text-xs text-gray-400">
                    Customer will show you their code when you arrive.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/rider/scan")}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg text-sm font-semibold transition"
              >
                <QrCode className="h-4 w-4" />
                <span className="hidden sm:inline">Scan</span>
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {!isStationRider && (
              <button
                onClick={() => setActiveTab("available")}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
                  activeTab === "available"
                    ? "bg-[#13ec5b] text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Available ({available.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab("my")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
                activeTab === "my" || isStationRider
                  ? "bg-[#13ec5b] text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              My Deliveries ({myDeliveries.length})
            </button>
          </div>

          {/* List */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {activeTab === "available"
                  ? "Available Deliveries"
                  : "My Deliveries"}
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {activeTab === "available"
                  ? `${available.length} found`
                  : `${myDeliveries.length} total · ${
                      activeDeliveries.length +
                      awaitingScan.length
                    } active`}
              </span>
            </div>

            {isLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-3 animate-pulse"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                Failed to load deliveries. Please try again.
              </div>
            ) : activeTab === "available" && available.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No available deliveries right now
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  New fuel orders will appear here automatically.
                </p>
              </div>
            ) : activeTab === "my" && myDeliveries.length === 0 ? (
              <div className="text-center py-12">
                {isStationRider ? (
                  <>
                    <Store className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No deliveries assigned to you yet
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Your station will assign gas orders when customers place
                      them.
                    </p>
                  </>
                ) : (
                  <>
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      You haven't accepted any deliveries yet
                    </p>
                    <button
                      onClick={() => setActiveTab("available")}
                      className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
                    >
                      Browse available deliveries
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {activeTab === "available"
                  ? available.map((delivery) => (
                      <DeliveryItem
                        key={delivery._id}
                        delivery={delivery}
                        isAvailable={true}
                      />
                    ))
                  : myDeliveries.map((delivery) => (
                      <DeliveryItem
                        key={delivery._id}
                        delivery={delivery}
                        isAvailable={false}
                      />
                    ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isModalOpen && <RiderBottombar />}

      {/* Modals */}
      <DetailModal />

      <ConfirmModal
        isOpen={showAcceptModal}
        onClose={() => {
          setShowAcceptModal(false);
          setSelectedDelivery(null);
        }}
        onConfirm={() => handleAccept(selectedDelivery?._id)}
        title="Accept Delivery"
        message={`Are you sure you want to accept order #${
          selectedDelivery?.orderId || selectedDelivery?._id?.slice(-6)
        }?`}
        loading={acceptLoading}
      />

      <UpdateStatusModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setStatusTarget(null);
        }}
        onConfirm={(newStatus) => handleUpdateStatus(statusTarget, newStatus)}
        currentStatus={selectedDelivery?.deliveryStatus}
        loading={updateLoading}
      />
    </div>
  );
};

export default RiderDeliveries;