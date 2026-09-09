import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Package,
  Flame,
  ChevronDown,
  Filter,
  X,
  Eye,
  Search,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useGetAllOrdersQuery, useUpdateOrderStatusMutation } from "../../features/adminApiSlice";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminBottombar from "../../components/admin/Bottombar";

const AdminOrders = () => {
  const navigate = useNavigate();

  // ─── Filters state ─────────────────────────────────────────
  const [filters, setFilters] = useState({
    orderType: "",
    status: "",
    deliveryStatus: "",
    month: "",
    year: "",
    search: "",
  });

  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ─── Queries & Mutations ──────────────────────────────────
  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
  } = useGetAllOrdersQuery({
    orderType: filters.orderType || undefined,
    status: filters.status || undefined,
    deliveryStatus: filters.deliveryStatus || undefined,
    month: filters.month || undefined,
    year: filters.year || undefined,
  });

  const [updateOrderStatus, { isLoading: updateLoading }] = useUpdateOrderStatusMutation();

  // ─── Derived data ──────────────────────────────────────────
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  // ─── Filter options ────────────────────────────────────────
  const orderTypes = [
    { value: "", label: "All Types" },
    { value: "fuel", label: "Fuel" },
    { value: "gas", label: "Gas" },
  ];

  const orderStatuses = [
    { value: "", label: "All Order Status" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "failed", label: "Failed" },
  ];

  const deliveryStatuses = [
    { value: "", label: "All Delivery" },
    { value: "pending", label: "Pending" },
    { value: "accepted", label: "Accepted" },
    { value: "picked_up", label: "Picked Up" },
    { value: "in_transit", label: "In Transit" },
    { value: "delivered", label: "Delivered" },
    { value: "confirmed", label: "Confirmed" },
  ];

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = [];
  for (let y = currentYear; y >= currentYear - 4; y--) years.push(y);

  // ─── Filter handlers ──────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      orderType: "",
      status: "",
      deliveryStatus: "",
      month: "",
      year: "",
      search: "",
    });
  };

  // ─── Status update handler ──────────────────────────────
  const handleStatusUpdate = async (orderId, newStatus, deliveryStatus) => {
    try {
      await updateOrderStatus({ id: orderId, status: newStatus, deliveryStatus }).unwrap();
      refetch();
      if (selectedOrder && selectedOrder._id === orderId) {
        const updated = orders.find(o => o._id === orderId);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      alert(err.data?.message || "Failed to update order status");
    }
  };

  // ─── Status colors ────────────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "accepted": return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "picked_up": return "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20";
      case "in_transit": return "text-purple-600 bg-purple-50 dark:bg-purple-900/20";
      case "delivered": return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "confirmed": return "text-green-700 bg-green-100 dark:bg-green-900/30";
      case "completed": return "text-green-700 bg-green-100 dark:bg-green-900/30";
      case "cancelled": return "text-red-600 bg-red-50 dark:bg-red-900/20";
      case "failed": return "text-red-700 bg-red-100 dark:bg-red-900/30";
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

  // ─── Status update options ──────────────────────────────
  const statusOptions = [
    { label: "Pending", value: "pending" },
    { label: "Processing", value: "processing" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Failed", value: "failed" },
  ];

  const deliveryOptions = [
    { label: "Pending", value: "pending" },
    { label: "Accepted", value: "accepted" },
    { label: "Picked Up", value: "picked_up" },
    { label: "In Transit", value: "in_transit" },
    { label: "Delivered", value: "delivered" },
    { label: "Confirmed", value: "confirmed" },
  ];

  // ─── Custom Dropdown (shared) ───────────────────────────
  const CustomDropdown = ({ value, options, onChange, placeholder, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = React.useRef(null);

    React.useEffect(() => {
      const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selected = options.find(opt => opt.value === value);
    const display = selected ? selected.label : placeholder;

    return (
      <div className={`relative ${className}`} ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#13ec5b]/50"
        >
          <span>{display}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-60 overflow-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
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

  // ─── Desktop FilterDropdown (kept as original) ──────────
  const FilterDropdown = ({ label, name, value, options, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef(null);

    React.useEffect(() => {
      const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selected = options.find((opt) => opt.value === value);
    const displayLabel = selected ? selected.label : label;

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
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
                onClick={() => { onSelect(opt.value); setIsOpen(false); }}
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

  // ─── Filter Sheet (mobile) – full width, no rounded corners ──
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

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Order Status</label>
            <div className="flex flex-wrap gap-2">
              {orderStatuses.map((opt) => (
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

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Delivery Status</label>
            <div className="flex flex-wrap gap-2">
              {deliveryStatuses.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange("deliveryStatus", opt.value)}
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

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="Order ID or customer name..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { clearFilters(); setShowFilterSheet(false); }}
              className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowFilterSheet(false)}
              className="flex-1 py-2.5 bg-[#13ec5b] text-white rounded-lg font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Detail Modal (bottom sheet) – full width, no rounded corners ──
  const DetailModal = () => {
    if (!selectedOrder) return null;

    const order = selectedOrder;
    const [localOrderStatus, setLocalOrderStatus] = useState(order.status || "pending");
    const [localDeliveryStatus, setLocalDeliveryStatus] = useState(order.deliveryStatus || "pending");

    const handleOrderChange = (val) => {
      setLocalOrderStatus(val);
      handleStatusUpdate(order._id, val, undefined);
    };

    const handleDeliveryChange = (val) => {
      setLocalDeliveryStatus(val);
      handleStatusUpdate(order._id, undefined, val);
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => setSelectedOrder(null)}
      >
        <div
          className="bg-white dark:bg-gray-900 w-full max-w-full p-6 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Order #{order.orderId || order._id.slice(-6)}
            </h3>
            <button onClick={() => setSelectedOrder(null)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Customer</p>
                <p className="text-gray-900 dark:text-white font-medium">{order.user?.name || "Unknown"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{order.user?.email || ""}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Date</p>
                <p className="text-gray-900 dark:text-white">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Type</p>
                <span className="flex items-center gap-1 capitalize">
                  {order.orderType === "fuel" ? <Flame className="h-4 w-4 text-[#13ec5b]" /> : <Package className="h-4 w-4 text-[#13ec5b]" />}
                  {order.orderType}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Total</p>
                <p className="font-bold text-gray-900 dark:text-white">₦{order.totalAmount?.toFixed(2) || "0.00"}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Order Status</p>
              <CustomDropdown
                value={localOrderStatus}
                options={statusOptions}
                onChange={handleOrderChange}
                placeholder="Select status"
              />
            </div>

            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Delivery Status</p>
              <CustomDropdown
                value={localDeliveryStatus}
                options={deliveryOptions}
                onChange={handleDeliveryChange}
                placeholder="Select delivery"
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-gray-500 dark:text-gray-400 text-xs">Items</p>
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1">
                  <span>{item.name || `Item ${idx+1}`}</span>
                  <span>₦{item.price?.toFixed(2) || "0.00"} x {item.quantity || 1}</span>
                </div>
              ))}
              {!order.items?.length && <p className="text-gray-400 dark:text-gray-500 text-xs">No items listed</p>}
            </div>

            <button
              onClick={() => navigate(`/superuser/orders/${order._id}`)}
              className="w-full py-2.5 bg-[#13ec5b] text-white rounded-lg font-medium hover:bg-[#0fc44e] transition"
            >
              View Full Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Filtered orders ──────────────────────────────────────
  const filteredOrders = useMemo(() => {
    if (!filters.search) return orders;
    const searchLower = filters.search.toLowerCase();
    return orders.filter(
      (order) =>
        order.orderId?.toLowerCase().includes(searchLower) ||
        order.user?.name?.toLowerCase().includes(searchLower) ||
        order.user?.email?.toLowerCase().includes(searchLower)
    );
  }, [orders, filters.search]);

  // ─── Mobile Slim List Item ──────────────────────────────
  const SlimOrderItem = ({ order }) => (
    <div
      onClick={() => setSelectedOrder(order)}
      className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer transition"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
            #{order.orderId || order._id.slice(-6)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {order.user?.name || "Unknown"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ₦{order.totalAmount?.toFixed(2) || "0.00"}
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getOrderStatusColor(order.status)}`}>
            {order.status || "pending"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(order.deliveryStatus || "pending")}`}>
          {order.deliveryStatus || "pending"}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg]" />
      </div>
    </div>
  );

  // ─── Main render ──────────────────────────────────────────
  const isModalOpen = !!selectedOrder || showFilterSheet;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Orders</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button onClick={() => setShowFilterSheet(true)} className="lg:hidden flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
        </header>

        {/* Main content – full width on mobile, zero padding */}
        <div className="w-full px-0 sm:px-4 lg:px-6 py-4">
          {/* Desktop filters */}
          <div className="hidden lg:flex flex-wrap items-center gap-3 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <FilterDropdown label="Order Type" name="orderType" value={filters.orderType} options={orderTypes} onSelect={(v) => handleFilterChange("orderType", v)} />
            <FilterDropdown label="Order Status" name="status" value={filters.status} options={orderStatuses} onSelect={(v) => handleFilterChange("status", v)} />
            <FilterDropdown label="Delivery Status" name="deliveryStatus" value={filters.deliveryStatus} options={deliveryStatuses} onSelect={(v) => handleFilterChange("deliveryStatus", v)} />
            <FilterDropdown label="Month" name="month" value={filters.month} options={months.map((m, idx) => ({ value: idx + 1, label: m }))} onSelect={(v) => handleFilterChange("month", v)} />
            <FilterDropdown label="Year" name="year" value={filters.year} options={years.map((y) => ({ value: y, label: y }))} onSelect={(v) => handleFilterChange("year", v)} />
            <div className="flex-1 min-w-[150px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)} placeholder="Search orders..." className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50" />
              </div>
            </div>
            <button onClick={clearFilters} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium">Clear</button>
          </div>

          {/* Orders display container – flush on mobile */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {filteredOrders.length} {filteredOrders.length === 1 ? "Order" : "Orders"} found
              </h2>
            </div>

            {isLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                    <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                    </div>
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                Failed to load orders. Please try again.
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No orders found</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Order</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Customer</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Type</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Amount</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Order Status</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Delivery</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-gray-900 dark:text-white">#{order.orderId || order._id.slice(-6)}</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="text-gray-900 dark:text-white">{order.user?.name || "Unknown"}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{order.user?.email || ""}</p>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="flex items-center gap-1 capitalize">
                              {order.orderType === "fuel" ? <Flame className="h-4 w-4 text-[#13ec5b]" /> : <Package className="h-4 w-4 text-[#13ec5b]" />}
                              {order.orderType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">₦{order.totalAmount?.toFixed(2) || "0.00"}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                              {order.status || "pending"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.deliveryStatus || "pending")}`}>
                              {order.deliveryStatus || "pending"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => navigate(`/superuser/orders/${order._id}`)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="View details">
                                <Eye className="h-4 w-4 text-gray-400" />
                              </button>
                              <select
                                value={order.status || "pending"}
                                onChange={(e) => handleStatusUpdate(order._id, e.target.value, undefined)}
                                disabled={updateLoading}
                                className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#13ec5b]/50"
                              >
                                {statusOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile slim list – full width, no rounded corners */}
                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredOrders.map((order) => (
                    <SlimOrderItem key={order._id} order={order} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals – hide bottom bar when modal is open */}
      {!isModalOpen && <AdminBottombar />}

      {showFilterSheet && <FilterSheet />}
      {selectedOrder && <DetailModal />}
    </div>
  );
};

export default AdminOrders;