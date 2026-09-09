// src/pages/rider/RiderDeliveries.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
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
  ChevronDown,
  Eye,
  User,
  Wallet,
  Navigation,
} from "lucide-react";
import RiderSidebar from "../../components/rider/Sidebar";
import RiderBottombar from "../../components/rider/Bottombar";
import {
  useGetAvailableDeliveriesQuery,
  useGetMyAssignedDeliveriesQuery,
  useAcceptDeliveryMutation,
  useUpdateDeliveryProgressMutation,
} from "../../features/deliveryApiSlice";

// ─── Custom Modal Components ───────────────────────────────
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, loading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const UpdateStatusModal = ({ isOpen, onClose, onConfirm, currentStatus, loading }) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || "");
  if (!isOpen) return null;

  const statusOptions = [
    { value: "picked_up", label: "Picked Up" },
    { value: "in_transit", label: "In Transit" },
    { value: "delivered", label: "Delivered" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Update Delivery Status</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select the new status:</p>
        <div className="space-y-2 mb-6">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedStatus(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
                selectedStatus === opt.value
                  ? "border-[#13ec5b] bg-[#13ec5b]/10 text-gray-900 dark:text-white"
                  : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedStatus)}
            disabled={loading || !selectedStatus}
            className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────
const RiderDeliveries = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("available");

  // ─── Queries ──────────────────────────────────────────────
  const {
    data: available = [],
    isLoading: availableLoading,
    error: availableError,
    refetch: refetchAvailable,
  } = useGetAvailableDeliveriesQuery();

  const {
    data: myDeliveries = [],
    isLoading: myLoading,
    error: myError,
    refetch: refetchMy,
  } = useGetMyAssignedDeliveriesQuery();

  const [acceptDelivery, { isLoading: acceptLoading }] = useAcceptDeliveryMutation();
  const [updateDeliveryProgress, { isLoading: updateLoading }] = useUpdateDeliveryProgressMutation();

  // ─── Local state for modals ──────────────────────────────
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  // ─── Handlers ──────────────────────────────────────────────
  const handleAccept = async (orderId) => {
    try {
      await acceptDelivery(orderId).unwrap();
      refetchAvailable();
      refetchMy();
      setShowAcceptModal(false);
      setSelectedDelivery(null);
    } catch (err) {
      alert(err.data?.message || "Failed to accept delivery");
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updateDeliveryProgress({ id: orderId, deliveryStatus: newStatus }).unwrap();
      refetchMy();
      setShowStatusModal(false);
      setStatusTarget(null);
      setSelectedDelivery(null);
    } catch (err) {
      alert(err.data?.message || "Failed to update status");
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

  // ─── Status colors ─────────────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
      case "accepted": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "picked_up": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "in_transit": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "delivered": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "confirmed": return "bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "accepted": return <Clock className="h-4 w-4" />;
      case "picked_up": return <Package className="h-4 w-4" />;
      case "in_transit": return <Truck className="h-4 w-4" />;
      case "delivered": return <CheckCircle className="h-4 w-4" />;
      case "confirmed": return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // ─── Slim List Item ────────────────────────────────────────
  const DeliveryItem = ({ delivery, isAvailable = false }) => (
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer transition"
      onClick={() => openDetailModal(delivery)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
            #{delivery.orderId}
          </span>
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(
              delivery.deliveryStatus || "pending"
            )}`}
          >
            {getStatusIcon(delivery.deliveryStatus)}
            {delivery.deliveryStatus || "pending"}
          </span>
          {isAvailable && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              Available
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{delivery.user?.name || "Unknown"}</span>
          <span>·</span>
          <span>₦{delivery.totalAmount?.toFixed(2) || "0.00"}</span>
          <span>·</span>
          <span>{new Date(delivery.createdAt).toLocaleDateString()}</span>
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
            className="text-xs bg-[#13ec5b] hover:bg-[#10d04e] text-white px-3 py-1.5 rounded-lg transition"
          >
            Accept
          </button>
        )}
        <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg]" />
      </div>
    </div>
  );

  // ─── Detail Modal ──────────────────────────────────────────
  const DetailModal = () => {
    if (!selectedDelivery) return null;
    const delivery = selectedDelivery;
    const isAvailable = activeTab === "available";

    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={closeDetailModal} />
        <div
          className="fixed z-50 bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto transition-transform duration-300 ease-in-out
            bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl
            lg:bottom-auto lg:top-0 lg:right-0 lg:left-auto lg:w-full lg:max-w-lg lg:rounded-none lg:h-full lg:max-h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              Order #{delivery.orderId}
            </h3>
            <button onClick={closeDetailModal} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <XCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Customer</p>
                <p className="text-gray-900 dark:text-white">{delivery.user?.name || "Unknown"}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Amount</p>
                <p className="text-gray-900 dark:text-white">₦{delivery.totalAmount?.toFixed(2) || "0.00"}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Status</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(delivery.deliveryStatus)}`}>
                  {getStatusIcon(delivery.deliveryStatus)}
                  {delivery.deliveryStatus || "pending"}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Date</p>
                <p className="text-gray-900 dark:text-white">{new Date(delivery.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {delivery.deliveryAddress && (
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Address</p>
                <p className="text-sm text-gray-900 dark:text-white">{delivery.deliveryAddress}</p>
              </div>
            )}

            {delivery.notes && (
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Notes</p>
                <p className="text-sm text-gray-900 dark:text-white">{delivery.notes}</p>
              </div>
            )}

            {!isAvailable && delivery.deliveryStatus !== "delivered" && delivery.deliveryStatus !== "confirmed" && (
              <button
                onClick={() => {
                  setStatusTarget(delivery._id);
                  setShowStatusModal(true);
                }}
                className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition"
              >
                Update Status
              </button>
            )}

            {isAvailable && (
              <button
                onClick={() => {
                  setShowAcceptModal(true);
                }}
                className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition"
              >
                Accept Delivery
              </button>
            )}

            {(delivery.deliveryStatus === "delivered" || delivery.deliveryStatus === "confirmed") && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Completed</span>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  // ─── Main render ──────────────────────────────────────────
  const isLoading = availableLoading || myLoading;
  const error = availableError || myError;
  const isModalOpen = showDetailModal || showAcceptModal || showStatusModal;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RiderSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Deliveries</h1>
          <button
            onClick={() => {
              refetchAvailable();
              refetchMy();
            }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </header>

        <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
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
            <button
              onClick={() => setActiveTab("my")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
                activeTab === "my"
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
                {activeTab === "available" ? "Available Deliveries" : "My Deliveries"}
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {activeTab === "available" ? available.length : myDeliveries.length} found
              </span>
            </div>

            {isLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
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
                <p className="text-gray-500 dark:text-gray-400">No available deliveries</p>
              </div>
            ) : activeTab === "my" && myDeliveries.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">You haven't accepted any deliveries yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {activeTab === "available"
                  ? available.map((delivery) => (
                      <DeliveryItem key={delivery._id} delivery={delivery} isAvailable={true} />
                    ))
                  : myDeliveries.map((delivery) => (
                      <DeliveryItem key={delivery._id} delivery={delivery} isAvailable={false} />
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
        message={`Are you sure you want to accept order #${selectedDelivery?.orderId}?`}
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