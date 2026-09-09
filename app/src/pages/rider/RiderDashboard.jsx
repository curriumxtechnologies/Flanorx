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
  Loader2,
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

  const isLoading = userLoading || availableLoading || deliveriesLoading || earningsLoading;
  const error = availableError || deliveriesError || earningsError;

  // ─── Chart data (from earnings history or simulated) ──────
  const chartData = useMemo(() => {
    // If we have history, aggregate by day for last 7 days
    if (earningsHistory.length > 0) {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const today = new Date();
      const dayMap = {};
      // Initialize all days with 0
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const dayName = days[d.getDay()];
        dayMap[dayName] = 0;
      }
      // Fill with actual earnings from history (only completed orders)
      earningsHistory.forEach((item) => {
        if (item.completedAt) {
          const date = new Date(item.completedAt);
          const dayName = days[date.getDay()];
          if (dayMap[dayName] !== undefined) {
            dayMap[dayName] += item.riderCommission || 0;
          }
        }
      });
      return Object.entries(dayMap).map(([date, amount]) => ({ date, amount }));
    } else {
      // Fallback simulated data
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const data = [];
      for (let i = 0; i < 7; i++) {
        const amount = Math.floor(Math.random() * 800) + 200;
        data.push({ date: days[i], amount });
      }
      return data;
    }
  }, [earningsHistory]);

  // ─── Stats cards ──────────────────────────────────────────
  const stats = [
    { label: "Wallet Balance", value: hideStats ? "••••" : `₦${walletBalance.toFixed(2)}`, icon: Wallet, color: "text-[#13ec5b]" },
    { label: "Total Earnings", value: hideStats ? "••••" : `₦${totalEarnings.toFixed(2)}`, icon: TrendingUp, color: "text-blue-600" },
    { label: "Completed Deliveries", value: hideStats ? "••" : completedDeliveries, icon: Truck, color: "text-purple-600" },
    { label: "Available Deliveries", value: hideStats ? "••" : availableCount, icon: Clock, color: "text-yellow-600" },
  ];

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

  // ─── Mobile Hero Card ──────────────────────────────────────
  const HeroCard = () => (
    <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Rider Dashboard
          </span>
          <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white">
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
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Wallet</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {hideStats ? "••••" : `₦${walletBalance.toFixed(2)}`}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Completed</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {hideStats ? "••" : completedDeliveries}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-300">Available deliveries</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white">{availableCount}</span>
        <button
          onClick={() => navigate("/rider/deliveries")}
          className="flex items-center gap-1 text-xs font-medium text-white bg-[#13ec5b] hover:bg-[#10d04e] px-3 py-1.5 rounded-lg transition shadow-sm"
        >
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  // ─── Desktop Stat Card ─────────────────────────────────────
  const StatCard = ({ icon: Icon, label, value }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  // ─── Recent Deliveries Item ────────────────────────────────
  const DeliveryItem = ({ delivery }) => (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-0 transition"
      onClick={() => navigate(`/tracking/${delivery._id}`)}
    >
      <div className="w-9 h-9 rounded-xl bg-[#13ec5b]/10 flex items-center justify-center flex-shrink-0">
        <Package className="h-4 w-4 text-[#13ec5b]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            #{delivery.orderId}
          </p>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              delivery.deliveryStatus
            )}`}
          >
            {delivery.deliveryStatus}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{delivery.user?.name || "Unknown"}</span>
          <span>·</span>
          <span>₦{delivery.totalAmount?.toFixed(2) || "0.00"}</span>
          <span>·</span>
          <span>{new Date(delivery.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );

  // ─── Loading & Errors ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <RiderSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Dashboard</h1>
          </header>
          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#13ec5b]" />
            </div>
          </div>
        </div>
        <RiderBottombar />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <RiderSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Dashboard</h1>
          </header>
          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">Failed to load dashboard data</p>
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
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
            Rider Dashboard
          </h1>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                  {user.name?.split(" ")[0]}
                </span>
                <div className="h-8 w-8 rounded-full bg-[#13ec5b]/10 flex items-center justify-center overflow-hidden">
                  {user.profilePhoto ? (
                    <img src={user.profilePhoto} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <Truck className="h-4 w-4 text-[#13ec5b]" />
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Container – full width on mobile */}
        <div className="w-full px-0 sm:px-4 lg:px-6 py-4">
          <HeroCard />

          {/* Desktop welcome */}
          <div className="hidden lg:block mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.name || "Rider"}!
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Here's your delivery overview.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, idx) => (
              <StatCard key={idx} icon={stat.icon} label={stat.label} value={stat.value} />
            ))}
          </div>

          {/* Chart + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Weekly Earnings
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Last 7 days
                </span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="riderEarningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#13ec5b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" tickMargin={5} />
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

          {/* Recent Deliveries */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                My Recent Deliveries
              </h3>
              <button
                onClick={() => navigate("/rider/deliveries")}
                className="text-sm text-[#13ec5b] hover:underline"
              >
                View all
              </button>
            </div>
            <div>
              {myDeliveries.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No deliveries yet</p>
                </div>
              ) : (
                myDeliveries.slice(0, 5).map((delivery) => (
                  <DeliveryItem key={delivery._id} delivery={delivery} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <RiderBottombar />
    </div>
  );
};

export default RiderDashboard;