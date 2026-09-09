// pages/Orders.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Package,
  Flame,
  ChevronDown,
  Filter,
  X,
  ChevronRight,
  Calendar,
  Loader2,
} from "lucide-react";
import { useGetMyOrdersQuery } from "../features/orderApiSlice";
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

  // For custom dropdowns (desktop)
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
  } = useGetMyOrdersQuery({
    month: filters.month || currentMonth,
    year: filters.year || currentYear,
    orderType: filters.orderType || undefined,
    status: filters.status || undefined,
    paid: true,
  });

  // ─── Status colors ─────────────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "accepted":
      case "picked_up":
      case "in_transit":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "delivered":
        return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "confirmed":
        return "text-green-700 bg-green-100 dark:bg-green-900/30";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-800";
    }
  };

  // ─── Month / Year helpers ──────────────────────────────────
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
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

  // ─── Handle filter changes ────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
  };

  const clearFilters = () => {
    setFilters({
      orderType: "",
      status: "",
      month: "",
      year: "",
    });
    setOpenDropdown(null);
  };

  // ─── Close dropdown on outside click ──────────────────────
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
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
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
        className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Filter Orders
          </h3>
          <button
            onClick={() => setShowFilterSheet(false)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Order Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Order Type
            </label>
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
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Status
            </label>
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
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Month
            </label>
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
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Year
            </label>
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
              onClick={() => {
                clearFilters();
                setShowFilterSheet(false);
              }}
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
            Orders
          </h1>
          <button
            onClick={() => setShowFilterSheet(true)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Desktop filters */}
          <div className="hidden lg:flex flex-wrap items-center gap-3 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <FilterDropdown
              label="Order Type"
              name="orderType"
              value={filters.orderType}
              options={orderTypes}
              onSelect={(v) => handleFilterChange("orderType", v)}
            />
            <FilterDropdown
              label="Status"
              name="status"
              value={filters.status}
              options={statusOptions}
              onSelect={(v) => handleFilterChange("status", v)}
            />
            <FilterDropdown
              label="Month"
              name="month"
              value={filters.month}
              options={months.map((m, idx) => ({ value: idx + 1, label: m }))}
              onSelect={(v) => handleFilterChange("month", v)}
            />
            <FilterDropdown
              label="Year"
              name="year"
              value={filters.year}
              options={years.map((y) => ({ value: y, label: y }))}
              onSelect={(v) => handleFilterChange("year", v)}
            />
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
            >
              Clear
            </button>
          </div>

          {/* Orders list */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {orders.length} {orders.length === 1 ? "Order" : "Orders"} found
              </h2>
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
                Failed to load orders. Please try again.
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No orders found</p>
                <button
                  onClick={() => navigate("/order/fuel")}
                  className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
                >
                  Place your first order
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition"
                    onClick={() => navigate(`/order/${order._id}`)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#13ec5b]/10 flex items-center justify-center flex-shrink-0">
                      {order.orderType === "fuel" ? (
                        <Flame className="h-4 w-4 text-[#13ec5b]" />
                      ) : (
                        <Package className="h-4 w-4 text-[#13ec5b]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          #{order.orderId}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            order.deliveryStatus
                          )}`}
                        >
                          {order.deliveryStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        <span>{order.orderType === "fuel" ? "Fuel" : "Gas"}</span>
                        <span>·</span>
                        <span>₦{order.totalAmount.toFixed(2)}</span>
                        <span>·</span>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Bottombar />

      {/* Mobile filter bottom sheet */}
      {showFilterSheet && <FilterSheet />}
    </div>
  );
};

export default Orders;