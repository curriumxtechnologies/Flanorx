// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  User,
  Package,
  TrendingUp,
  Flame,
  Clock,
  AlertCircle,
  PlusCircle,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Calendar,
  Eye,
  EyeOff,
  X,
  MapPin,
  Navigation,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGetProfileQuery } from "../features/userApiSlice";
import {
  useGetMyOrdersQuery,
  useGetMyTotalSpentQuery,
  useGetMyActiveOrderQuery,
} from "../features/orderApiSlice";
import { useGetTrackingQuery } from "../features/trackingApiSlice";
import { useGetGasSubscriptionQuery } from "../features/gasApiSlice";
import Sidebar from "../components/Sidebar";
import Bottombar from "../components/Bottombar";

// ─── Leaflet icon fix ──────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const greenIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const RECENT_ORDERS_LIMIT = 6;

// ─── Quick range presets ───────────────────────────────────
const QUICK_FILTERS = [
  { type: "all", label: "All Time" },
  { type: "week", label: "This Week" },
  { type: "lastWeek", label: "Last Week" },
  { type: "month", label: "This Month" },
  { type: "lastMonth", label: "Last Month" },
  { type: "last2Months", label: "Last 2 Months" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Compute weeks of a given month (1-7, 8-14, 15-21, ...)
const getWeeksInMonth = (year, month) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  for (let start = 1; start <= lastDay; start += 7) {
    const end = Math.min(start + 6, lastDay);
    weeks.push({ num: weeks.length + 1, start, end });
  }
  return weeks;
};

// Human-readable label for the filter button
const formatFilterLabel = (filter) => {
  switch (filter.type) {
    case "all": return "All Time";
    case "week": return "This Week";
    case "lastWeek": return "Last Week";
    case "month": return "This Month";
    case "lastMonth": return "Last Month";
    case "last2Months": return "Last 2 Months";
    case "year": return String(filter.year);
    case "yearMonth": {
      const d = new Date(filter.year, filter.month, 1);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    case "yearMonthWeek": {
      const d = new Date(filter.year, filter.month, 1);
      return `${d.toLocaleDateString("en-US", { month: "short" })} W${filter.week}`;
    }
    default: return "All Time";
  }
};

// Human-readable subtitle under chart title
const formatFilterSubtitle = (filter) => {
  switch (filter.type) {
    case "all": return "All time";
    case "week": return "Last 7 days";
    case "lastWeek": return "Previous 7 days";
    case "month": return "This month · daily";
    case "lastMonth": return "Last month · daily";
    case "last2Months": return "Last 2 months";
    case "year": return `${filter.year} · monthly`;
    case "yearMonth": {
      const d = new Date(filter.year, filter.month, 1);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    case "yearMonthWeek": {
      const d = new Date(filter.year, filter.month, 1);
      const weeks = getWeeksInMonth(filter.year, filter.month);
      const wk = weeks.find((w) => w.num === filter.week);
      const range = wk ? ` · ${d.toLocaleDateString("en-US", { month: "short" })} ${wk.start}–${wk.end}` : "";
      return `${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })} · Week ${filter.week}${range}`;
    }
    default: return "All time";
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const [hideStats, setHideStats] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  // ─── Chart filter state ───────────────────────────────────
  // chartFilter.type: "all" | "week" | "lastWeek" | "month" |
  //                   "lastMonth" | "last2Months" |
  //                   "year" | "yearMonth" | "yearMonthWeek"
  const [chartFilter, setChartFilter] = useState({ type: "all" });

  // Dropdown navigation state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropLevel, setDropLevel] = useState("root"); // "root" | "months" | "weeks"
  const [dropYear, setDropYear] = useState(null);
  const [dropMonth, setDropMonth] = useState(null);
  const chartFilterRef = useRef(null);

  // Open dropdown → always start at root
  const openDropdown = () => {
    setDropLevel("root");
    setDropYear(null);
    setDropMonth(null);
    setDropdownOpen(true);
  };

  const closeDropdown = () => setDropdownOpen(false);

  // Outside click closes dropdown
  useEffect(() => {
    const handler = (e) => {
      if (chartFilterRef.current && !chartFilterRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  // ─── Queries ───────────────────────────────────────────────
  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useGetProfileQuery();

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const { data: orders = [], isLoading: ordersLoading } = useGetMyOrdersQuery({
    month: currentMonth,
    year: currentYear,
  });

  const { data: totalSpentData, isLoading: spentLoading } = useGetMyTotalSpentQuery({
    month: currentMonth,
    year: currentYear,
    paid: true,
  });

  const { data: activeOrder, isLoading: activeLoading } = useGetMyActiveOrderQuery();

  const { data: trackingData, isLoading: trackingLoading } = useGetTrackingQuery(
    activeOrder?._id,
    { skip: !activeOrder }
  );

  const { data: subscriptionData, isLoading: subLoading } = useGetGasSubscriptionQuery();

  // ─── Derived data ──────────────────────────────────────────
  const totalOrders = orders.length;
  const monthlySpent = totalSpentData?.totalSpent || 0;
  const totalLiters = totalSpentData?.totalLiters || 0;
  const totalKg = totalSpentData?.totalKg || 0;

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, RECENT_ORDERS_LIMIT);
  }, [orders]);

  // Subscription status
  const hasGasSubscription = subscriptionData?.isActive || false;
  const cylinderSize = subscriptionData?.cylinderSize || null;
  const daysRemaining = subscriptionData?.daysRemaining || 0;
  const subscription = subscriptionData?.subscription || null;
  const isActive = hasGasSubscription;
  const dueDate = subscription?.nextBillingDate ? new Date(subscription.nextBillingDate) : null;
  const isExpired = !isActive && subscription?.status === "expired";
  const isNearExpiry = isActive && daysRemaining <= 7;

  let subStatus = "none";
  if (isActive && !isNearExpiry) subStatus = "active";
  else if (isActive && isNearExpiry) subStatus = "near";
  else if (isExpired) subStatus = "expired";
  else subStatus = "none";

  // ─── Available years (from orders + current year) ─────────
  const availableYears = useMemo(() => {
    const years = new Set();
    years.add(new Date().getFullYear());
    (orders || []).forEach((o) => {
      if (o.createdAt) years.add(new Date(o.createdAt).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a); // newest first
  }, [orders]);

  // ─── Chart data ────────────────────────────────────────────
  const chartData = useMemo(() => {
    const now = new Date();
    const paidOrders = (orders || []).filter((o) => o.paid && o.createdAt);

    const sumByDay = (yyyy, mm, dd) =>
      paidOrders
        .filter((o) => {
          const d = new Date(o.createdAt);
          return d.getFullYear() === yyyy && d.getMonth() === mm && d.getDate() === dd;
        })
        .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const sumByMonth = (yyyy, mm) =>
      paidOrders
        .filter((o) => {
          const d = new Date(o.createdAt);
          return d.getFullYear() === yyyy && d.getMonth() === mm;
        })
        .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const round = (n) => Math.round(n * 100) / 100;

    // ─── This Week: last 7 days ────────────────────────────
    if (chartFilter.type === "week") {
      const out = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        out.push({
          label: d.toLocaleDateString("en-US", { weekday: "short" }),
          amount: round(sumByDay(d.getFullYear(), d.getMonth(), d.getDate())),
        });
      }
      return out;
    }

    // ─── Last Week: 7–14 days ago ──────────────────────────
    if (chartFilter.type === "lastWeek") {
      const out = [];
      for (let i = 13; i >= 7; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        out.push({
          label: d.toLocaleDateString("en-US", { weekday: "short" }),
          amount: round(sumByDay(d.getFullYear(), d.getMonth(), d.getDate())),
        });
      }
      return out;
    }

    // ─── This Month: day by day up to today ────────────────
    if (chartFilter.type === "month") {
      const y = now.getFullYear();
      const m = now.getMonth();
      const today = now.getDate();
      const out = [];
      for (let d = 1; d <= today; d++) {
        out.push({ label: String(d), amount: round(sumByDay(y, m, d)) });
      }
      return out;
    }

    // ─── Last Month: full previous calendar month ──────────
    if (chartFilter.type === "lastMonth") {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      const out = [];
      for (let i = 1; i <= lastDay; i++) {
        out.push({ label: String(i), amount: round(sumByDay(y, m, i)) });
      }
      return out;
    }

    // ─── Last 2 Months: previous + current, by month ───────
    if (chartFilter.type === "last2Months") {
      const out = [];
      for (let i = 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push({
          label: d.toLocaleDateString("en-US", { month: "short" }),
          amount: round(sumByMonth(d.getFullYear(), d.getMonth())),
        });
      }
      return out;
    }

    // ─── Year: Jan → Dec of chosen year ────────────────────
    if (chartFilter.type === "year") {
      const y = chartFilter.year;
      const out = [];
      for (let m = 0; m < 12; m++) {
        out.push({
          label: MONTH_NAMES[m].slice(0, 3),
          amount: round(sumByMonth(y, m)),
        });
      }
      return out;
    }

    // ─── Year + Month: day-by-day of chosen month ──────────
    if (chartFilter.type === "yearMonth") {
      const { year, month } = chartFilter;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const out = [];
      for (let d = 1; d <= lastDay; d++) {
        out.push({ label: String(d), amount: round(sumByDay(year, month, d)) });
      }
      return out;
    }

    // ─── Year + Month + Week: days of that week ────────────
    if (chartFilter.type === "yearMonthWeek") {
      const { year, month, week } = chartFilter;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const startDay = (week - 1) * 7 + 1;
      const endDay = Math.min(startDay + 6, lastDay);
      const out = [];
      for (let d = startDay; d <= endDay; d++) {
        out.push({ label: String(d), amount: round(sumByDay(year, month, d)) });
      }
      return out;
    }

    // ─── All Time: monthly from first order → now ──────────
    if (!paidOrders.length) {
      const out = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push({ label: d.toLocaleDateString("en-US", { month: "short" }), amount: 0 });
      }
      return out;
    }

    const sorted = [...paidOrders].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    const earliest = new Date(sorted[0].createdAt);
    const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);

    const spansMultipleYears = start.getFullYear() !== end.getFullYear();
    const out = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const monthAbbr = cursor.toLocaleDateString("en-US", { month: "short" });
      const label = spansMultipleYears ? `${monthAbbr} '${String(y).slice(-2)}` : monthAbbr;
      out.push({ label, amount: round(sumByMonth(y, m)) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [orders, chartFilter]);

  // ─── Loading & errors ──────────────────────────────────────
  const isLoading = userLoading || ordersLoading || spentLoading || activeLoading || subLoading;

  if (userError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">Failed to load profile</p>
        </div>
      </div>
    );
  }

  // ─── Status color helpers ──────────────────────────────────
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

  // ─── Subscription Modal ────────────────────────────────────
  const SubscriptionModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setShowSubModal(false)}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 mx-4 mb-4 sm:mb-0 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Gas Subscription</h3>
          <button onClick={() => setShowSubModal(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {!isActive ? (
          <div className="text-center py-6">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300">You don't have an active gas subscription.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Get your first cylinder to enjoy hassle‑free gas swaps.</p>
            <button
              onClick={() => { setShowSubModal(false); navigate("/order/gas"); }}
              className="mt-4 px-6 py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition font-medium"
            >
              Order Gas
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">Cylinder</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[60%] text-right" title={cylinderSize || ""}>
                {cylinderSize}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">Status</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                isExpired ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                : isActive ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                : "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
              }`}>
                {isExpired ? "Expired" : isActive ? "Active" : "Inactive"}
              </span>
            </div>
            {dueDate && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">Renewal Date</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[60%] text-right">
                  {dueDate.toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              {isExpired ? (
                <p className="text-sm text-red-600 dark:text-red-400">Your subscription has expired. Please renew.</p>
              ) : isNearExpiry ? (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Expires in {daysRemaining} days.</p>
              ) : (
                <p className="text-sm text-green-600 dark:text-green-400">Active – swap your empty cylinder anytime.</p>
              )}
            </div>
            <button
              onClick={() => { setShowSubModal(false); navigate("/order/gas"); }}
              className="w-full mt-3 py-2.5 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition font-medium"
            >
              {isExpired ? "Renew Subscription" : "Order Gas Swap"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Mobile Hero Card ──────────────────────────────────────
  const HeroCard = () => {
    if (isLoading) {
      return (
        <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
          </div>
          <div className="flex items-end justify-between mb-3 gap-2">
            <div className="min-w-0 space-y-2">
              <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="text-right min-w-0 space-y-2">
              <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
            </div>
          </div>
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 gap-2">
            <div className="flex items-center gap-5 min-w-0">
              <div className="space-y-1.5">
                <div className="h-2.5 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3.5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2.5 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">Welcome back</span>
            <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white" title={user?.name || "User"}>
              {user?.name ? user.name.split(" ")[0] : "User"}!
            </h1>
          </div>
          <button
            onClick={() => setHideStats((v) => !v)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex-shrink-0"
          >
            {hideStats ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-end justify-between mb-3 gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Orders</span>
            <p className="text-3xl font-bold text-gray-900 dark:text-white truncate">
              {hideStats ? "••" : totalOrders}
            </p>
          </div>
          <div className="text-right min-w-0">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">This Month</span>
            <p className="text-xl font-bold text-gray-900 dark:text-white truncate" title={hideStats ? "" : `₦${monthlySpent.toFixed(2)}`}>
              {hideStats ? "••••" : `₦${monthlySpent.toFixed(0)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 gap-2">
          <div className="flex items-center gap-5 min-w-0">
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Fuel</span>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {hideStats ? "••" : `${totalLiters.toFixed(1)}L`}
              </p>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Gas</span>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {hideStats ? "••" : `${totalKg.toFixed(1)}kg`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center gap-1 text-xs font-medium text-white bg-[#13ec5b] hover:bg-[#10d04e] px-3 py-1.5 rounded-lg border border-[#13ec5b] transition shadow-sm flex-shrink-0"
          >
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  // ─── Live Tracking Card ──────────────────────────────────
  const LiveTracking = () => {
    const hasActiveOrder = !!activeOrder;
    const hasTracking = !!trackingData && trackingData.status === "active";
    const isLoadingState = trackingLoading || activeLoading;

    const defaultCenter = [6.5244, 3.3792];
    const mapCenter = trackingData?.riderLocation
      ? [trackingData.riderLocation.lat, trackingData.riderLocation.lng]
      : trackingData?.userLocation
      ? [trackingData.userLocation.lat, trackingData.userLocation.lng]
      : defaultCenter;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm h-full flex flex-col isolate">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 text-[#13ec5b] flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">Live Tracking</h3>
          </div>
          {isLoadingState ? (
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse flex-shrink-0" />
          ) : (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
              hasTracking ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
              : hasActiveOrder ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
              : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block bg-current" />
              {hasTracking ? "Live" : hasActiveOrder ? "Waiting" : "Inactive"}
            </span>
          )}
        </div>
        <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 isolate z-0">
          {isLoadingState ? (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ) : hasActiveOrder ? (
            <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false} attributionControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              {trackingData?.riderLocation && (
                <Marker position={[trackingData.riderLocation.lat, trackingData.riderLocation.lng]} icon={greenIcon}>
                  <Popup>Rider</Popup>
                </Marker>
              )}
              {trackingData?.userLocation && (
                <Marker position={[trackingData.userLocation.lat, trackingData.userLocation.lng]}>
                  <Popup>You</Popup>
                </Marker>
              )}
              {trackingData?.route?.polyline && (
                <Polyline
                  positions={L.Polyline.fromEncoded(trackingData.route.polyline).getLatLngs()}
                  color="#13ec5b" weight={3} opacity={0.8}
                />
              )}
            </MapContainer>
          ) : (
            <div className="relative h-full w-full bg-gray-300 dark:bg-gray-600">
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-6 text-center max-w-xs mx-4 shadow-xl">
                  <Navigation className="h-10 w-10 text-[#13ec5b] mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No active delivery</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Place an order to start tracking</p>
                  <button
                    onClick={() => navigate("/order/fuel")}
                    className="mt-3 px-4 py-2 bg-[#13ec5b] hover:bg-[#10d04e] text-white text-sm font-medium rounded-lg transition shadow-sm"
                  >
                    Place an order now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex-1 flex flex-col justify-between min-w-0">
          {isLoadingState ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ) : hasActiveOrder ? (
            <>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate" title={`Order #${activeOrder.orderId}`}>
                    Order #{activeOrder.orderId}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                    hasTracking ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
                  }`}>
                    {hasTracking ? "Active" : "Processing"}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 truncate">
                  {activeOrder.orderType === "fuel"
                    ? `${activeOrder.quantity} L of ${activeOrder.fuelType}`
                    : `${activeOrder.gasDetails?.quantityKg} kg gas (${activeOrder.gasDetails?.cylinderSize})`}
                </p>
                {hasTracking && trackingData?.rider && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
                    Rider: {trackingData.rider.name}
                  </p>
                )}
                {hasTracking && trackingData?.route?.distanceText && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                    Distance: {trackingData.route.distanceText} · ETA: {trackingData.route.durationText}
                  </p>
                )}
                {!hasTracking && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1 truncate">
                    Waiting for rider to accept and start tracking...
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate(`/tracking/${activeOrder._id}`)}
                className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium self-start"
              >
                {hasTracking ? "View full tracking →" : "Check status →"}
              </button>
            </>
          ) : (
            <div className="text-center py-1 flex-1 flex flex-col justify-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No orders to track</p>
              <button
                onClick={() => navigate("/order/fuel")}
                className="mt-2 text-[#13ec5b] hover:underline text-sm font-medium self-center"
              >
                Place an order now
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Desktop Stat Card ─────────────────────────────────────
  const StatCard = ({ icon: Icon, label, value }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate" title={typeof value === "string" ? value : String(value)}>
            {value}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b] flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  // ─── Chart Filter Dropdown ────────────────────────────────
  const ChartFilterDropdown = () => {
    // Week options for the currently-picked month
    const weeks = dropYear !== null && dropMonth !== null
      ? getWeeksInMonth(dropYear, dropMonth)
      : [];

    const isActive = (type, extras = {}) => {
      if (chartFilter.type !== type) return false;
      if ("year" in extras && chartFilter.year !== extras.year) return false;
      if ("month" in extras && chartFilter.month !== extras.month) return false;
      if ("week" in extras && chartFilter.week !== extras.week) return false;
      return true;
    };

    const Item = ({ onClick, children, active = false, indent = false }) => (
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between gap-2 ${
          active
            ? "bg-[#13ec5b]/10 text-[#13ec5b] font-medium"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        } ${indent ? "pl-4" : ""}`}
      >
        <span className="truncate">{children}</span>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-[#13ec5b] flex-shrink-0" />}
      </button>
    );

    const DrillItem = ({ onClick, label }) => (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left px-3 py-2 text-xs transition flex items-center justify-between gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <span className="truncate">{label}</span>
        <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
      </button>
    );

    const SectionLabel = ({ children }) => (
      <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
        {children}
      </div>
    );

    const BackBtn = ({ onClick, children }) => (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-700"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {children}
      </button>
    );

    return (
      <div
        ref={chartFilterRef}
        className="relative flex-shrink-0"
      >
        <button
          type="button"
          onClick={() => (dropdownOpen ? closeDropdown() : openDropdown())}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 transition max-w-[180px]"
        >
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{formatFilterLabel(chartFilter)}</span>
          <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-30 py-1 overflow-hidden max-h-[420px] overflow-y-auto">

            {/* ─── LEVEL 1: ROOT ─────────────────────────── */}
            {dropLevel === "root" && (
              <>
                <SectionLabel>Quick Ranges</SectionLabel>
                {QUICK_FILTERS.map((f) => (
                  <Item
                    key={f.type}
                    active={isActive(f.type)}
                    onClick={() => {
                      setChartFilter({ type: f.type });
                      closeDropdown();
                    }}
                  >
                    {f.label}
                  </Item>
                ))}

                <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                <SectionLabel>Browse by Year</SectionLabel>

                {availableYears.map((y) => (
                  <DrillItem
                    key={y}
                    label={y}
                    onClick={() => {
                      setDropYear(y);
                      setDropLevel("months");
                    }}
                  />
                ))}
              </>
            )}

            {/* ─── LEVEL 2: MONTHS OF A YEAR ─────────────── */}
            {dropLevel === "months" && (
              <>
                <BackBtn
                  onClick={() => {
                    setDropLevel("root");
                    setDropYear(null);
                    setDropMonth(null);
                  }}
                >
                  {dropYear}
                </BackBtn>

                <Item
                  active={isActive("year", { year: dropYear })}
                  onClick={() => {
                    setChartFilter({ type: "year", year: dropYear });
                    closeDropdown();
                  }}
                >
                  Full year of {dropYear}
                </Item>

                <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

                {MONTH_NAMES.map((name, idx) => (
                  <DrillItem
                    key={idx}
                    label={name}
                    onClick={() => {
                      setDropMonth(idx);
                      setDropLevel("weeks");
                    }}
                  />
                ))}
              </>
            )}

            {/* ─── LEVEL 3: WEEKS OF A MONTH ─────────────── */}
            {dropLevel === "weeks" && (
              <>
                <BackBtn
                  onClick={() => {
                    setDropLevel("months");
                    setDropMonth(null);
                  }}
                >
                  {MONTH_NAMES[dropMonth]} {dropYear}
                </BackBtn>

                <Item
                  active={isActive("yearMonth", { year: dropYear, month: dropMonth })}
                  onClick={() => {
                    setChartFilter({ type: "yearMonth", year: dropYear, month: dropMonth });
                    closeDropdown();
                  }}
                >
                  All days of {MONTH_NAMES[dropMonth]}
                </Item>

                <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

                {weeks.map((w) => (
                  <Item
                    key={w.num}
                    active={isActive("yearMonthWeek", { year: dropYear, month: dropMonth, week: w.num })}
                    onClick={() => {
                      setChartFilter({
                        type: "yearMonthWeek",
                        year: dropYear,
                        month: dropMonth,
                        week: w.num,
                      });
                      closeDropdown();
                    }}
                  >
                    Week {w.num} ({w.start}–{w.end})
                  </Item>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Mobile Slim Order Item ───────────────────────────────
  const SlimOrderItem = ({ order }) => {
    const isPaid = order.paid;
    const isPendingPayment = !isPaid && order.status !== "cancelled";
    const orderLabel = `#${order.orderId || order._id.slice(-6)}`;

    return (
      <div
        onClick={() => navigate(`/order/${order._id}`)}
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer transition last:border-b-0"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-gray-900 dark:text-white text-sm truncate" title={orderLabel}>
              {orderLabel}
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${getOrderStatusColor(order.status)}`}>
              {order.status || "pending"}
            </span>
            {isPendingPayment && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 flex-shrink-0">
                Unpaid
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
            <span className="flex-shrink-0">{order.orderType === "fuel" ? "Fuel" : "Gas"}</span>
            <span className="flex-shrink-0">·</span>
            <span className="truncate">₦{order.totalAmount?.toFixed(2) || "0.00"}</span>
            <span className="flex-shrink-0">·</span>
            <span className="flex-shrink-0">{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
      </div>
    );
  };

  // ─── Recent Orders ────────────────────────────────────────
  const RecentOrders = () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">Recent Orders</h2>
        <button onClick={() => navigate("/orders")} className="text-sm text-[#13ec5b] hover:underline flex-shrink-0">
          View all
        </button>
      </div>

      {isLoading ? (
        <>
          <div className="hidden lg:block">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[9%]" />
                <col className="w-[13%]" />
                <col className="w-[15%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[23%]" />
              </colgroup>
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
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <td className="py-2.5 px-3"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                    <td className="py-2.5 px-3"><div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                    <td className="py-2.5 px-3"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                    <td className="py-2.5 px-3"><div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" /></td>
                    <td className="py-2.5 px-3"><div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" /></td>
                    <td className="py-2.5 px-3"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                    <td className="py-2.5 px-3"><div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  </div>
                  <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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
            onClick={() => navigate("/order/fuel")}
            className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
          >
            Place your first order
          </button>
        </div>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[9%]" />
                <col className="w-[13%]" />
                <col className="w-[15%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[23%]" />
              </colgroup>
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
                {recentOrders.map((order) => {
                  const isPaid = order.paid;
                  const isPendingPayment = !isPaid && order.status !== "cancelled";
                  const canConfirm = order.deliveryStatus === "delivered" && order.status !== "completed";
                  const orderLabel = `#${order.orderId || order._id.slice(-6)}`;
                  const amountLabel = `₦${order.totalAmount?.toFixed(2) || "0.00"}`;
                  const dateLabel = new Date(order.createdAt).toLocaleDateString();

                  return (
                    <tr
                      key={order._id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer last:border-b-0"
                      onClick={() => navigate(`/order/${order._id}`)}
                    >
                      <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                        <div className="truncate" title={orderLabel}>{orderLabel}</div>
                      </td>
                      <td className="py-2.5 px-3 capitalize">
                        <div className="truncate" title={order.orderType}>{order.orderType}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="truncate" title={amountLabel}>{amountLabel}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-full ${getOrderStatusColor(order.status)}`}>
                            <span className="truncate">{order.status || "pending"}</span>
                          </span>
                          {isPendingPayment && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 flex-shrink-0">
                              Unpaid
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium max-w-full ${getStatusColor(order.deliveryStatus || "pending")}`}>
                          <span className="truncate">{order.deliveryStatus || "pending"}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">
                        <div className="truncate" title={dateLabel}>{dateLabel}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2 flex-nowrap overflow-hidden">
                          {isPendingPayment && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/order/${order._id}`); }}
                              className="text-xs bg-[#13ec5b] hover:bg-[#10d04e] text-white px-3 py-1 rounded-lg transition flex-shrink-0"
                            >
                              Pay
                            </button>
                          )}
                          {isPaid && order.status === "completed" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/order/${order._id}`); }}
                              className="text-xs text-green-600 dark:text-green-400 hover:underline truncate"
                              title="Completed · Receipt"
                            >
                              Completed · Receipt
                            </button>
                          )}
                          {isPaid && order.status !== "completed" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/order/${order._id}`); }}
                              className="text-xs text-[#0f9c46] dark:text-[#13ec5b] hover:underline flex-shrink-0"
                            >
                              Receipt
                            </button>
                          )}
                          {canConfirm && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/order/${order._id}`); }}
                              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition flex-shrink-0"
                            >
                              Confirm
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {recentOrders.map((order) => (
              <SlimOrderItem key={order._id} order={order} />
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">Flanorx</h1>
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
                    <img src={user.profilePhoto} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-[#13ec5b]" />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <div className="w-full px-1 sm:px-4 lg:px-6 py-4">
          <HeroCard />

          <div className="hidden lg:block">
            <div className="flex items-center gap-3 mb-6 min-w-0">
              <div className="h-12 w-12 rounded-full bg-[#13ec5b]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {userLoading ? (
                  <div className="h-full w-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                ) : user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-[#13ec5b]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {userLoading ? (
                  <>
                    <div className="h-7 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate" title={`Welcome back, ${user?.name || "User"}!`}>
                      Welcome back, {user?.name || "User"}!
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 truncate" title={user?.email}>
                      {user?.email}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                      <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <StatCard icon={Package} label="Total Orders" value={totalOrders} />
                  <StatCard icon={TrendingUp} label="This Month" value={`₦${monthlySpent.toFixed(2)}`} />
                  <StatCard icon={Flame} label="Total Fuel" value={`${totalLiters.toFixed(1)} L`} />
                  <StatCard icon={Package} label="Total Gas" value={`${totalKg.toFixed(1)} kg`} />
                </>
              )}
            </div>
          </div>

          {/* Chart + quick actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm min-w-0">
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                    Spending Overview
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate block">
                    {formatFilterSubtitle(chartFilter)}
                  </span>
                </div>

                {/* Custom drill-down dropdown */}
                <ChartFilterDropdown />
              </div>

              {isLoading ? (
                <div className="h-48 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
              ) : (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#13ec5b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                        tickMargin={5}
                        minTickGap={16}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                        tickFormatter={(v) => `₦${v}`}
                        width={40}
                      />
                      <Tooltip
                        formatter={(value) => [`₦${value}`, "Spent"]}
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
                        fill="url(#spendingGradient)"
                        dot={{ r: 2, fill: "#13ec5b" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 lg:gap-3">
              <button
                onClick={() => navigate("/order/fuel")}
                className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-2.5 lg:p-4 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-xl lg:rounded-2xl transition shadow-sm hover:shadow-md min-w-0"
              >
                <PlusCircle className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
                <span className="text-xs lg:text-sm font-medium truncate">Order Fuel</span>
              </button>
              <button
                onClick={() => navigate("/order/gas")}
                className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-0 px-2.5 py-2.5 lg:p-4 bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 text-[#13ec5b] rounded-xl lg:rounded-2xl transition border border-[#13ec5b]/20 min-w-0"
              >
                <Flame className="h-4 w-4 lg:h-8 lg:w-8 lg:mb-1 flex-shrink-0" />
                <span className="text-xs lg:text-sm font-medium truncate">Order Gas</span>
              </button>
              <button
                onClick={() => navigate("/orders")}
                className="col-span-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl lg:rounded-2xl px-3 py-2.5 lg:p-3 flex items-center justify-center transition"
              >
                <span className="text-xs lg:text-sm font-medium">View All Orders</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-stretch">
            <div className="hidden lg:block lg:col-span-2 h-full min-w-0">
              <LiveTracking />
            </div>
            <div className="hidden lg:block h-full min-w-0">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm h-full flex flex-col">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 truncate">Gas Subscription</h3>
                {isLoading ? (
                  <div className="space-y-3 animate-pulse flex-1">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ) : isActive ? (
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate" title={`Cylinder: ${cylinderSize}`}>
                          Cylinder: {cylinderSize}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                          isExpired ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          : isActive && isNearExpiry ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
                          : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        }`}>
                          {isExpired ? "Expired" : isActive && isNearExpiry ? "Expiring Soon" : "Active"}
                        </span>
                      </div>
                      {dueDate && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
                          {isExpired ? `Expired on ${dueDate.toLocaleDateString()}` : `Renews on ${dueDate.toLocaleDateString()}`}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {isExpired
                          ? "Your cylinder subscription has expired. Please renew."
                          : isNearExpiry
                          ? `Expires in ${daysRemaining} days. Renew soon.`
                          : "Swap your empty cylinder anytime."}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/order/gas")}
                      className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium self-start"
                    >
                      {isExpired ? "Renew Subscription →" : "Order Gas →"}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4 flex-1 flex flex-col justify-center">
                    <Package className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">No gas subscription yet</p>
                    <button
                      onClick={() => navigate("/order/gas")}
                      className="mt-2 text-[#13ec5b] hover:underline text-sm font-medium"
                    >
                      Get your first cylinder
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:hidden space-y-6 mb-6">
            <LiveTracking />
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm min-w-0">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 truncate">Gas Subscription</h3>
              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ) : isActive ? (
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate" title={`Cylinder: ${cylinderSize}`}>
                      Cylinder: {cylinderSize}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                      isExpired ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                      : isActive && isNearExpiry ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
                      : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    }`}>
                      {isExpired ? "Expired" : isActive && isNearExpiry ? "Expiring Soon" : "Active"}
                    </span>
                  </div>
                  {dueDate && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
                      {isExpired ? `Expired on ${dueDate.toLocaleDateString()}` : `Renews on ${dueDate.toLocaleDateString()}`}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {isExpired
                      ? "Your cylinder subscription has expired. Please renew."
                      : isNearExpiry
                      ? `Expires in ${daysRemaining} days. Renew soon.`
                      : "Swap your empty cylinder anytime."}
                  </p>
                  <button
                    onClick={() => navigate("/order/gas")}
                    className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
                  >
                    {isExpired ? "Renew Subscription →" : "Order Gas →"}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Package className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No gas subscription yet</p>
                  <button
                    onClick={() => navigate("/order/gas")}
                    className="mt-2 text-[#13ec5b] hover:underline text-sm font-medium"
                  >
                    Get your first cylinder
                  </button>
                </div>
              )}
            </div>
          </div>

          <RecentOrders />
        </div>
      </div>

      {!isLoading && (
        <div className="lg:hidden fixed bottom-24 right-4 z-40">
          <button onClick={() => setShowSubModal(true)} className="relative group">
            <div
              className={`absolute inset-0 rounded-full animate-ping ${
                subStatus === "active" ? "bg-green-500/40"
                : subStatus === "near" ? "bg-orange-500/40"
                : "bg-red-500/40"
              }`}
              style={{ animationDuration: "1.5s" }}
            />
            <div
              className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-2 transition-all ${
                subStatus === "active" ? "bg-green-500 border-green-400"
                : subStatus === "near" ? "bg-orange-500 border-orange-400"
                : "bg-red-500 border-red-400"
              }`}
            >
              <Package className="h-6 w-6 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-700 dark:text-gray-300">
              {subStatus === "active" ? "✓" : subStatus === "near" ? "!" : "×"}
            </span>
          </button>
        </div>
      )}

      {showSubModal && <SubscriptionModal />}
      <Bottombar />
    </div>
  );
};

export default Dashboard;