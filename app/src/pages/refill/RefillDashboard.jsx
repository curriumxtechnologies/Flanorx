// src/pages/refill/RefillDashboard.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  Store,
  Package,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Users,
  FileText,
  Settings,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

import { useGetProfileQuery } from "../../features/userApiSlice";
import {
  useGetRefillStationDashboardQuery,
  useGetRefillStationOrdersQuery,
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
    default:
      return "text-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
  }
};

const RefillDashboard = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // ─── Queries ───────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = useGetProfileQuery();

  // If the user has no station attached, this will error (which we handle below)
  const {
    data: dashboardData,
    isLoading: dashLoading,
    error: dashError,
  } = useGetRefillStationDashboardQuery(undefined, {
    pollingInterval: 30000, // refresh every 30s
    refetchOnFocus: true,
  });

  // Fetch recent orders (limit to 5)
  const { data: recentOrders = [], isLoading: ordersLoading } =
    useGetRefillStationOrdersQuery(
      { limit: 5 },
      {
        skip: !!dashError, // don't fetch if they aren't a station
        pollingInterval: 30000,
        refetchOnFocus: true,
      }
    );

  const isLoading = profileLoading || dashLoading || ordersLoading;

  // ─── Error State (Not a station owner/staff) ───────────────
  if (dashError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <RefillSidebar />
        <div className="lg:ml-64 flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <ShieldAlert className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Station Access Only
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              You are not currently attached to an approved refill station. If
              you applied recently, your application may still be under review.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate("/refill")}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-xl transition"
              >
                Back to Customer View
              </button>
              <button
                onClick={() => navigate("/refill/apply")}
                className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white font-medium rounded-xl transition"
              >
                Apply as a Station
              </button>
            </div>
          </div>
        </div>
        <RefillBottombar />
      </div>
    );
  }

  // ─── Derived Data ──────────────────────────────────────────
  const station = dashboardData?.station || {};
  const awaitingAcceptance = dashboardData?.awaitingAcceptance || 0;
  const inProgress = dashboardData?.inProgress || 0;
  const completedToday = dashboardData?.completedToday || 0;
  const revenueToday = dashboardData?.revenueToday || 0;
  const revenueMonth = dashboardData?.revenueMonth || 0;

  const openInvoice = dashboardData?.commission?.openInvoice;
  const isOverdue = openInvoice?.status === "overdue";

  // ─── Components ────────────────────────────────────────────
  const StatCard = ({ icon: Icon, label, value, subValue, danger }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
            {label}
          </p>
          <p
            className={`text-2xl font-bold mt-1 truncate ${
              danger
                ? "text-red-600 dark:text-red-400"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {value}
          </p>
          {subValue && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {subValue}
            </p>
          )}
        </div>
        <div
          className={`p-2 rounded-lg flex-shrink-0 ${
            danger
              ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
              : "bg-[#13ec5b]/10 text-[#13ec5b]"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RefillSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
              {station.businessName || "Station Dashboard"}
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#13ec5b] bg-[#13ec5b]/10 rounded">
              {station.status || "Active"}
            </span>
          </div>
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          {/* Overdue Commission Alert */}
          {isOverdue && (
            <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800 dark:text-red-300">
                    Overdue Commission Invoice
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                    You owe {formatNaira(openInvoice.commissionOwed)}. Please pay
                    immediately to avoid your station being suspended.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/refill/station/commission")}
                className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
              >
                Pay Now
              </button>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm h-24 animate-pulse"
                />
              ))
            ) : (
              <>
                <StatCard
                  icon={Package}
                  label="Awaiting Action"
                  value={awaitingAcceptance}
                  subValue="Orders needing acceptance"
                />
                <StatCard
                  icon={Clock}
                  label="In Progress"
                  value={inProgress}
                  subValue="Orders being prepared"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Today's Revenue"
                  value={formatNaira(revenueToday)}
                  subValue={`${completedToday} completed orders`}
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Month Revenue"
                  value={formatNaira(revenueMonth)}
                />
              </>
            )}
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mb-8">
            <button
              onClick={() => navigate("/refill/station/orders")}
              className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-3 lg:p-4 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-xl lg:rounded-2xl transition shadow-sm min-w-0"
            >
              <Package className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
              <span className="text-xs lg:text-sm font-medium truncate">
                Manage Orders
              </span>
            </button>
            <button
              onClick={() => navigate("/refill/station/team")}
              className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-3 lg:p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl lg:rounded-2xl transition min-w-0"
            >
              <Users className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
              <span className="text-xs lg:text-sm font-medium truncate">
                Team & Riders
              </span>
            </button>
            <button
              onClick={() => navigate("/refill/station/commission")}
              className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-3 lg:p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl lg:rounded-2xl transition min-w-0"
            >
              <FileText className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
              <span className="text-xs lg:text-sm font-medium truncate">
                Invoices
              </span>
            </button>
            <button
              onClick={() => navigate("/refill/station/settings")}
              className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-3 lg:p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl lg:rounded-2xl transition min-w-0"
            >
              <Settings className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
              <span className="text-xs lg:text-sm font-medium truncate">
                Settings
              </span>
            </button>
          </div>

          {/* Recent Orders */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Recent Orders
              </h3>
              <button
                onClick={() => navigate("/refill/station/orders")}
                className="text-sm text-[#13ec5b] hover:underline flex-shrink-0"
              >
                View all
              </button>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No orders yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  When customers place orders with your station, they'll appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentOrders.map((order) => (
                  <button
                    key={order._id}
                    onClick={() => navigate(`/refill/station/orders/${order._id}`)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 mb-0.5">
                        <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {order.customer?.name || "Customer"}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 capitalize ${getOrderStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                        <span className="flex-shrink-0">
                          {order.cylinderSize} × {order.quantity}
                        </span>
                        <span className="flex-shrink-0">·</span>
                        <span className="truncate">{formatNaira(order.totalAmount)}</span>
                        <span className="flex-shrink-0">·</span>
                        <span className="flex-shrink-0">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <RefillBottombar />
    </div>
  );
};

export default RefillDashboard;