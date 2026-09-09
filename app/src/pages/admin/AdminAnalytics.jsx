import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Truck,
  Clock,
  Filter,
  X,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useSelector } from "react-redux";
import {
  useGetDashboardStatsQuery,
  useGetAllOrdersQuery,
  useGetAllUsersQuery,
  useGetAllRidersQuery,
} from "../../features/adminApiSlice";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminBottombar from "../../components/admin/Bottombar";

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  // ─── Filters state ─────────────────────────────────────────
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [filters, setFilters] = useState({
    month: currentMonth,
    year: currentYear,
  });
  const [showFilterSheet, setShowFilterSheet] = useState(false);

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
  } = useGetAllOrdersQuery({
    month: filters.month,
    year: filters.year,
  });

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

  // ─── Loading & Error states ──────────────────────────────
  const isLoading = statsLoading || ordersLoading || usersLoading || ridersLoading;
  const error = statsError || ordersError || usersError || ridersError;

  // ─── Month/Year options ──────────────────────────────────
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = [];
  for (let y = currentYear; y >= currentYear - 4; y--) years.push(y);

  // ─── Chart data ──────────────────────────────────────────
  // Revenue by day for the selected month
  const revenueChartData = useMemo(() => {
    if (!ordersData || ordersData.length === 0) {
      // Fallback: generate last 30 days with zero data
      const data = [];
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        data.push({
          date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          revenue: 0,
          orders: 0,
        });
      }
      return data;
    }

    // Group orders by day
    const dayMap = {};
    ordersData.forEach((order) => {
      if (!order.createdAt) return;
      const date = new Date(order.createdAt);
      const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!dayMap[key]) {
        dayMap[key] = { date: key, revenue: 0, orders: 0 };
      }
      dayMap[key].revenue += order.totalAmount || 0;
      dayMap[key].orders += 1;
    });

    // Sort by date (convert to Date for comparison)
    const sorted = Object.values(dayMap).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });

    return sorted;
  }, [ordersData]);

  // Order status distribution
  const statusDistribution = useMemo(() => {
    const statusCounts = {};
    ordersData.forEach((order) => {
      const status = order.status || "pending";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [ordersData]);

  const COLORS = ["#13ec5b", "#facc15", "#3b82f6", "#ef4444", "#8b5cf6"];

  // ─── Stats cards ──────────────────────────────────────────
  const stats = useMemo(() => {
    if (!statsData) return [];
    return [
      { label: "Total Orders", value: statsData.totalOrders, icon: ShoppingBag, color: "text-[#13ec5b]" },
      { label: "Revenue (Month)", value: `₦${(statsData.monthRevenue / 1000000).toFixed(1)}M`, icon: DollarSign, color: "text-blue-600" },
      { label: "Total Users", value: usersData.length, icon: Users, color: "text-purple-600" },
      { label: "Active Riders", value: ridersData.filter(r => r.verificationStatus === 'approved').length, icon: Truck, color: "text-orange-600" },
      { label: "Pending Orders", value: statsData.pendingOrders, icon: Clock, color: "text-yellow-600" },
      { label: "Completed", value: statsData.completedOrders, icon: TrendingUp, color: "text-green-600" },
    ];
  }, [statsData, usersData, ridersData]);

  // ─── Filter handlers ──────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      month: currentMonth,
      year: currentYear,
    });
  };

  // ─── Custom Dropdown ─────────────────────────────────────
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

    const selected = options.find((opt) => opt.value === value);
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
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
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

  // ─── Desktop FilterDropdown ──────────────────────────────
  const FilterDropdown = ({ label, value, options, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = React.useRef(null);

    React.useEffect(() => {
      const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selected = options.find((opt) => opt.value === value);
    const display = selected ? selected.label : label;

    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition min-w-[140px] justify-between"
        >
          <span>{display}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-60 overflow-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onSelect(opt.value);
                  setIsOpen(false);
                }}
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

  // ─── Filter Sheet (mobile) ──────────────────────────────
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
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filter Analytics</h3>
          <button
            onClick={() => setShowFilterSheet(false)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
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
              Reset to Current
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

  // ─── Mobile Hero Card ──────────────────────────────────────
  const HeroCard = () => (
    <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Analytics Overview
          </span>
          <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white">
            {userInfo?.name ? `Welcome, ${userInfo.name.split(" ")[0]}` : "Admin"}!
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {months[filters.month - 1]} {filters.year}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Revenue</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ₦{(statsData?.monthRevenue / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Orders</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {statsData?.totalOrders || 0}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Users</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {usersData.length}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Riders</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {ridersData.filter(r => r.verificationStatus === 'approved').length}
          </p>
        </div>
      </div>
    </div>
  );

  // ─── Stats Grid (Desktop) ──────────────────────────────────
  const StatsGrid = () => (
    <div className="hidden lg:grid grid-cols-6 gap-4 mb-6">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stat.value}
              </p>
            </div>
            <div className={`p-2 rounded-lg bg-[#13ec5b]/10 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Charts ──────────────────────────────────────────────────
  const Charts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Revenue/Orders Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm lg:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Daily Revenue & Orders
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {months[filters.month - 1]} {filters.year}
          </span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#13ec5b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" tickMargin={5} />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(v) => `₦${v}`}
                width={50}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "revenue") return [`₦${value.toLocaleString()}`, "Revenue"];
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
                dataKey="revenue"
                stroke="#13ec5b"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={{ r: 2, fill: "#13ec5b" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Order Status Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm lg:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Order Status Distribution
          </h3>
        </div>
        <div className="h-64 w-full flex items-center justify-center">
          {statusDistribution.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm">No orders data</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.9)",
                    border: "none",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Main render ──────────────────────────────────────────
  const isModalOpen = showFilterSheet;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Analytics</h1>
          </header>
          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#13ec5b]" />
            </div>
          </div>
        </div>
        <AdminBottombar />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Analytics</h1>
          </header>
          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">Failed to load analytics data</p>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
            Analytics
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetchOrders()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setShowFilterSheet(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
        </header>

        <div className="w-full px-0 sm:px-4 lg:px-6 py-4">
          {/* Desktop filters */}
          <div className="hidden lg:flex flex-wrap items-center gap-3 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <FilterDropdown
              label="Month"
              value={filters.month}
              options={months.map((m, idx) => ({ value: idx + 1, label: m }))}
              onSelect={(v) => handleFilterChange("month", v)}
            />
            <FilterDropdown
              label="Year"
              value={filters.year}
              options={years.map((y) => ({ value: y, label: y }))}
              onSelect={(v) => handleFilterChange("year", v)}
            />
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
            >
              Reset to Current
            </button>
          </div>

          <HeroCard />
          <StatsGrid />
          <Charts />
        </div>
      </div>

      {/* Bottom bar - hidden when filter sheet open */}
      {!isModalOpen && <AdminBottombar />}

      {showFilterSheet && <FilterSheet />}
    </div>
  );
};

export default AdminAnalytics;