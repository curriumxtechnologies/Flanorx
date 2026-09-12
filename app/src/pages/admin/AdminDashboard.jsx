// src/pages/admin/AdminDashboard.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  Package,
  Users,
  Truck,
  TrendingUp,
  DollarSign,
  Clock,
  Eye,
  EyeOff,
  ChevronRight,
  ShoppingBag,
  UserCheck,
  AlertCircle,
  X,
  Flame,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminBottombar from "../../components/admin/Bottombar";
import {
  useGetDashboardStatsQuery,
  useGetAllOrdersQuery,
  useGetAllUsersQuery,
  useGetAllRidersQuery,
  useUpdateOrderStatusMutation,
} from "../../features/adminApiSlice";

const RECENT_ORDERS_LIMIT = 6;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const [hideStats, setHideStats] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ─── Queries ──────────────────────────────────────────────
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useGetDashboardStatsQuery();

  const {
    data: ordersData = [],
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useGetAllOrdersQuery({});

  const {
    data: usersData = [],
    isLoading: usersLoading,
    error: usersError,
  } = useGetAllUsersQuery({});

  const {
    data: ridersData = [],
    isLoading: ridersLoading,
    error: ridersError,
  } = useGetAllRidersQuery();

  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  // ─── Derived data ──────────────────────────────────────────
  const isLoading =
    statsLoading || ordersLoading || usersLoading || ridersLoading;
  const error = statsError || ordersError || usersError || ridersError;

  const activeRidersCount = useMemo(
    () => ridersData.filter((r) => r.verificationStatus === "approved").length,
    [ridersData]
  );

  const stats = useMemo(() => {
    if (!statsData) return [];
    return [
      {
        label: "Total Orders",
        value: hideStats ? "••••" : statsData.totalOrders,
        icon: ShoppingBag,
      },
      {
        label: "Revenue (This Month)",
        value: hideStats
          ? "••••"
          : `₦${((statsData.monthRevenue || 0) / 1000000).toFixed(1)}M`,
        icon: DollarSign,
      },
      {
        label: "Total Users",
        value: hideStats ? "••••" : usersData.length,
        icon: Users,
      },
      {
        label: "Active Riders",
        value: hideStats ? "••••" : activeRidersCount,
        icon: Truck,
      },
      {
        label: "Pending Orders",
        value: hideStats ? "••••" : statsData.pendingOrders,
        icon: Clock,
      },
      {
        label: "Completed Orders",
        value: hideStats ? "••••" : statsData.completedOrders,
        icon: UserCheck,
      },
    ];
  }, [statsData, usersData, activeRidersCount, hideStats]);

  // ─── Chart data from orders (real, no fallback fabrication) ──
  const chartData = useMemo(() => {
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const buckets = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.push({
        date: dayLabels[d.getDay()],
        dateKey: d.toISOString().split("T")[0],
        orders: 0,
        revenue: 0,
      });
    }

    (ordersData || []).forEach((o) => {
      if (!o.createdAt) return;
      const key = new Date(o.createdAt).toISOString().split("T")[0];
      const bucket = buckets.find((b) => b.dateKey === key);
      if (bucket) {
        bucket.orders += 1;
        bucket.revenue += o.totalAmount || 0;
      }
    });

    return buckets.map(({ date, orders, revenue }) => ({
      date,
      orders,
      revenue,
    }));
  }, [ordersData]);

  // ─── 6 most recent orders (sorted defensively) ────────────
  const recentOrders = useMemo(() => {
    return [...(ordersData || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, RECENT_ORDERS_LIMIT);
  }, [ordersData]);

  // ─── Status colors ──────────────────────────────────────
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
      case "cancelled":
        return "text-red-600 bg-red-50 dark:bg-red-900/20";
      case "failed":
        return "text-red-700 bg-red-100 dark:bg-red-900/30";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-800";
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

  // ─── Custom Dropdown ─────────────────────────────────────
  const CustomDropdown = ({
    value,
    options,
    onChange,
    placeholder,
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

    const selected = options.find((opt) => opt.value === value);
    const display = selected ? selected.label : placeholder;

    return (
      <div className={`relative ${className}`} ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#13ec5b]/50"
        >
          <span className="truncate">{display}</span>
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-60 overflow-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition truncate ${
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

  // ─── Status update handler ──────────────────────────────
  const handleStatusUpdate = async (orderId, newStatus, deliveryStatus) => {
    try {
      await updateOrderStatus({
        id: orderId,
        status: newStatus,
        deliveryStatus,
      }).unwrap();
      refetchOrders();
    } catch (err) {
      alert(err.data?.message || "Failed to update order status");
    }
  };

  // ─── Detail Modal ────────────────────────────────────────
  const DetailModal = () => {
    if (!selectedOrder) return null;

    const order = selectedOrder;
    const [localOrderStatus, setLocalOrderStatus] = useState(
      order.status || "pending"
    );
    const [localDeliveryStatus, setLocalDeliveryStatus] = useState(
      order.deliveryStatus || "pending"
    );

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
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3
              className="text-lg font-bold text-gray-900 dark:text-white truncate"
              title={`Order #${order.orderId || order._id.slice(-6)}`}
            >
              Order #{order.orderId || order._id.slice(-6)}
            </h3>
            <button
              onClick={() => setSelectedOrder(null)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  Customer
                </p>
                <p className="text-gray-900 dark:text-white font-medium truncate">
                  {order.user?.name || "Unknown"}
                </p>
                <p
                  className="text-xs text-gray-500 dark:text-gray-400 truncate"
                  title={order.user?.email || ""}
                >
                  {order.user?.email || ""}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Date</p>
                <p className="text-gray-900 dark:text-white truncate">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Type</p>
                <span className="flex items-center gap-1 capitalize truncate">
                  {order.orderType === "fuel" ? (
                    <Flame className="h-4 w-4 text-[#13ec5b] flex-shrink-0" />
                  ) : (
                    <Package className="h-4 w-4 text-[#13ec5b] flex-shrink-0" />
                  )}
                  <span className="truncate">{order.orderType}</span>
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Total</p>
                <p className="font-bold text-gray-900 dark:text-white truncate">
                  ₦{order.totalAmount?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                Order Status
              </p>
              <CustomDropdown
                value={localOrderStatus}
                options={statusOptions}
                onChange={handleOrderChange}
                placeholder="Select status"
              />
            </div>

            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                Delivery Status
              </p>
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
                <div key={idx} className="flex justify-between text-sm py-1 gap-3">
                  <span className="truncate">{item.name || `Item ${idx + 1}`}</span>
                  <span className="flex-shrink-0">
                    ₦{item.price?.toFixed(2) || "0.00"} x {item.quantity || 1}
                  </span>
                </div>
              ))}
              {!order.items?.length && (
                <p className="text-gray-400 dark:text-gray-500 text-xs">
                  No items listed
                </p>
              )}
            </div>

            <button
              onClick={() => {
                navigate(`/superuser/orders/${order._id}`);
                setSelectedOrder(null);
              }}
              className="w-full py-2.5 bg-[#13ec5b] text-white rounded-lg font-medium hover:bg-[#0fc44e] transition"
            >
              View Full Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Mobile Slim Order Item (mirrors Orders page) ────────
  const SlimOrderItem = ({ order }) => {
    const orderLabel = `#${order.orderId || order._id.slice(-6)}`;
    const customerLabel = order.user?.name || "Unknown";
    const amountLabel = `₦${order.totalAmount?.toFixed(2) || "0.00"}`;
    const dateLabel = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString()
      : "";

    return (
      <div
        onClick={() => setSelectedOrder(order)}
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer transition last:border-b-0"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="font-medium text-gray-900 dark:text-white text-sm truncate"
              title={orderLabel}
            >
              {orderLabel}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${getOrderStatusColor(
                order.status
              )}`}
            >
              {order.status || "pending"}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${getDeliveryStatusColor(
                order.deliveryStatus || "pending"
              )}`}
            >
              {order.deliveryStatus || "pending"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="truncate max-w-[120px]" title={customerLabel}>
              {customerLabel}
            </span>
            <span className="flex-shrink-0">·</span>
            <span className="truncate">{amountLabel}</span>
            <span className="flex-shrink-0">·</span>
            <span className="flex-shrink-0">{dateLabel}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
      </div>
    );
  };

  // ─── Mobile Hero Card (skeleton-aware) ────────────────────
  const HeroCard = () => {
    if (isLoading) {
      return (
        <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-2.5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
          </div>

          <div className="flex items-end justify-between mb-3 gap-2">
            <div className="min-w-0 space-y-2">
              <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="text-right min-w-0 space-y-2">
              <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 gap-2">
            <div className="flex items-center gap-5 min-w-0">
              <div className="space-y-1.5">
                <div className="h-2.5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3.5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2.5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3.5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex-shrink-0" />
          </div>
        </div>
      );
    }

    return (
      <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Admin Dashboard
            </span>
            <h1
              className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white"
              title={userInfo?.name || "Admin"}
            >
              {userInfo?.name
                ? `Welcome, ${userInfo.name.split(" ")[0]}`
                : "Admin"}
              !
            </h1>
          </div>
          <button
            onClick={() => setHideStats((v) => !v)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex-shrink-0"
          >
            {hideStats ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex items-end justify-between mb-3 gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Total Orders
            </span>
            <p className="text-3xl font-bold text-gray-900 dark:text-white truncate">
              {hideStats ? "••" : statsData?.totalOrders}
            </p>
          </div>
          <div className="text-right min-w-0">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Revenue
            </span>
            <p
              className="text-xl font-bold text-gray-900 dark:text-white truncate"
              title={
                hideStats
                  ? ""
                  : `₦${(statsData?.monthRevenue / 1000000).toFixed(1)}M`
              }
            >
              {hideStats
                ? "••••"
                : `₦${((statsData?.monthRevenue || 0) / 1000000).toFixed(1)}M`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 gap-2">
          <div className="flex items-center gap-5 min-w-0">
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Users
              </span>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {hideStats ? "••" : usersData.length}
              </p>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Riders
              </span>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {hideStats ? "••" : activeRidersCount}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/superuser/orders")}
            className="flex items-center gap-1 text-xs font-medium text-white bg-[#13ec5b] hover:bg-[#10d04e] px-3 py-1.5 rounded-lg border border-[#13ec5b] transition shadow-sm flex-shrink-0"
          >
            Orders
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  // ─── Desktop Stats Grid (skeleton-aware) ──────────────────
  const StatsGrid = () => (
    <div className="hidden lg:grid grid-cols-6 gap-4 mb-6">
      {isLoading
        ? [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
              </div>
            </div>
          ))
        : stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0"
            >
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                    {stat.label}
                  </p>
                  <p
                    className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate"
                    title={String(stat.value)}
                  >
                    {stat.value}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b] flex-shrink-0">
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
    </div>
  );

  // ─── Chart + Quick Actions ──────────────────────────────
  const ChartAndActions = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm min-w-0">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
            Weekly Orders & Revenue
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
            Last 7 days
          </span>
        </div>
        {isLoading ? (
          <div className="h-48 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="adminChartGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#13ec5b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  tickMargin={5}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  tickFormatter={(v) => `${v}`}
                  width={40}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "revenue")
                      return [`₦${value.toLocaleString()}`, "Revenue"];
                    return [value, "Orders"];
                  }}
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.9)",
                    border: "none",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#13ec5b"
                  strokeWidth={2}
                  fill="url(#adminChartGradient)"
                  dot={{ r: 2, fill: "#13ec5b" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Quick Actions — compact on mobile, original on desktop */}
      <div className="grid grid-cols-2 gap-2 lg:gap-3">
        <button
          onClick={() => navigate("/superuser/orders")}
          className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-2.5 lg:p-4 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-xl lg:rounded-2xl transition shadow-sm hover:shadow-md min-w-0"
        >
          <Package className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
          <span className="text-xs lg:text-sm font-medium truncate">Orders</span>
        </button>
        <button
          onClick={() => navigate("/superuser/users")}
          className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-2.5 lg:p-4 bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 text-[#13ec5b] rounded-xl lg:rounded-2xl transition border border-[#13ec5b]/20 min-w-0"
        >
          <Users className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
          <span className="text-xs lg:text-sm font-medium truncate">Users</span>
        </button>
        <button
          onClick={() => navigate("/superuser/riders")}
          className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-2.5 lg:p-4 bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 text-[#13ec5b] rounded-xl lg:rounded-2xl transition border border-[#13ec5b]/20 min-w-0"
        >
          <Truck className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
          <span className="text-xs lg:text-sm font-medium truncate">Riders</span>
        </button>
        <button
          onClick={() => navigate("/superuser/analytics")}
          className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-2.5 lg:p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl lg:rounded-2xl transition min-w-0"
        >
          <TrendingUp className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
          <span className="text-xs lg:text-sm font-medium truncate">Analytics</span>
        </button>
      </div>
    </div>
  );

  // ─── Recent Orders (mirrors admin Orders page, 6 max) ────
  const RecentOrders = () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
          Recent Orders
        </h3>
        <button
          onClick={() => navigate("/superuser/orders")}
          className="text-sm text-[#13ec5b] hover:underline flex-shrink-0"
        >
          View all
        </button>
      </div>

      {isLoading ? (
        <>
          {/* Desktop skeleton table */}
          <div className="hidden lg:block">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[22%]" />
                <col className="w-[15%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
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
                    Amount
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                    Status
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                    Delivery
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <td className="py-2.5 px-3">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile skeleton list */}
          <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  </div>
                  <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-2" />
              </div>
            ))}
          </div>
        </>
      ) : recentOrders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No orders found</p>
          <button
            onClick={() => navigate("/superuser/orders")}
            className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
          >
            Go to Orders
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[22%]" />
                <col className="w-[15%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
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
                    Amount
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                    Status
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                    Delivery
                  </th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const orderLabel = `#${order.orderId || order._id.slice(-6)}`;
                  const customerLabel = order.user?.name || "Unknown";
                  const amountLabel = `₦${order.totalAmount?.toLocaleString() || "0.00"}`;
                  const dateLabel = order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString()
                    : "";

                  return (
                    <tr
                      key={order._id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer last:border-b-0"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                        <div className="truncate" title={orderLabel}>
                          {orderLabel}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                        <div className="truncate" title={customerLabel}>
                          {customerLabel}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        <div className="truncate" title={amountLabel}>
                          {amountLabel}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium max-w-full ${getOrderStatusColor(
                            order.status
                          )}`}
                        >
                          <span className="truncate">
                            {order.status || "pending"}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium max-w-full ${getDeliveryStatusColor(
                            order.deliveryStatus || "pending"
                          )}`}
                        >
                          <span className="truncate">
                            {order.deliveryStatus || "pending"}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">
                        <div className="truncate" title={dateLabel}>
                          {dateLabel}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile slim list */}
          <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {recentOrders.map((order) => (
              <SlimOrderItem key={order._id} order={order} />
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ─── Error state ─────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Admin Dashboard
            </h1>
          </header>
          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">
                Failed to load dashboard data
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {error?.data?.message || error?.message || "Please try again"}
              </p>
            </div>
          </div>
        </div>
        <AdminBottombar />
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────
  const isModalOpen = !!selectedOrder;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline truncate max-w-[160px]">
              {userInfo?.name || "Admin"}
            </span>
          </div>
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          <HeroCard />
          <StatsGrid />
          <ChartAndActions />
          <RecentOrders />
        </div>
      </div>

      {/* Conditionally hide bottom bar when modal is open */}
      {!isModalOpen && <AdminBottombar />}

      {selectedOrder && <DetailModal />}
    </div>
  );
};

export default AdminDashboard;