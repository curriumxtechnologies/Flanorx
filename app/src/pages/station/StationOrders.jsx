// src/pages/station/StationOrders.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Package,
  Search,
  X,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Truck,
  Store,
  Filter,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  QrCode,
  Calendar,
  Flame,
  UserPlus,
} from "lucide-react";
import StationSidebar from "../../components/station/Sidebar";
import StationBottombar from "../../components/station/Bottombar";
import {
  useGetStationOrdersQuery,
  useAssignRiderToOrderMutation,
  useMarkOrderReadyMutation,
  useGetStationRidersQuery,
} from "../../features/stationApiSlice";

// ─── Filter options ───────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "", label: "All Order Status" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
];

const DELIVERY_OPTIONS = [
  { value: "", label: "All Delivery" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "picked_up", label: "Picked Up" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "confirmed", label: "Confirmed" },
];

const FULFILLMENT_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "delivery", label: "Delivery" },
  { value: "pickup", label: "Pickup" },
];

// ═══════════════════════════════════════════════════════════
//  Custom Dropdown (top-level, stable reference)
// ═══════════════════════════════════════════════════════════
const CustomDropdown = ({
  value,
  options,
  onChange,
  placeholder = "Select...",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);
  const display = selected ? selected.label : placeholder;
  const isActive = value !== "";

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg text-sm transition min-w-[150px] ${
          isActive
            ? "bg-[#13ec5b]/10 border-[#13ec5b]/40 text-[#0f9c46] dark:text-[#13ec5b] font-medium"
            : "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
      >
        <span className="truncate text-left">{display}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 max-h-60 overflow-auto py-1">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value || "__all"}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition flex items-center justify-between gap-2 ${
                  isSelected
                    ? "bg-[#13ec5b]/10 text-[#0f9c46] dark:text-[#13ec5b] font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#13ec5b] flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Main page
// ═══════════════════════════════════════════════════════════
const StationOrders = () => {
  // ─── Filters ──────────────────────────────────────────────
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    deliveryStatus: "",
    fulfillmentType: "",
  });
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ─── Queries ──────────────────────────────────────────────
  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetStationOrdersQuery(
    {
      status: filters.status || undefined,
      deliveryStatus: filters.deliveryStatus || undefined,
      fulfillmentType: filters.fulfillmentType || undefined,
    },
    {
      pollingInterval: 30000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );

  const { data: riders = [] } = useGetStationRidersQuery();

  // ─── Local filtering (search) ─────────────────────────────
  const filteredOrders = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      return (
        o.orderId?.toLowerCase().includes(q) ||
        o.user?.name?.toLowerCase().includes(q) ||
        o.user?.email?.toLowerCase().includes(q) ||
        o.user?.phone?.toLowerCase().includes(q) ||
        o.deliveryAddress?.toLowerCase().includes(q)
      );
    });
  }, [orders, filters.search]);

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "" ||
    filters.deliveryStatus !== "" ||
    filters.fulfillmentType !== "";

  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.deliveryStatus ? 1 : 0) +
    (filters.fulfillmentType ? 1 : 0);

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      deliveryStatus: "",
      fulfillmentType: "",
    });
  };

  // ─── Status color helpers ─────────────────────────────────
  const getOrderStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "processing":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "completed":
        return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "cancelled":
        return "text-red-600 bg-red-50 dark:bg-red-900/20";
      case "failed":
        return "text-red-700 bg-red-100 dark:bg-red-900/30";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-800";
    }
  };

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "accepted":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "picked_up":
        return "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20";
      case "in_transit":
        return "text-purple-600 bg-purple-50 dark:bg-purple-900/20";
      case "delivered":
        return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "confirmed":
        return "text-green-700 bg-green-100 dark:bg-green-900/30";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-800";
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString() : "—";

  const formatDateTime = (date) =>
    date ? new Date(date).toLocaleString() : "—";

  // ─── Error state ──────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <StationSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Orders
            </h1>
          </header>
          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">
                Failed to load orders
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {error?.data?.message || error?.message || "Please try again"}
              </p>
            </div>
          </div>
        </div>
        <StationBottombar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StationSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Orders
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => refetch()}
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
            <button
              onClick={() => setShowFilterSheet(true)}
              className="lg:hidden relative flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 min-w-[16px] h-4 px-1 bg-[#13ec5b] text-gray-900 rounded-full flex items-center justify-center text-[9px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="w-full px-1 sm:px-4 lg:px-6 py-4">
          {/* Desktop filters */}
          <div className="hidden lg:flex flex-wrap items-center gap-3 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
                placeholder="Search by order ID, customer, phone, or address..."
                autoComplete="off"
                className="w-full pl-9 pr-9 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, search: "" }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>

            <CustomDropdown
              value={filters.status}
              options={STATUS_OPTIONS}
              onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              placeholder="Order Status"
            />

            <CustomDropdown
              value={filters.deliveryStatus}
              options={DELIVERY_OPTIONS}
              onChange={(v) =>
                setFilters((f) => ({ ...f, deliveryStatus: v }))
              }
              placeholder="Delivery Status"
            />

            <CustomDropdown
              value={filters.fulfillmentType}
              options={FULFILLMENT_OPTIONS}
              onChange={(v) =>
                setFilters((f) => ({ ...f, fulfillmentType: v }))
              }
              placeholder="Type"
            />

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Orders container */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1 ? "Order" : "Orders"}
                {hasActiveFilters && (
                  <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-2">
                    filtered from {orders.length}
                  </span>
                )}
              </h2>
            </div>

            {isLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-3 animate-pulse"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                    </div>
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {hasActiveFilters
                    ? "No orders match your filters"
                    : "No orders at your station yet"}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-[14%]" />
                      <col className="w-[20%]" />
                      <col className="w-[10%]" />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className="w-[14%]" />
                      <col className="w-[18%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Order
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Customer
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Type
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Amount
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Delivery
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Status
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <OrderRow
                          key={order._id}
                          order={order}
                          onView={() => setSelectedOrder(order)}
                          getOrderStatusColor={getOrderStatusColor}
                          getDeliveryStatusColor={getDeliveryStatusColor}
                          formatDate={formatDate}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile slim list */}
                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredOrders.map((order) => (
                    <OrderSlimCard
                      key={order._id}
                      order={order}
                      onClick={() => setSelectedOrder(order)}
                      getOrderStatusColor={getOrderStatusColor}
                      getDeliveryStatusColor={getDeliveryStatusColor}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <StationBottombar />

      {/* Filter sheet (mobile) */}
      {showFilterSheet && (
        <FilterSheet
          filters={filters}
          setFilters={setFilters}
          onClose={() => setShowFilterSheet(false)}
          onClear={clearFilters}
        />
      )}

      {/* Order detail modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          riders={riders}
          onClose={() => setSelectedOrder(null)}
          onRefetch={refetch}
          getOrderStatusColor={getOrderStatusColor}
          getDeliveryStatusColor={getDeliveryStatusColor}
          formatDateTime={formatDateTime}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Order Row (desktop)
// ═══════════════════════════════════════════════════════════
const OrderRow = ({
  order,
  onView,
  getOrderStatusColor,
  getDeliveryStatusColor,
  formatDate,
}) => {
  const isPickup = order.fulfillmentType === "pickup";
  const needsRider = !isPickup && order.status === "processing" && !order.rider;
  const needsReady =
    isPickup && !order.verificationScannedAt && order.deliveryStatus === "pending";
  const showAction = needsRider || needsReady;

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition last:border-b-0">
      <td className="py-3 px-3" onClick={onView}>
        <div className="font-medium text-gray-900 dark:text-white truncate">
          #{order.orderId || order._id.slice(-6)}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {formatDate(order.createdAt)}
        </p>
      </td>
      <td className="py-3 px-3" onClick={onView}>
        <p className="text-gray-900 dark:text-white truncate">
          {order.user?.name || "Unknown"}
        </p>
        <p
          className="text-xs text-gray-500 dark:text-gray-400 truncate"
          title={order.user?.phone || order.user?.email || ""}
        >
          {order.user?.phone || order.user?.email || ""}
        </p>
      </td>
      <td className="py-3 px-3" onClick={onView}>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            isPickup
              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          }`}
        >
          {isPickup ? (
            <Store className="h-3 w-3" />
          ) : (
            <Truck className="h-3 w-3" />
          )}
          {isPickup ? "Pickup" : "Delivery"}
        </span>
        {order.gasDetails?.cylinderSize && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            {order.gasDetails.cylinderSize} · {order.gasDetails.quantityKg}kg
          </p>
        )}
      </td>
      <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">
        <div className="truncate">
          ₦{order.totalAmount?.toFixed(2) || "0.00"}
        </div>
      </td>
      <td className="py-3 px-3" onClick={onView}>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium max-w-full ${getDeliveryStatusColor(
            order.deliveryStatus || "pending"
          )}`}
        >
          <span className="truncate">{order.deliveryStatus || "pending"}</span>
        </span>
      </td>
      <td className="py-3 px-3" onClick={onView}>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium max-w-full ${getOrderStatusColor(
            order.status
          )}`}
        >
          <span className="truncate">{order.status || "pending"}</span>
        </span>
      </td>
      <td className="py-3 px-3">
        {order.verificationScannedAt ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle className="h-3.5 w-3.5" />
            Confirmed
          </span>
        ) : showAction ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="text-xs bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 px-3 py-1 rounded-lg transition font-medium"
          >
            {needsRider ? "Assign Rider" : "Mark Ready"}
          </button>
        ) : order.rider ? (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
            {order.rider.name || "Rider"}
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
        )}
      </td>
    </tr>
  );
};

// ═══════════════════════════════════════════════════════════
//  Order Slim Card (mobile)
// ═══════════════════════════════════════════════════════════
const OrderSlimCard = ({
  order,
  onClick,
  getOrderStatusColor,
  getDeliveryStatusColor,
}) => {
  const isPickup = order.fulfillmentType === "pickup";

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 transition"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
            #{order.orderId || order._id.slice(-6)}
          </span>
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
              isPickup
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            }`}
          >
            {isPickup ? "Pickup" : "Delivery"}
          </span>
          {order.verificationScannedAt && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <CheckCircle className="h-2.5 w-2.5" />
              Done
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          <span className="truncate max-w-[110px]">
            {order.user?.name || "Unknown"}
          </span>
          <span>·</span>
          <span>₦{order.totalAmount?.toFixed(2) || "0.00"}</span>
          <span>·</span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getOrderStatusColor(
              order.status
            )}`}
          >
            {order.status || "pending"}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getDeliveryStatusColor(
              order.deliveryStatus || "pending"
            )}`}
          >
            {order.deliveryStatus || "pending"}
          </span>
        </div>
      </div>
      <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg] flex-shrink-0 ml-2" />
    </button>
  );
};

// ═══════════════════════════════════════════════════════════
//  Filter Sheet (mobile)
// ═══════════════════════════════════════════════════════════
const FilterSheet = ({ filters, setFilters, onClose, onClear }) => (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="bg-white dark:bg-gray-900 w-full max-w-full p-6 rounded-t-2xl max-h-[80vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Filter Orders
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Order Status
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value || "__all"}
                onClick={() => setFilters((f) => ({ ...f, status: opt.value }))}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  filters.status === opt.value
                    ? "bg-[#13ec5b] text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Delivery Status
          </label>
          <div className="flex flex-wrap gap-2">
            {DELIVERY_OPTIONS.map((opt) => (
              <button
                key={opt.value || "__all"}
                onClick={() =>
                  setFilters((f) => ({ ...f, deliveryStatus: opt.value }))
                }
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  filters.deliveryStatus === opt.value
                    ? "bg-[#13ec5b] text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Fulfillment
          </label>
          <div className="flex flex-wrap gap-2">
            {FULFILLMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value || "__all"}
                onClick={() =>
                  setFilters((f) => ({ ...f, fulfillmentType: opt.value }))
                }
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  filters.fulfillmentType === opt.value
                    ? "bg-[#13ec5b] text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Search
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
            placeholder="Order ID, customer, phone..."
            autoComplete="off"
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 text-sm outline-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              onClear();
              onClose();
            }}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-[#13ec5b] text-white rounded-lg font-medium"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
//  Order Detail Modal
// ═══════════════════════════════════════════════════════════
const OrderDetailModal = ({
  order,
  riders = [],
  onClose,
  onRefetch,
  getOrderStatusColor,
  getDeliveryStatusColor,
  formatDateTime,
}) => {
  const [showRiderPicker, setShowRiderPicker] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState("");

  const [assignRider, { isLoading: assigning }] =
    useAssignRiderToOrderMutation();
  const [markReady, { isLoading: markingReady }] =
    useMarkOrderReadyMutation();

  const isPickup = order.fulfillmentType === "pickup";
  const isConfirmed = !!order.verificationScannedAt;
  const needsRider = !isPickup && !order.rider && !isConfirmed;
  const needsReady =
    isPickup && !isConfirmed && order.deliveryStatus === "pending";

  const handleAssignRider = async () => {
    if (!selectedRiderId) {
      toast.error("Select a rider first");
      return;
    }
    try {
      await assignRider({
        id: order._id,
        riderId: selectedRiderId,
      }).unwrap();
      toast.success("Rider assigned");
      onRefetch();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to assign rider");
    }
  };

  const handleMarkReady = async () => {
    try {
      await markReady(order._id).unwrap();
      toast.success("Order marked ready for pickup");
      onRefetch();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to mark ready");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => !assigning && !markingReady && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
              Order #{order.orderId || order._id.slice(-6)}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {formatDateTime(order.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={assigning || markingReady}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 text-sm">
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(
                order.status
              )}`}
            >
              {order.status || "pending"}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getDeliveryStatusColor(
                order.deliveryStatus || "pending"
              )}`}
            >
              {order.deliveryStatus || "pending"}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                isPickup
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              }`}
            >
              {isPickup ? (
                <Store className="h-3 w-3" />
              ) : (
                <Truck className="h-3 w-3" />
              )}
              {isPickup ? "Pickup" : "Delivery"}
            </span>
            {isConfirmed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <QrCode className="h-3 w-3" />
                Confirmed
              </span>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
              <User className="h-3 w-3" /> Customer
            </p>
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {order.user?.name || "Unknown"}
            </p>
            {order.user?.email && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 min-w-0">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{order.user.email}</span>
              </p>
            )}
            {order.user?.phone && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 min-w-0">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <a
                  href={`tel:${order.user.phone}`}
                  className="truncate hover:underline"
                >
                  {order.user.phone}
                </a>
              </p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {isPickup ? "Pickup at station" : "Delivery address"}
            </p>
            {isPickup ? (
              <p className="text-gray-900 dark:text-white">
                Customer picks up from your station
              </p>
            ) : (
              <p className="text-gray-900 dark:text-white break-words">
                {order.deliveryAddress || "—"}
              </p>
            )}
            {order.scheduleType === "scheduled" && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Scheduled for {order.scheduledDate} at {order.scheduledTime}
              </p>
            )}
            {order.notes && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                "{order.notes}"
              </p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
              <Flame className="h-3 w-3" /> Items
            </p>
            {order.gasDetails ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {order.gasDetails.cylinderSize} cylinder
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {order.gasDetails.quantityKg} kg gas
                    {order.gasDetails.isFirstTime && " · First-time"}
                  </p>
                </div>
                <p className="text-gray-900 dark:text-white font-medium">
                  ₦{order.totalAmount?.toFixed(2) || "0.00"}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                No items
              </p>
            )}
          </div>

          {!isPickup && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <Truck className="h-3 w-3" /> Rider
              </p>
              {order.rider ? (
                <div>
                  <p className="text-gray-900 dark:text-white font-medium truncate">
                    {order.rider.name || "Rider"}
                  </p>
                  {order.rider.phone && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" />
                      <a
                        href={`tel:${order.rider.phone}`}
                        className="hover:underline"
                      >
                        {order.rider.phone}
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  No rider assigned yet
                </p>
              )}
            </div>
          )}

          {showRiderPicker && (
            <div className="rounded-lg border border-[#13ec5b]/30 bg-[#13ec5b]/5 p-3 space-y-2">
              <p className="text-xs font-medium text-[#0f9c46] dark:text-[#13ec5b]">
                Select a rider
              </p>
              {riders.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No riders assigned to this station yet. Add one from the
                  Riders page.
                </p>
              ) : (
                <>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {riders.map((r) => (
                      <button
                        key={r._id}
                        type="button"
                        onClick={() => setSelectedRiderId(r._id)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition flex items-center gap-2 ${
                          selectedRiderId === r._id
                            ? "border-[#13ec5b] bg-white dark:bg-gray-800"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedRiderId === r._id
                              ? "border-[#13ec5b] bg-[#13ec5b]"
                              : "border-gray-300 dark:border-gray-500"
                          }`}
                        >
                          {selectedRiderId === r._id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {r.name || "Rider"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {r.phone || r.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setShowRiderPicker(false);
                        setSelectedRiderId("");
                      }}
                      disabled={assigning}
                      className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAssignRider}
                      disabled={!selectedRiderId || assigning}
                      className="flex-1 py-2 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {assigning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Assign"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 space-y-2">
          {isConfirmed ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2.5 rounded-lg">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Order confirmed</p>
                {order.verificationScannedAt && (
                  <p className="text-[11px] opacity-80">
                    {formatDateTime(order.verificationScannedAt)}
                  </p>
                )}
              </div>
            </div>
          ) : needsRider && !showRiderPicker ? (
            <button
              onClick={() => setShowRiderPicker(true)}
              className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Assign a rider
            </button>
          ) : needsReady ? (
            <button
              onClick={handleMarkReady}
              disabled={markingReady}
              className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {markingReady ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Marking ready...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Mark ready for pickup
                </>
              )}
            </button>
          ) : isPickup && !isConfirmed ? (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 px-3 py-2.5 rounded-lg">
              <QrCode className="h-4 w-4 flex-shrink-0" />
              <span>
                Waiting for the customer to arrive and show their QR code
              </span>
            </div>
          ) : null}

          <button
            onClick={onClose}
            disabled={assigning || markingReady}
            className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium disabled:opacity-60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StationOrders;