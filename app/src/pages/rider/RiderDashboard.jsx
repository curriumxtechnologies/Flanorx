// src/pages/rider/RiderDashboard.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  Truck,
  TrendingUp,
  Wallet,
  Clock,
  Package,
  ChevronRight,
  Eye,
  EyeOff,
  AlertCircle,
  MapPin,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import RiderSidebar from "../../components/rider/Sidebar";
import RiderBottombar from "../../components/rider/Bottombar";
import { useGetProfileQuery } from "../../features/userApiSlice";
import {
  useGetAvailableDeliveriesQuery,
  useGetMyAssignedDeliveriesQuery,
  useGetRiderEarningsQuery,
} from "../../features/deliveryApiSlice";

const RECENT_DELIVERIES_LIMIT = 6;

const RiderDashboard = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const [hideStats, setHideStats] = useState(false);

  // ─── Queries ──────────────────────────────────────────────
  const { data: user, isLoading: userLoading } = useGetProfileQuery();

  const {
    data: availableDeliveries = [],
    isLoading: availableLoading,
    error: availableError,
  } = useGetAvailableDeliveriesQuery();

  const {
    data: myDeliveries = [],
    isLoading: deliveriesLoading,
    error: deliveriesError,
  } = useGetMyAssignedDeliveriesQuery();

  const {
    data: earningsData,
    isLoading: earningsLoading,
    error: earningsError,
  } = useGetRiderEarningsQuery();

  // ─── Derived data ──────────────────────────────────────────
  const walletBalance = earningsData?.walletBalance || 0;
  const totalEarnings = earningsData?.totalEarnings || 0;
  const completedDeliveries = earningsData?.completedDeliveries || 0;
  const earningsHistory = earningsData?.history || [];
  const availableCount = availableDeliveries.length;

  const isLoading =
    userLoading || availableLoading || deliveriesLoading || earningsLoading;
  const error = availableError || deliveriesError || earningsError;

  // 6 most recent deliveries (sort defensively by createdAt desc)
  const recentDeliveries = useMemo(() => {
    return [...myDeliveries]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, RECENT_DELIVERIES_LIMIT);
  }, [myDeliveries]);

  // ─── Chart data (real earnings history, aggregated by day) ──
  const chartData = useMemo(() => {
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const buckets = [];

    // Build the last 7 days in chronological order
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.push({
        date: dayLabels[d.getDay()],
        dateKey: d.toISOString().split("T")[0],
        amount: 0,
      });
    }

    // Fill from real history
    earningsHistory.forEach((item) => {
      if (!item.completedAt) return;
      const key = new Date(item.completedAt).toISOString().split("T")[0];
      const bucket = buckets.find((b) => b.dateKey === key);
      if (bucket) {
        bucket.amount += item.riderCommission || 0;
      }
    });

    return buckets.map(({ date, amount }) => ({ date, amount }));
  }, [earningsHistory]);

  // ─── Stats cards ──────────────────────────────────────────
  const stats = [
    {
      label: "Wallet Balance",
      value: hideStats ? "••••" : `₦${walletBalance.toFixed(2)}`,
      icon: Wallet,
    },
    {
      label: "Total Earnings",
      value: hideStats ? "••••" : `₦${totalEarnings.toFixed(2)}`,
      icon: TrendingUp,
    },
    {
      label: "Completed Deliveries",
      value: hideStats ? "••" : completedDeliveries,
      icon: Truck,
    },
    {
      label: "Available Deliveries",
      value: hideStats ? "••" : availableCount,
      icon: Clock,
    },
  ];

  // ─── Status colors ─────────────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
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

  // ─── Mobile Hero Card (skeleton-aware) ─────────────────────
  const HeroCard = () => {
    if (isLoading) {
      return (
        <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-2.5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2 space-y-2">
              <div className="h-2.5 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2 space-y-2">
              <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 gap-2">
            <div className="h-3.5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex-shrink-0" />
          </div>
        </div>
      );
    }

    return (
      <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Rider Dashboard
            </span>
            <h1
              className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white"
              title={user?.name || "Rider"}
            >
              Welcome, {user?.name?.split(" ")[0] || "Rider"}!
            </h1>
          </div>
          <button
            onClick={() => setHideStats((v) => !v)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex-shrink-0"
          >
            {hideStats ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2 min-w-0">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Wallet</span>
            <p
              className="text-lg font-bold text-gray-900 dark:text-white truncate"
              title={hideStats ? "" : `₦${walletBalance.toFixed(2)}`}
            >
              {hideStats ? "••••" : `₦${walletBalance.toFixed(2)}`}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2 min-w-0">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Completed</span>
            <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {hideStats ? "••" : completedDeliveries}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
            Available deliveries
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0">
            {availableCount}
          </span>
          <button
            onClick={() => navigate("/rider/deliveries")}
            className="flex items-center gap-1 text-xs font-medium text-white bg-[#13ec5b] hover:bg-[#10d04e] px-3 py-1.5 rounded-lg transition shadow-sm flex-shrink-0"
          >
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  // ─── Desktop Stat Card ─────────────────────────────────────
  const StatCard = ({ icon: Icon, label, value }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
            {label}
          </p>
          <p
            className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate"
            title={typeof value === "string" ? value : String(value)}
          >
            {value}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b] flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  // ─── Mobile Slim Delivery Item (mirrors Deliveries page) ──
  const SlimDeliveryItem = ({ delivery }) => {
    const deliveryLabel = `#${delivery.orderId || delivery._id.slice(-6)}`;
    const customerLabel = delivery.user?.name || "Unknown";
    const amountLabel = `₦${delivery.totalAmount?.toFixed(2) || "0.00"}`;
    const dateLabel = new Date(delivery.createdAt).toLocaleDateString();

    return (
      <div
        onClick={() => navigate(`/tracking/${delivery._id}`)}
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer transition last:border-b-0"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="font-medium text-gray-900 dark:text-white text-sm truncate"
              title={deliveryLabel}
            >
              {deliveryLabel}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${getStatusColor(
                delivery.deliveryStatus
              )}`}
            >
              {delivery.deliveryStatus || "pending"}
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

  // ─── Recent Deliveries (mirrors Deliveries page, 6 max) ────
  const RecentDeliveries = () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
          Recent Deliveries
        </h2>
        <button
          onClick={() => navigate("/rider/deliveries")}
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
                <col className="w-[18%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Order</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Customer</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Amount</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Date</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
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
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile skeleton list */}
          <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
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
      ) : recentDeliveries.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No deliveries yet</p>
          <button
            onClick={() => navigate("/rider/deliveries")}
            className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
          >
            Browse available deliveries
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
                <col className="w-[18%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Order</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Customer</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Amount</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Date</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentDeliveries.map((delivery) => {
                  const deliveryLabel = `#${delivery.orderId || delivery._id.slice(-6)}`;
                  const customerLabel = delivery.user?.name || "Unknown";
                  const amountLabel = `₦${delivery.totalAmount?.toFixed(2) || "0.00"}`;
                  const dateLabel = new Date(delivery.createdAt).toLocaleDateString();

                  return (
                    <tr
                      key={delivery._id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer last:border-b-0"
                      onClick={() => navigate(`/tracking/${delivery._id}`)}
                    >
                      <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                        <div className="truncate" title={deliveryLabel}>
                          {deliveryLabel}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">
                        <div className="truncate" title={customerLabel}>
                          {customerLabel}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="truncate" title={amountLabel}>
                          {amountLabel}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium max-w-full ${getStatusColor(
                            delivery.deliveryStatus
                          )}`}
                        >
                          <span className="truncate">
                            {delivery.deliveryStatus || "pending"}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">
                        <div className="truncate" title={dateLabel}>
                          {dateLabel}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tracking/${delivery._id}`);
                          }}
                          className="text-xs bg-[#13ec5b] hover:bg-[#10d04e] text-white px-3 py-1 rounded-lg transition flex-shrink-0"
                        >
                          Track
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile slim list */}
          <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {recentDeliveries.map((delivery) => (
              <SlimDeliveryItem key={delivery._id} delivery={delivery} />
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ─── Loading & Errors ──────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <RiderSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Dashboard
            </h1>
          </header>
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">
                Failed to load dashboard data
              </p>
            </div>
          </div>
        </div>
        <RiderBottombar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RiderSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Rider Dashboard
          </h1>
          <div className="flex items-center gap-3 flex-shrink-0">
            {userLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse hidden sm:block" />
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline truncate max-w-[120px]">
                  {user.name?.split(" ")[0]}
                </span>
                <div className="h-8 w-8 rounded-full bg-[#13ec5b]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Truck className="h-4 w-4 text-[#13ec5b]" />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {/* Main Container */}
        <div className="w-full px-1 sm:px-4 lg:px-6 py-4">
          <HeroCard />

          {/* Desktop welcome */}
          <div className="hidden lg:block mb-6 min-w-0">
            {userLoading ? (
              <>
                <div className="h-8 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </>
            ) : (
              <>
                <h2
                  className="text-2xl font-bold text-gray-900 dark:text-white truncate"
                  title={`Welcome back, ${user?.name || "Rider"}!`}
                >
                  Welcome back, {user?.name || "Rider"}!
                </h2>
                <p className="text-gray-500 dark:text-gray-400 truncate">
                  Here's your delivery overview.
                </p>
              </>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {isLoading
              ? [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                      <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    </div>
                  </div>
                ))
              : stats.map((stat, idx) => (
                  <StatCard
                    key={idx}
                    icon={stat.icon}
                    label={stat.label}
                    value={stat.value}
                  />
                ))}
          </div>

          {/* Chart + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm min-w-0">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                  Weekly Earnings
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
                          id="riderEarningsGradient"
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
                        tickFormatter={(v) => `₦${v}`}
                        width={40}
                      />
                      <Tooltip
                        formatter={(value) => [`₦${value}`, "Earnings"]}
                        contentStyle={{
                          backgroundColor: "rgba(255,255,255,0.9)",
                          border: "none",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#13ec5b"
                        strokeWidth={2}
                        fill="url(#riderEarningsGradient)"
                        dot={{ r: 2, fill: "#13ec5b" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/rider/deliveries")}
                className="bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-2xl p-4 flex flex-col items-center justify-center transition shadow-sm hover:shadow-md"
              >
                <Truck className="h-8 w-8 mb-1" />
                <span className="text-sm font-medium">Deliveries</span>
              </button>
              <button
                onClick={() => navigate("/rider/earnings")}
                className="bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 text-[#13ec5b] rounded-2xl p-4 flex flex-col items-center justify-center transition border border-[#13ec5b]/20"
              >
                <Wallet className="h-8 w-8 mb-1" />
                <span className="text-sm font-medium">Earnings</span>
              </button>
              <button
                onClick={() => navigate("/tracking")}
                className="col-span-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-2xl p-3 flex items-center justify-center transition"
              >
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Active Tracking</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>

          {/* Recent Deliveries — mirrors Deliveries page, 6 max */}
          <RecentDeliveries />
        </div>
      </div>

      <RiderBottombar />
    </div>
  );
};

export default RiderDashboard;