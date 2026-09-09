// src/pages/Orders.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import {
  Package,
  Flame,
  ChevronDown,
  Filter,
  X,
  ChevronRight,
  Loader2,
  AlertCircle,
  CreditCard,
  Clock,
  Truck,
  CheckCircle,
  MapPin,
  Calendar,
} from "lucide-react";
import { useGetMyOrdersQuery, useInitializePaymentMutation } from "../features/orderApiSlice";
import { useConfirmDeliveryMutation } from "../features/deliveryApiSlice";
import Sidebar from "../components/Sidebar";
import Bottombar from "../components/Bottombar";

const Orders = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    orderType: "",
    status: "",
    month: "",
    year: "",
  });
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRefs = {
    orderType: useRef(null),
    status: useRef(null),
    month: useRef(null),
    year: useRef(null),
  };

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
  } = useGetMyOrdersQuery({
    month: filters.month || currentMonth,
    year: filters.year || currentYear,
    orderType: filters.orderType || undefined,
    status: filters.status || undefined,
    paid: undefined,
  });

  const [initializePayment, { isLoading: paymentLoading }] = useInitializePaymentMutation();
  const [confirmDelivery, { isLoading: confirming }] = useConfirmDeliveryMutation();

  // ─── Status colors ─────────────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "accepted": case "picked_up": case "in_transit": return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "delivered": return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "confirmed": return "text-green-700 bg-green-100 dark:bg-green-900/30";
      default: return "text-gray-600 bg-gray-50 dark:bg-gray-800";
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case "pending": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "processing": return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "completed": return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "cancelled": return "text-red-600 bg-red-50 dark:bg-red-900/20";
      case "failed": return "text-red-700 bg-red-100 dark:bg-red-900/30";
      default: return "text-gray-600 bg-gray-50 dark:bg-gray-800";
    }
  };

  // ─── Month / Year helpers ──────────────────────────────────
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = [];
  for (let y = currentYear; y >= currentYear - 4; y--) years.push(y);

  const orderTypes = [
    { value: "", label: "All Types" },
    { value: "fuel", label: "Fuel" },
    { value: "gas", label: "Gas" },
  ];
  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "accepted", label: "Accepted" },
    { value: "picked_up", label: "Picked Up" },
    { value: "in_transit", label: "In Transit" },
    { value: "delivered", label: "Delivered" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
  ];

  // ─── Handlers ──────────────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
  };

  const clearFilters = () => {
    setFilters({ orderType: "", status: "", month: "", year: "" });
    setOpenDropdown(null);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDropdown) {
        const ref = dropdownRefs[openDropdown];
        if (ref.current && !ref.current.contains(e.target)) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  // ─── Desktop filter dropdown ───────────────────────────────
  const FilterDropdown = ({ label, name, value, options, onSelect }) => {
    const isOpen = openDropdown === name;
    const selected = options.find((opt) => opt.value === value);
    const displayLabel = selected ? selected.label : label;

    return (
      <div className="relative" ref={dropdownRefs[name]}>
        <button
          type="button"
          onClick={() => setOpenDropdown(isOpen ? null : name)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition min-w-[140px] justify-between"
        >
          <span>{displayLabel}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-60 overflow-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onSelect(opt.value)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                  opt.value === value
                    ? "bg-[#13ec5b]/10 text-[#13ec5b]"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Filter bottom sheet (mobile) ──────────────────────────
  const FilterSheet = () => (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setShowFilterSheet(false)}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filter Orders</h3>
          <button onClick={() => setShowFilterSheet(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="space-y-4">
          {/* Order Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Order Type</label>
            <div className="flex flex-wrap gap-2">
              {orderTypes.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange("orderType", opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.orderType === opt.value
                      ? "bg-[#13ec5b] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange("status", opt.value)}
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
          {/* Month */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Month</label>
            <div className="flex flex-wrap gap-2">
              {months.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFilterChange("month", idx + 1)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.month === idx + 1
                      ? "bg-[#13ec5b] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          {/* Year */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Year</label>
            <div className="flex flex-wrap gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => handleFilterChange("year", y)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.year === y
                      ? "bg-[#13ec5b] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { clearFilters(); setShowFilterSheet(false); }}
              className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
            >
              Clear All
            </button>
            <button onClick={() => setShowFilterSheet(false)} className="flex-1 py-2.5 bg-[#13ec5b] text-white rounded-lg font-medium">
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Detail Modal (Right slide on desktop, bottom sheet on mobile) ──
  const DetailModal = () => {
    if (!selectedOrder) return null;

    const order = selectedOrder;
    const isPaid = order.paid;
    const isPendingPayment = !isPaid && order.status !== "cancelled";
    const canConfirm = order.deliveryStatus === "delivered" && order.status !== "completed";

    const handlePayNow = async () => {
      try {
        const result = await initializePayment(order._id).unwrap();
        if (result?.authorization_url) {
          window.location.href = result.authorization_url;
        } else {
          toast.error("Payment initialization failed. Please try again.");
        }
      } catch (err) {
        toast.error(err.data?.message || "Failed to initialize payment");
      }
    };

    const handleConfirmDelivery = async () => {
      try {
        await confirmDelivery(order._id).unwrap();
        refetch();
        setSelectedOrder(null);
        toast.success("Delivery confirmed successfully!");
      } catch (err) {
        toast.error(err.data?.message || "Failed to confirm delivery");
      }
    };

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedOrder(null)}
        />

        {/* Panel */}
        <div
          className="fixed z-50 bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto transition-transform duration-300 ease-in-out
            bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl
            lg:bottom-auto lg:top-0 lg:right-0 lg:left-auto lg:w-full lg:max-w-lg lg:rounded-none lg:h-full lg:max-h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              Order #{order.orderId || order._id.slice(-6)}
            </h3>
            <button
              onClick={() => setSelectedOrder(null)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-4 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Type</p>
                <span className="flex items-center gap-1 capitalize">
                  {order.orderType === "fuel" ? <Flame className="h-4 w-4 text-[#13ec5b]" /> : <Package className="h-4 w-4 text-[#13ec5b]" />}
                  {order.orderType}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Status</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                  {order.status || "pending"}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Delivery</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.deliveryStatus || "pending")}`}>
                  {order.deliveryStatus || "pending"}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Total</p>
                <p className="font-bold text-gray-900 dark:text-white">₦{order.totalAmount?.toFixed(2) || "0.00"}</p>
              </div>
            </div>

            {order.deliveryAddress && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Delivery Address</p>
                <p className="text-gray-900 dark:text-white text-sm">{order.deliveryAddress}</p>
              </div>
            )}

            {order.fuelType && order.quantity && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Fuel Details</p>
                <p className="text-gray-900 dark:text-white text-sm">{order.fuelType} – {order.quantity} L</p>
              </div>
            )}

            {order.gasDetails && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Gas Details</p>
                <p className="text-gray-900 dark:text-white text-sm">
                  {order.gasDetails.cylinderSize} – {order.gasDetails.quantityKg} kg
                  {order.gasDetails.isFirstTime ? " (New cylinder)" : " (Swap)"}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
              {isPendingPayment && (
                <button
                  onClick={handlePayNow}
                  disabled={paymentLoading}
                  className="w-full py-3 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {paymentLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                  Pay Now
                </button>
              )}

              {canConfirm && (
                <button
                  onClick={handleConfirmDelivery}
                  disabled={confirming}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {confirming ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                  Confirm Delivery
                </button>
              )}

              {isPaid && order.status === "completed" && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  // ─── Mobile Slim List Item ──────────────────────────────
  const SlimOrderItem = ({ order }) => {
    const isPaid = order.paid;
    const isPendingPayment = !isPaid && order.status !== "cancelled";

    return (
      <div
        onClick={() => setSelectedOrder(order)}
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
              #{order.orderId || order._id.slice(-6)}
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getOrderStatusColor(order.status)}`}>
              {order.status || "pending"}
            </span>
            {isPendingPayment && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                Unpaid
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span>{order.orderType === "fuel" ? "Fuel" : "Gas"}</span>
            <span>·</span>
            <span>₦{order.totalAmount?.toFixed(2) || "0.00"}</span>
            <span>·</span>
            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
      </div>
    );
  };

  // ─── Main render ──────────────────────────────────────────
  const isModalOpen = !!selectedOrder || showFilterSheet;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Orders</h1>
          <button
            onClick={() => setShowFilterSheet(true)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
        </header>

        <div className="w-full px-0 sm:px-4 lg:px-8 py-4">
          {/* Desktop filters */}
          <div className="hidden lg:flex flex-wrap items-center gap-3 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <FilterDropdown label="Order Type" name="orderType" value={filters.orderType} options={orderTypes} onSelect={(v) => handleFilterChange("orderType", v)} />
            <FilterDropdown label="Status" name="status" value={filters.status} options={statusOptions} onSelect={(v) => handleFilterChange("status", v)} />
            <FilterDropdown label="Month" name="month" value={filters.month} options={months.map((m, idx) => ({ value: idx + 1, label: m }))} onSelect={(v) => handleFilterChange("month", v)} />
            <FilterDropdown label="Year" name="year" value={filters.year} options={years.map((y) => ({ value: y, label: y }))} onSelect={(v) => handleFilterChange("year", v)} />
            <button onClick={clearFilters} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium">Clear</button>
          </div>

          {/* Orders list */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{orders.length} {orders.length === 1 ? "Order" : "Orders"} found</h2>
            </div>

            {isLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
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
                Failed to load orders. Please try again.
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No orders found</p>
                <button onClick={() => navigate("/order/fuel")} className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium">Place your first order</button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Order</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Type</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Amount</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Delivery</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Date</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const isPaid = order.paid;
                        const isPendingPayment = !isPaid && order.status !== "cancelled";
                        const canConfirm = order.deliveryStatus === "delivered" && order.status !== "completed";
                        return (
                          <tr
                            key={order._id}
                            className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">#{order.orderId || order._id.slice(-6)}</td>
                            <td className="py-2.5 px-3 capitalize">{order.orderType}</td>
                            <td className="py-2.5 px-3">₦{order.totalAmount?.toFixed(2) || "0.00"}</td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                                {order.status || "pending"}
                              </span>
                              {isPendingPayment && (
                                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                  Unpaid
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.deliveryStatus || "pending")}`}>
                                {order.deliveryStatus || "pending"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                            <td className="py-2.5 px-3">
                              {isPendingPayment && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                                  className="text-xs bg-[#13ec5b] hover:bg-[#10d04e] text-white px-3 py-1 rounded-lg transition"
                                >
                                  Pay
                                </button>
                              )}
                              {isPaid && order.status === "completed" && (
                                <span className="text-xs text-green-600 dark:text-green-400">Completed</span>
                              )}
                              {canConfirm && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition"
                                >
                                  Confirm
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile slim list */}
                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {orders.map((order) => (
                    <SlimOrderItem key={order._id} order={order} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {!isModalOpen && <Bottombar />}

      {showFilterSheet && <FilterSheet />}
      {selectedOrder && <DetailModal />}
    </div>
  );
};

export default Orders;