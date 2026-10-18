// src/pages/refill/RefillOrders.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Phone,
  MapPin,
  ChevronRight,
  Loader2,
  Droplet,
  User,
  AlertCircle,
  X,
} from "lucide-react";

import {
  useGetRefillStationOrdersQuery,
  useAcceptRefillOrderMutation,
  useRejectRefillOrderMutation,
  useMarkRefillReadyMutation,
  useMarkRefillDeliveredMutation,
  useCompleteRefillOrderMutation,
  useAssignRefillRiderMutation,
  useGetRefillTeamQuery,
} from "../../features/refillApiSlice";

import RefillSidebar from "../../components/refill/RefillSidebar";
import RefillBottombar from "../../components/refill/RefillBottombar";

const formatNaira = (n) =>
  `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

const getOrderStatusColor = (status) => {
  switch (status) {
    case "paid":
      return "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400";
    case "accepted":
      return "text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400";
    case "ready":
      return "text-purple-700 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400";
    case "delivered":
      return "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400";
    case "completed":
      return "text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400";
    case "cancelled":
    case "rejected":
      return "text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "text-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
  }
};

const RefillOrders = () => {
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState("active");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, orderId: null });
  const [rejectReason, setRejectReason] = useState("");
  const [assignRiderModal, setAssignRiderModal] = useState({ isOpen: false, orderId: null });

  // Queries
  const { data: orders = [], isLoading, error, refetch } =
    useGetRefillStationOrdersQuery(undefined, {
      pollingInterval: 15000, // Refresh every 15s for new orders
      refetchOnFocus: true,
    });

  const { data: teamMembers = [] } = useGetRefillTeamQuery();
  const riders = useMemo(
    () => teamMembers.filter((m) => m.refillStationRole === "rider"),
    [teamMembers]
  );

  // Mutations
  const [acceptOrder, { isLoading: isAccepting }] = useAcceptRefillOrderMutation();
  const [rejectOrder, { isLoading: isRejecting }] = useRejectRefillOrderMutation();
  const [markReady, { isLoading: isMarkingReady }] = useMarkRefillReadyMutation();
  const [markDelivered, { isLoading: isMarkingDelivered }] = useMarkRefillDeliveredMutation();
  const [completeOrder, { isLoading: isCompleting }] = useCompleteRefillOrderMutation();
  const [assignRider, { isLoading: isAssigning }] = useAssignRefillRiderMutation();

  const isMutating =
    isAccepting || isRejecting || isMarkingReady || isMarkingDelivered || isCompleting || isAssigning;

  // ─── Filtered Orders ─────────────────────────────────────
  const filteredOrders = useMemo(() => {
    if (activeTab === "all") return orders;
    if (activeTab === "active") {
      return orders.filter((o) => ["paid", "accepted", "ready"].includes(o.status));
    }
    if (activeTab === "completed") {
      return orders.filter((o) => ["delivered", "completed"].includes(o.status));
    }
    if (activeTab === "cancelled") {
      return orders.filter((o) => ["cancelled", "rejected"].includes(o.status));
    }
    return orders;
  }, [orders, activeTab]);

  // ─── Handlers ────────────────────────────────────────────
  const handleAccept = async (id) => {
    try {
      await acceptOrder(id).unwrap();
      refetch();
      if (selectedOrder?._id === id) setSelectedOrder({ ...selectedOrder, status: "accepted" });
    } catch (err) {
      alert(err.data?.message || "Failed to accept order");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return alert("Please provide a reason");
    try {
      await rejectOrder({ id: rejectModal.orderId, reason: rejectReason }).unwrap();
      setRejectModal({ isOpen: false, orderId: null });
      setRejectReason("");
      refetch();
      if (selectedOrder?._id === rejectModal.orderId) setSelectedOrder(null);
    } catch (err) {
      alert(err.data?.message || "Failed to reject order");
    }
  };

  const handleMarkReady = async (id) => {
    try {
      await markReady(id).unwrap();
      refetch();
      if (selectedOrder?._id === id) setSelectedOrder({ ...selectedOrder, status: "ready" });
    } catch (err) {
      alert(err.data?.message || "Failed to mark ready");
    }
  };

  const handleMarkDelivered = async (id) => {
    try {
      await markDelivered(id).unwrap();
      refetch();
      if (selectedOrder?._id === id) setSelectedOrder({ ...selectedOrder, status: "delivered" });
    } catch (err) {
      alert(err.data?.message || "Failed to mark delivered");
    }
  };

  const handleComplete = async (id) => {
    try {
      await completeOrder(id).unwrap();
      refetch();
      if (selectedOrder?._id === id) setSelectedOrder({ ...selectedOrder, status: "completed" });
    } catch (err) {
      alert(err.data?.message || "Failed to complete order");
    }
  };

  const handleAssignRider = async (riderId) => {
    try {
      await assignRider({ id: assignRiderModal.orderId, riderId }).unwrap();
      setAssignRiderModal({ isOpen: false, orderId: null });
      refetch();
    } catch (err) {
      alert(err.data?.message || "Failed to assign rider");
    }
  };

  // ─── Main Render ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RefillSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
              Manage Orders
            </h1>
          </div>
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          {/* Tabs */}
          <div className="flex overflow-x-auto gap-2 mb-4 pb-2 scrollbar-hide">
            {[
              { id: "active", label: "Active" },
              { id: "completed", label: "Completed" },
              { id: "cancelled", label: "Cancelled" },
              { id: "all", label: "All Orders" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? "bg-[#13ec5b] text-white shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 text-[#13ec5b] animate-spin mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Loading orders...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-600 dark:text-red-400">Failed to load orders.</p>
                <button onClick={refetch} className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium">
                  Try again
                </button>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No orders found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {activeTab === "active"
                    ? "You have no active orders right now."
                    : "Orders in this category will appear here."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-[15%]" />
                      <col className="w-[20%]" />
                      <col className="w-[15%]" />
                      <col className="w-[15%]" />
                      <col className="w-[15%]" />
                      <col className="w-[20%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Order</th>
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Customer</th>
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Type</th>
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Total</th>
                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                        <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr
                          key={order._id}
                          className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                            <div className="truncate">#{order._id.slice(-6)}</div>
                            <div className="text-[10px] text-gray-500">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="truncate font-medium text-gray-900 dark:text-white">
                              {order.customer?.name || "Customer"}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate">
                              {order.customer?.phone || ""}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                              {order.fulfillmentType}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {order.cylinderSize} × {order.quantity}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                            {formatNaira(order.totalAmount)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${getOrderStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              {order.status === "paid" && (
                                <>
                                  <button
                                    onClick={() => handleAccept(order._id)}
                                    disabled={isMutating}
                                    className="px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 rounded-lg text-xs font-medium transition"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => setRejectModal({ isOpen: true, orderId: order._id })}
                                    className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-xs font-medium transition"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {order.status === "accepted" && (
                                <button
                                  onClick={() => handleMarkReady(order._id)}
                                  disabled={isMutating}
                                  className="px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-lg text-xs font-medium transition"
                                >
                                  Mark Ready
                                </button>
                              )}
                              {order.status === "ready" && order.fulfillmentType === "delivery" && (
                                <button
                                  onClick={() => setAssignRiderModal({ isOpen: true, orderId: order._id })}
                                  className="px-2 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg text-xs font-medium transition"
                                >
                                  Assign Rider
                                </button>
                              )}
                              {order.status === "ready" && order.fulfillmentType === "pickup" && (
                                <button
                                  onClick={() => handleComplete(order._id)}
                                  disabled={isMutating}
                                  className="px-2 py-1 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-medium transition"
                                >
                                  Complete
                                </button>
                              )}
                              {order.status === "delivered" && (
                                <button
                                  onClick={() => handleComplete(order._id)}
                                  disabled={isMutating}
                                  className="px-2 py-1 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-medium transition"
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List */}
                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredOrders.map((order) => (
                    <div
                      key={order._id}
                      className="p-4 flex flex-col gap-3"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            #{order._id.slice(-6)} · {order.customer?.name || "Customer"}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {order.cylinderSize} × {order.quantity} · {order.fulfillmentType}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize flex-shrink-0 ${getOrderStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatNaira(order.totalAmount)}
                        </p>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {order.status === "paid" && (
                            <>
                              <button
                                onClick={() => handleAccept(order._id)}
                                className="px-3 py-1.5 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-lg text-xs font-medium"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => setRejectModal({ isOpen: true, orderId: order._id })}
                                className="px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-xs font-medium"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {order.status === "accepted" && (
                            <button
                              onClick={() => handleMarkReady(order._id)}
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-lg text-xs font-medium"
                            >
                              Mark Ready
                            </button>
                          )}
                          {order.status === "ready" && order.fulfillmentType === "delivery" && (
                            <button
                              onClick={() => setAssignRiderModal({ isOpen: true, orderId: order._id })}
                              className="px-3 py-1.5 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg text-xs font-medium"
                            >
                              Assign Rider
                            </button>
                          )}
                          {order.status === "ready" && order.fulfillmentType === "pickup" && (
                            <button
                              onClick={() => handleComplete(order._id)}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium"
                            >
                              Complete
                            </button>
                          )}
                          {order.status === "delivered" && (
                            <button
                              onClick={() => handleComplete(order._id)}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <RefillBottombar />

      {/* ─── Order Details Modal ────────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Order #{selectedOrder._id.slice(-6)}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getOrderStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Total Amount</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {formatNaira(selectedOrder.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Customer</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedOrder.customer?.name || "Customer"}
                  </p>
                  <p className="text-xs text-gray-500">{selectedOrder.customer?.phone}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Fulfillment</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {selectedOrder.fulfillmentType}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Items</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedOrder.quantity} × {selectedOrder.cylinderSize} Refill
                  </p>
                </div>
                {selectedOrder.fulfillmentType === "delivery" && selectedOrder.deliveryAddress && (
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs mb-1">Delivery Address</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder.deliveryAddress}
                    </p>
                  </div>
                )}
                {selectedOrder.notes && (
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs mb-1">Notes</p>
                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                      {selectedOrder.notes}
                    </p>
                  </div>
                )}
                {selectedOrder.assignedRider && (
                  <div className="col-span-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <p className="text-gray-500 text-xs mb-1">Assigned Rider</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder.assignedRider.name} · {selectedOrder.assignedRider.phone}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions inside Modal */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex gap-3">
                {selectedOrder.status === "paid" && (
                  <>
                    <button
                      onClick={() => handleAccept(selectedOrder._id)}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition"
                    >
                      Accept Order
                    </button>
                    <button
                      onClick={() => setRejectModal({ isOpen: true, orderId: selectedOrder._id })}
                      className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium rounded-xl transition"
                    >
                      Reject
                    </button>
                  </>
                )}
                {selectedOrder.status === "accepted" && (
                  <button
                    onClick={() => handleMarkReady(selectedOrder._id)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition"
                  >
                    Mark as Ready
                  </button>
                )}
                {selectedOrder.status === "ready" && selectedOrder.fulfillmentType === "delivery" && (
                  <button
                    onClick={() => setAssignRiderModal({ isOpen: true, orderId: selectedOrder._id })}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition"
                  >
                    Assign Rider
                  </button>
                )}
                {selectedOrder.status === "ready" && selectedOrder.fulfillmentType === "pickup" && (
                  <button
                    onClick={() => handleComplete(selectedOrder._id)}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition"
                  >
                    Complete Order
                  </button>
                )}
                {selectedOrder.status === "delivered" && (
                  <button
                    onClick={() => handleComplete(selectedOrder._id)}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition"
                  >
                    Confirm Completion
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reject Modal ───────────────────────────────────────── */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Reject Order
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Please provide a reason. The customer will be notified and refunded.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows="3"
              placeholder="e.g., Out of stock, unable to deliver to this area..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm mb-4 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModal({ isOpen: false, orderId: null });
                  setRejectReason("");
                }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRejecting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Assign Rider Modal ─────────────────────────────────── */}
      {assignRiderModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Assign a Rider
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Select a rider from your team to handle this delivery.
            </p>
            
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {riders.length === 0 ? (
                <p className="text-sm text-center text-gray-500 py-4">No riders found. Add riders in Team settings.</p>
              ) : (
                riders.map((rider) => (
                  <button
                    key={rider._id}
                    onClick={() => handleAssignRider(rider._id)}
                    disabled={isAssigning}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#13ec5b] dark:hover:border-[#13ec5b] hover:bg-[#13ec5b]/5 transition flex items-center gap-3 disabled:opacity-50"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {rider.name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{rider.phone}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setAssignRiderModal({ isOpen: false, orderId: null })}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefillOrders;