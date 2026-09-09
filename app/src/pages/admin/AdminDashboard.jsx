import React, { useMemo, useState } from "react";
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
  Loader2,
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

  const [updateOrderStatus, { isLoading: updateLoading }] = useUpdateOrderStatusMutation();

  // ─── Derived data ──────────────────────────────────────────
  const isLoading = statsLoading || ordersLoading || usersLoading || ridersLoading;
  const error = statsError || ordersError || usersError || ridersError;

  const stats = useMemo(() => {
    if (!statsData) return [];
    return [
      { label: "Total Orders", value: hideStats ? "••••" : statsData.totalOrders, icon: ShoppingBag },
      { label: "Revenue (This Month)", value: hideStats ? "••••" : `₦${(statsData.monthRevenue / 1000000).toFixed(1)}M`, icon: DollarSign },
      { label: "Total Users", value: hideStats ? "••••" : usersData.length, icon: Users },
      { label: "Active Riders", value: hideStats ? "••••" : ridersData.filter(r => r.verificationStatus === 'approved').length, icon: Truck },
      { label: "Pending Orders", value: hideStats ? "••••" : statsData.pendingOrders, icon: Clock },
      { label: "Completed Orders", value: hideStats ? "••••" : statsData.completedOrders, icon: UserCheck },
    ];
  }, [statsData, usersData, ridersData, hideStats]);

  // ─── Chart data from orders ───────────────────────────────
  const chartData = useMemo(() => {
    if (!ordersData || ordersData.length === 0) {
      return [
        { date: "Mon", orders: 0, revenue: 0 },
        { date: "Tue", orders: 0, revenue: 0 },
        { date: "Wed", orders: 0, revenue: 0 },
        { date: "Thu", orders: 0, revenue: 0 },
        { date: "Fri", orders: 0, revenue: 0 },
        { date: "Sat", orders: 0, revenue: 0 },
        { date: "Sun", orders: 0, revenue: 0 },
      ];
    }

    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTotal = ordersData
        .filter((o) => o.createdAt && o.createdAt.startsWith(dateStr))
        .reduce((acc, o) => ({
          orders: acc.orders + 1,
          revenue: acc.revenue + (o.totalAmount || 0),
        }), { orders: 0, revenue: 0 });
      days.push({
        date: d.toLocaleDateString("en-US", { weekday: "short" }),
        orders: dayTotal.orders,
        revenue: dayTotal.revenue,
      });
    }
    return days;
  }, [ordersData]);

  // ─── Recent orders (full objects for modal) ──────────────
  const recentOrders = useMemo(() => {
    if (!ordersData || ordersData.length === 0) return [];
    return ordersData.slice(0, 5);
  }, [ordersData]);

  // ─── Status colors ──────────────────────────────────────
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

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case "pending": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "accepted": return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "picked_up": return "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20";
      case "in_transit": return "text-purple-600 bg-purple-50 dark:bg-purple-900/20";
      case "delivered": return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "confirmed": return "text-green-700 bg-green-100 dark:bg-green-900/30";
      case "cancelled": return "text-red-600 bg-red-50 dark:bg-red-900/20";
      case "failed": return "text-red-700 bg-red-100 dark:bg-red-900/30";
      default: return "text-gray-600 bg-gray-50 dark:bg-gray-800";
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

    const selected = options.find(opt => opt.value === value);
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
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
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

  // ─── Status update handler ──────────────────────────────
  const handleStatusUpdate = async (orderId, newStatus, deliveryStatus) => {
    try {
      await updateOrderStatus({ id: orderId, status: newStatus, deliveryStatus }).unwrap();
      refetchOrders();
      if (selectedOrder && selectedOrder._id === orderId) {
        const updated = ordersData.find(o => o._id === orderId);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      alert(err.data?.message || "Failed to update order status");
    }
  };

  // ─── Detail Modal ────────────────────────────────────────
  const DetailModal = () => {
    if (!selectedOrder) return null;

    const order = selectedOrder;
    const [localOrderStatus, setLocalOrderStatus] = useState(order.status || "pending");
    const [localDeliveryStatus, setLocalDeliveryStatus] = useState(order.deliveryStatus || "pending");

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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Order #{order.orderId || order._id.slice(-6)}
            </h3>
            <button onClick={() => setSelectedOrder(null)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Customer</p>
                <p className="text-gray-900 dark:text-white font-medium">{order.user?.name || "Unknown"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{order.user?.email || ""}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Date</p>
                <p className="text-gray-900 dark:text-white">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Type</p>
                <span className="flex items-center gap-1 capitalize">
                  {order.orderType === "fuel" ? <Flame className="h-4 w-4 text-[#13ec5b]" /> : <Package className="h-4 w-4 text-[#13ec5b]" />}
                  {order.orderType}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Total</p>
                <p className="font-bold text-gray-900 dark:text-white">₦{order.totalAmount?.toFixed(2) || "0.00"}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Order Status</p>
              <CustomDropdown
                value={localOrderStatus}
                options={statusOptions}
                onChange={handleOrderChange}
                placeholder="Select status"
              />
            </div>

            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Delivery Status</p>
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
                <div key={idx} className="flex justify-between text-sm py-1">
                  <span>{item.name || `Item ${idx+1}`}</span>
                  <span>₦{item.price?.toFixed(2) || "0.00"} x {item.quantity || 1}</span>
                </div>
              ))}
              {!order.items?.length && <p className="text-gray-400 dark:text-gray-500 text-xs">No items listed</p>}
            </div>

            <button
              onClick={() => { navigate(`/superuser/orders/${order._id}`); setSelectedOrder(null); }}
              className="w-full py-2.5 bg-[#13ec5b] text-white rounded-lg font-medium hover:bg-[#0fc44e] transition"
            >
              View Full Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Mobile Slim Order Item ──────────────────────────────
  const SlimOrderItem = ({ order }) => (
    <div
      onClick={() => setSelectedOrder(order)}
      className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer transition"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
            #{order.orderId || order._id.slice(-6)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {order.user?.name || "Unknown"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ₦{order.totalAmount?.toFixed(2) || "0.00"}
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getOrderStatusColor(order.status)}`}>
            {order.status || "pending"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getDeliveryStatusColor(order.deliveryStatus || "pending")}`}>
          {order.deliveryStatus || "pending"}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg]" />
      </div>
    </div>
  );

  // ─── Loading state ─────────────────────────────────────────
  if (isLoading) {
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Admin Dashboard
            </h1>
          </header>
          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">Failed to load dashboard data</p>
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
            {hideStats ? "••" : statsData?.totalOrders}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Revenue
          </span>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {hideStats ? "••••" : `₦${(statsData?.monthRevenue / 1000000).toFixed(1)}M`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-5">
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Users</span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {hideStats ? "••" : usersData.length}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Riders</span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {hideStats ? "••" : ridersData.filter(r => r.verificationStatus === 'approved').length}
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
            <AreaChart data={chartData}>
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

  // ─── Recent Orders (Desktop & Mobile) ────────────────────
  const RecentOrders = () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Orders</h3>
        <button
          onClick={() => navigate("/superuser/orders")}
          className="text-sm text-[#13ec5b] hover:underline"
        >
          View all
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
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
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-500 dark:text-gray-400">
                  No orders found
                </td>
              </tr>
            ) : (
              recentOrders.map((order) => (
                <tr
                  key={order._id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <td className="py-2 px-3 text-gray-900 dark:text-white font-medium">#{order.orderId || order._id.slice(-6)}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{order.user?.name || "Unknown"}</td>
                  <td className="py-2 px-3 text-gray-900 dark:text-white">₦{order.totalAmount?.toLocaleString() || "0.00"}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        order.deliveryStatus || order.status || "pending"
                      )}`}
                    >
                      {order.deliveryStatus || order.status || "pending"}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-500 dark:text-gray-400">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Slim List – full width, no padding, no rounded corners */}
      <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
        {recentOrders.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">No orders found</div>
        ) : (
          recentOrders.map((order) => <SlimOrderItem key={order._id} order={order} />)
        )}
      </div>
    </div>
  );

  // ─── Main render ──────────────────────────────────────────
  const isModalOpen = !!selectedOrder;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
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