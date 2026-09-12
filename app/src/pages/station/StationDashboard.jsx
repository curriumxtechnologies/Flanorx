// src/pages/station/StationDashboard.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  Package,
  Boxes,
  DollarSign,
  AlertCircle,
  ChevronRight,
  ShoppingBag,
  Users,
  Truck,
  Clock,
  Eye,
  EyeOff,
  RefreshCw,
  Store,
  ArrowUpDown,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import StationSidebar from "../../components/station/Sidebar";
import StationBottombar from "../../components/station/Bottombar";
import {
  useGetStationDashboardQuery,
  useGetMyStationQuery,
  useGetStationOrdersQuery,
} from "../../features/stationApiSlice";

const RECENT_ORDERS_LIMIT = 6;
const CYLINDER_SIZES = ["3kg", "6kg", "12kg"];
const LOW_STOCK_THRESHOLD = 5;

const StationDashboard = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const [hideStats, setHideStats] = useState(false);

  const isStationAdmin = userInfo?.stationRole === "admin";

  // ─── Queries ──────────────────────────────────────────────
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
    isFetching: dashboardFetching,
  } = useGetStationDashboardQuery(undefined, {
    pollingInterval: 30000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const { data: station, isLoading: stationLoading } = useGetMyStationQuery();

  const {
    data: ordersData = [],
    isLoading: ordersLoading,
    error: ordersError,
  } = useGetStationOrdersQuery({});

  const isLoading = dashboardLoading || stationLoading || ordersLoading;
  const error = dashboardError || ordersError;

  // ─── Derived data ─────────────────────────────────────────
  const openOrders = dashboard?.openOrders || 0;
  const todayOrders = dashboard?.todayOrders || 0;
  const todayRevenue = dashboard?.todayRevenue || 0;
  const activeDeliveries = dashboard?.activeDeliveries || 0;
  const teamCount = dashboard?.teamCount || 0;

  const stock = dashboard?.stock || station?.stock || {};
  const totalStock = CYLINDER_SIZES.reduce(
    (sum, size) => sum + (stock?.[size] || 0),
    0
  );
  const lowStockSizes = CYLINDER_SIZES.filter(
    (size) => (stock?.[size] || 0) < LOW_STOCK_THRESHOLD
  );

  // ─── Chart data (last 7 days from orders) ────────────────
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

  // ─── Recent orders ────────────────────────────────────────
  const recentOrders = useMemo(() => {
    return [...(ordersData || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, RECENT_ORDERS_LIMIT);
  }, [ordersData]);

  // ─── Status colors ────────────────────────────────────────
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

  // ─── Error state ──────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <StationSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Station Dashboard
            </h1>
          </header>
          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">
                Failed to load station data
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
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Station Dashboard
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => refetchDashboard()}
              disabled={dashboardFetching}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                className={`h-5 w-5 text-gray-500 dark:text-gray-400 ${
                  dashboardFetching ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          {/* ─── MOBILE HERO ─────────────────────────────── */}
          <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4 shadow-sm">
            {isLoading ? (
              <>
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
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Station
                    </span>
                    <h1
                      className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white"
                      title={station?.name || "Station"}
                    >
                      {station?.name || "Station"}
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
                      Today's Revenue
                    </span>
                    <p
                      className="text-3xl font-bold text-gray-900 dark:text-white truncate"
                      title={`₦${todayRevenue.toFixed(2)}`}
                    >
                      {hideStats ? "••••" : `₦${todayRevenue.toFixed(2)}`}
                    </p>
                  </div>
                  <div className="text-right min-w-0">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Orders Today
                    </span>
                    <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
                      {hideStats ? "••" : todayOrders}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 gap-2">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="min-w-0">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        Open
                      </span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {hideStats ? "••" : openOrders}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        Stock
                      </span>
                      <p
                        className={`text-sm font-bold truncate ${
                          lowStockSizes.length > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {hideStats ? "••" : totalStock}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/station/orders")}
                    className="flex items-center gap-1 text-xs font-medium text-gray-900 bg-[#13ec5b] hover:bg-[#10d04e] px-3 py-1.5 rounded-lg border border-[#13ec5b] transition shadow-sm flex-shrink-0"
                  >
                    Orders
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ─── DESKTOP STATS GRID ──────────────────────── */}
          <div className="hidden lg:grid grid-cols-5 gap-4 mb-6">
            {isLoading
              ? [...Array(5)].map((_, i) => (
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
              : (
                <>
                  <StatCard
                    label="Today's Revenue"
                    value={hideStats ? "••••" : `₦${todayRevenue.toFixed(2)}`}
                    icon={DollarSign}
                  />
                  <StatCard
                    label="Orders Today"
                    value={hideStats ? "••" : todayOrders}
                    icon={ShoppingBag}
                  />
                  <StatCard
                    label="Open Orders"
                    value={hideStats ? "••" : openOrders}
                    icon={Clock}
                  />
                  <StatCard
                    label="Active Deliveries"
                    value={hideStats ? "••" : activeDeliveries}
                    icon={Truck}
                  />
                  <StatCard
                    label="Low Stock"
                    value={hideStats ? "••" : lowStockSizes.length}
                    icon={AlertCircle}
                    danger={lowStockSizes.length > 0}
                  />
                </>
              )}
          </div>

          {/* ─── LOW STOCK ALERT ─────────────────────────── */}
          {!isLoading && lowStockSizes.length > 0 && (
            <div className="mb-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Low stock on {lowStockSizes.join(", ")}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  You have fewer than {LOW_STOCK_THRESHOLD} cylinders of these
                  sizes. Consider restocking.
                </p>
              </div>
              <button
                onClick={() => navigate("/station/inventory")}
                className="flex-shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Restock
              </button>
            </div>
          )}

          {/* ─── Chart + Quick Actions ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm min-w-0">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                  Weekly Orders
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
                          id="stationChartGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#13ec5b"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#13ec5b"
                            stopOpacity={0}
                          />
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
                        fill="url(#stationChartGradient)"
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
                onClick={() => navigate("/station/orders")}
                className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-2.5 lg:p-4 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-xl lg:rounded-2xl transition shadow-sm hover:shadow-md min-w-0"
              >
                <Package className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
                <span className="text-xs lg:text-sm font-medium truncate">Orders</span>
              </button>
              <button
                onClick={() => navigate("/station/inventory")}
                className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-2.5 lg:p-4 bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 text-[#0f9c46] dark:text-[#13ec5b] rounded-xl lg:rounded-2xl transition border border-[#13ec5b]/20 min-w-0"
              >
                <Boxes className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
                <span className="text-xs lg:text-sm font-medium truncate">Inventory</span>
              </button>
              {isStationAdmin ? (
                <>
                  <button
                    onClick={() => navigate("/station/team")}
                    className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-2.5 lg:p-4 bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 text-[#0f9c46] dark:text-[#13ec5b] rounded-xl lg:rounded-2xl transition border border-[#13ec5b]/20 min-w-0"
                  >
                    <Users className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
                    <span className="text-xs lg:text-sm font-medium truncate">Team</span>
                  </button>
                  <button
                    onClick={() => navigate("/station/riders")}
                    className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-2.5 lg:p-4 bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 text-[#0f9c46] dark:text-[#13ec5b] rounded-xl lg:rounded-2xl transition border border-[#13ec5b]/20 min-w-0"
                  >
                    <Truck className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
                    <span className="text-xs lg:text-sm font-medium truncate">Riders</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => refetchDashboard()}
                    className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-2.5 lg:p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl lg:rounded-2xl transition min-w-0"
                  >
                    <RefreshCw className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
                    <span className="text-xs lg:text-sm font-medium truncate">Refresh</span>
                  </button>
                  <div className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-2.5 lg:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl lg:rounded-2xl border border-gray-200 dark:border-gray-700 min-w-0">
                    <ArrowUpDown className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 text-gray-400 flex-shrink-0" />
                    <span className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 truncate">
                      {teamCount} staff
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ─── Recent Orders ───────────────────────────── */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                Recent Orders
              </h3>
              <button
                onClick={() => navigate("/station/orders")}
                className="text-sm text-[#13ec5b] hover:underline flex-shrink-0"
              >
                View all
              </button>
            </div>

            {isLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 animate-pulse"
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
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No orders yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  New gas orders for this station will appear here.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-[15%]" />
                      <col className="w-[22%]" />
                      <col className="w-[14%]" />
                      <col className="w-[14%]" />
                      <col className="w-[16%]" />
                      <col className="w-[19%]" />
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
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => {
                        const orderLabel = `#${
                          order.orderId || order._id.slice(-6)
                        }`;
                        const customerLabel = order.user?.name || "Unknown";
                        const amountLabel = `₦${(
                          order.totalAmount || 0
                        ).toFixed(2)}`;
                        const isPickup = order.fulfillmentType === "pickup";

                        return (
                          <tr
                            key={order._id}
                            className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer last:border-b-0"
                            onClick={() => navigate("/station/orders")}
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
                            <td className="py-2.5 px-3">
                              <span className="text-xs capitalize text-gray-600 dark:text-gray-300">
                                {isPickup ? "Pickup" : "Delivery"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                              <div className="truncate" title={amountLabel}>
                                {amountLabel}
                              </div>
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile slim list */}
                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {recentOrders.map((order) => {
                    const orderLabel = `#${
                      order.orderId || order._id.slice(-6)
                    }`;
                    const customerLabel = order.user?.name || "Unknown";
                    const amountLabel = `₦${(order.totalAmount || 0).toFixed(
                      2
                    )}`;
                    const isPickup = order.fulfillmentType === "pickup";

                    return (
                      <div
                        key={order._id}
                        onClick={() => navigate("/station/orders")}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
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
                            <span
                              className="truncate max-w-[120px]"
                              title={customerLabel}
                            >
                              {customerLabel}
                            </span>
                            <span className="flex-shrink-0">·</span>
                            <span className="truncate">{amountLabel}</span>
                            <span className="flex-shrink-0">·</span>
                            <span className="flex-shrink-0">
                              {isPickup ? "Pickup" : "Delivery"}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ─── Stock Snapshot (below orders on mobile) ─── */}
          <div className="mt-4 lg:hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                Stock Snapshot
              </h3>
              <button
                onClick={() => navigate("/station/inventory")}
                className="text-sm text-[#13ec5b] hover:underline flex-shrink-0"
              >
                Manage
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4">
              {CYLINDER_SIZES.map((size) => {
                const count = stock?.[size] || 0;
                const low = count < LOW_STOCK_THRESHOLD;
                return (
                  <div
                    key={size}
                    className={`rounded-xl border p-3 text-center ${
                      low
                        ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                    }`}
                  >
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {size}
                    </p>
                    <p
                      className={`text-xl font-bold mt-0.5 ${
                        low
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {count}
                    </p>
                    {low && (
                      <p className="text-[9px] text-red-600 dark:text-red-400 mt-0.5">
                        Low
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <StationBottombar />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Stat Card
// ═══════════════════════════════════════════════════════════
const StatCard = ({ label, value, icon: Icon, danger = false }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
    <div className="flex items-center justify-between gap-2 min-w-0">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
          {label}
        </p>
        <p
          className={`text-xl lg:text-2xl font-bold mt-1 truncate ${
            danger
              ? "text-red-600 dark:text-red-400"
              : "text-gray-900 dark:text-white"
          }`}
          title={String(value)}
        >
          {value}
        </p>
      </div>
      <div
        className={`p-2 rounded-lg flex-shrink-0 ${
          danger
            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            : "bg-[#13ec5b]/10 text-[#13ec5b]"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

export default StationDashboard;