import React, { useMemo } from "react";
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

// ─── Mock data ──────────────────────────────────────────────
// In a real app, fetch this from your API
const mockStats = {
  totalOrders: 1284,
  revenue: 4200000,
  totalUsers: 3456,
  activeRiders: 87,
  pendingOrders: 23,
  completedOrders: 1261,
};

const mockChartData = [
  { date: "Mon", orders: 45, revenue: 180000 },
  { date: "Tue", orders: 52, revenue: 210000 },
  { date: "Wed", orders: 38, revenue: 150000 },
  { date: "Thu", orders: 61, revenue: 240000 },
  { date: "Fri", orders: 73, revenue: 290000 },
  { date: "Sat", orders: 42, revenue: 170000 },
  { date: "Sun", orders: 30, revenue: 120000 },
];

const mockRecentOrders = [
  { id: "ORD-001", customer: "John Doe", amount: 8500, status: "delivered", date: "2026-09-09" },
  { id: "ORD-002", customer: "Jane Smith", amount: 12000, status: "processing", date: "2026-09-08" },
  { id: "ORD-003", customer: "Bob Johnson", amount: 6200, status: "pending", date: "2026-09-08" },
  { id: "ORD-004", customer: "Alice Brown", amount: 15000, status: "delivered", date: "2026-09-07" },
  { id: "ORD-005", customer: "Charlie Wilson", amount: 9200, status: "processing", date: "2026-09-07" },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const [hideStats, setHideStats] = React.useState(false);

  const stats = [
    { label: "Total Orders", value: hideStats ? "••••" : mockStats.totalOrders, icon: ShoppingBag },
    { label: "Revenue", value: hideStats ? "••••" : `₦${(mockStats.revenue / 1000000).toFixed(1)}M`, icon: DollarSign },
    { label: "Total Users", value: hideStats ? "••••" : mockStats.totalUsers, icon: Users },
    { label: "Active Riders", value: hideStats ? "••••" : mockStats.activeRiders, icon: Truck },
    { label: "Pending Orders", value: hideStats ? "••••" : mockStats.pendingOrders, icon: Clock },
    { label: "Completed", value: hideStats ? "••••" : mockStats.completedOrders, icon: UserCheck },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "processing":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  // ─── Mobile Hero Card ──────────────────────────────────────
  const HeroCard = () => (
    <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Admin Dashboard
          </span>
          <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white">
            {userInfo?.name ? `Welcome, ${userInfo.name.split(" ")[0]}` : "Admin"}!
          </h1>
        </div>
        <button
          onClick={() => setHideStats((v) => !v)}
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex-shrink-0"
        >
          {hideStats ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total Orders
          </span>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {hideStats ? "••" : mockStats.totalOrders}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Revenue
          </span>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {hideStats ? "••••" : `₦${(mockStats.revenue / 1000000).toFixed(1)}M`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-5">
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Users</span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {hideStats ? "••" : mockStats.totalUsers}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Riders</span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {hideStats ? "••" : mockStats.activeRiders}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/superuser/orders")}
          className="flex items-center gap-1 text-xs font-medium text-white bg-[#13ec5b] hover:bg-[#10d04e] px-3 py-1.5 rounded-lg border border-[#13ec5b] transition shadow-sm"
        >
          Orders
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  // ─── Desktop Stats Grid ──────────────────────────────────
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
            <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b]">
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
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Weekly Orders & Revenue
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Last 7 days
          </span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockChartData}>
              <defs>
                <linearGradient id="adminChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#13ec5b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" tickMargin={5} />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(v) => `${v}`}
                width={40}
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
                dataKey="orders"
                stroke="#13ec5b"
                strokeWidth={2}
                fill="url(#adminChartGradient)"
                dot={{ r: 2, fill: "#13ec5b" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/superuser/orders")}
          className="bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-2xl p-4 flex flex-col items-center justify-center transition shadow-sm hover:shadow-md"
        >
          <Package className="h-8 w-8 mb-1" />
          <span className="text-sm font-medium">Orders</span>
        </button>
        <button
          onClick={() => navigate("/superuser/users")}
          className="bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 text-[#13ec5b] rounded-2xl p-4 flex flex-col items-center justify-center transition border border-[#13ec5b]/20"
        >
          <Users className="h-8 w-8 mb-1" />
          <span className="text-sm font-medium">Users</span>
        </button>
        <button
          onClick={() => navigate("/superuser/riders")}
          className="bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 text-[#13ec5b] rounded-2xl p-4 flex flex-col items-center justify-center transition border border-[#13ec5b]/20"
        >
          <Truck className="h-8 w-8 mb-1" />
          <span className="text-sm font-medium">Riders</span>
        </button>
        <button
          onClick={() => navigate("/superuser/analytics")}
          className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center transition"
        >
          <TrendingUp className="h-8 w-8 mb-1" />
          <span className="text-sm font-medium">Analytics</span>
        </button>
      </div>
    </div>
  );

  // ─── Recent Orders ────────────────────────────────────────
  const RecentOrders = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Orders</h3>
        <button
          onClick={() => navigate("/superuser/orders")}
          className="text-sm text-[#13ec5b] hover:underline"
        >
          View all
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Order ID</th>
              <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Customer</th>
              <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Amount</th>
              <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
              <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {mockRecentOrders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                onClick={() => navigate(`/superuser/orders/${order.id}`)}
              >
                <td className="py-2 px-3 text-gray-900 dark:text-white font-medium">#{order.id}</td>
                <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{order.customer}</td>
                <td className="py-2 px-3 text-gray-900 dark:text-white">₦{order.amount.toLocaleString()}</td>
                <td className="py-2 px-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{order.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
              {userInfo?.name || "Admin"}
            </span>
          </div>
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          {/* Mobile Hero Card */}
          <HeroCard />

          {/* Desktop Stats Grid */}
          <StatsGrid />

          {/* Chart + Quick Actions */}
          <ChartAndActions />

          {/* Recent Orders */}
          <RecentOrders />
        </div>
      </div>

      <AdminBottombar />
    </div>
  );
};

export default AdminDashboard;