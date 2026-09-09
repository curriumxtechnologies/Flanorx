// src/pages/rider/RiderEarnings.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Wallet,
  TrendingUp,
  Truck,
  Clock,
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  Calendar,
  Package,
  XCircle,
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
import { useGetRiderEarningsQuery } from "../../features/deliveryApiSlice";

const RiderEarnings = () => {
  const navigate = useNavigate();
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ─── Query ──────────────────────────────────────────────
  const {
    data: earningsData,
    isLoading,
    error,
    refetch,
  } = useGetRiderEarningsQuery();

  // ─── Derived data ──────────────────────────────────────
  const walletBalance = earningsData?.walletBalance || 0;
  const totalEarnings = earningsData?.totalEarnings || 0;
  const completedDeliveries = earningsData?.completedDeliveries || 0;
  const history = earningsData?.history || [];

  // ─── Chart data (weekly earnings from history) ─────────
  const chartData = useMemo(() => {
    if (history.length === 0) {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return days.map((date) => ({
        date,
        amount: Math.floor(Math.random() * 800) + 200,
      }));
    }

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();
    const dayMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dayName = days[d.getDay()];
      dayMap[dayName] = 0;
    }
    history.forEach((item) => {
      if (item.completedAt) {
        const date = new Date(item.completedAt);
        const dayName = days[date.getDay()];
        if (dayMap[dayName] !== undefined) {
          dayMap[dayName] += item.riderCommission || 0;
        }
      }
    });
    return Object.entries(dayMap).map(([date, amount]) => ({ date, amount }));
  }, [history]);

  // ─── Stats for desktop ──────────────────────────────────
  const stats = [
    { label: "Wallet Balance", value: `₦${walletBalance.toFixed(2)}`, icon: Wallet },
    { label: "Total Earnings", value: `₦${totalEarnings.toFixed(2)}`, icon: TrendingUp },
    { label: "Completed Deliveries", value: completedDeliveries, icon: Truck },
    { label: "History Entries", value: history.length, icon: Clock },
  ];

  // ─── Mobile Hero Card ──────────────────────────────────
  const HeroCard = () => (
    <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 mb-4 shadow-sm rounded-none sm:rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Earnings
          </span>
          <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white">
            Your Earnings
          </h1>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <RefreshCw className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Wallet</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">₦{walletBalance.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Total Earned</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">₦{totalEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2 col-span-2">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Completed Deliveries</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{completedDeliveries}</p>
        </div>
      </div>
    </div>
  );

  // ─── Detail Modal ──────────────────────────────────────
  const DetailModal = () => {
    if (!selectedHistory) return null;
    const item = selectedHistory;

    return (
      <>
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowDetailModal(false)}
        />
        <div
          className="fixed z-50 bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto transition-transform duration-300 ease-in-out
            bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl
            lg:bottom-auto lg:top-0 lg:right-0 lg:left-auto lg:w-full lg:max-w-lg lg:rounded-none lg:h-full lg:max-h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              Earning #{item.orderId}
            </h3>
            <button
              onClick={() => setShowDetailModal(false)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <XCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Order ID</p>
                <p className="text-gray-900 dark:text-white">#{item.orderId}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Type</p>
                <p className="text-gray-900 dark:text-white capitalize">{item.orderType || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Service Tax</p>
                <p className="text-gray-900 dark:text-white">₦{item.serviceTax?.toFixed(2) || "0.00"}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Your Commission</p>
                <p className="text-lg font-bold text-[#13ec5b]">₦{item.riderCommission?.toFixed(2) || "0.00"}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-gray-500 dark:text-gray-400 text-xs">Completed At</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {item.completedAt ? new Date(item.completedAt).toLocaleString() : "—"}
              </p>
            </div>

            <button
              onClick={() => {
                setShowDetailModal(false);
                navigate(`/tracking/${item._id}`);
              }}
              className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View Order
            </button>
          </div>
        </div>
      </>
    );
  };

  // ─── History List Item ──────────────────────────────────
  const HistoryItem = ({ entry }) => (
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer transition"
      onClick={() => {
        setSelectedHistory(entry);
        setShowDetailModal(true);
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
            #{entry.orderId}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {entry.orderType || "order"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          <span>Commission: ₦{entry.riderCommission?.toFixed(2) || "0.00"}</span>
          <span>·</span>
          <span>{entry.completedAt ? new Date(entry.completedAt).toLocaleDateString() : "—"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <span className="text-sm font-medium text-[#13ec5b]">
          ₦{entry.riderCommission?.toFixed(2) || "0.00"}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg]" />
      </div>
    </div>
  );

  // ─── Loading & Errors ──────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <RiderSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Earnings</h1>
          </header>
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Earnings</h1>
          </header>
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">Failed to load earnings</p>
            </div>
          </div>
        </div>
        <RiderBottombar />
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────
  const isModalOpen = showDetailModal;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RiderSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Earnings</h1>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </header>

        <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
          {/* Hero Card (mobile) – full width, no rounded corners on mobile */}
          <HeroCard />

          {/* Desktop Stats Grid */}
          <div className="hidden lg:grid grid-cols-4 gap-4 mb-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b]`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart – no rounded corners on mobile */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 shadow-sm mb-6 rounded-none sm:rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Weekly Earnings Trend</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">Last 7 days</span>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#earningsGradient)"
                    dot={{ r: 2, fill: "#13ec5b" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* History List – no rounded corners on mobile */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Earnings History</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">{history.length} entries</span>
            </div>
            <div>
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No earnings yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {history.map((entry, idx) => (
                    <HistoryItem key={idx} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isModalOpen && <RiderBottombar />}

      {showDetailModal && <DetailModal />}
    </div>
  );
};

export default RiderEarnings;