// Dashboard.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  User,
  Package,
  TrendingUp,
  Flame,
  Clock,
  AlertCircle,
  PlusCircle,
  ChevronRight,
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [hideStats, setHideStats] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  // ─── Queries ───────────────────────────────────────────────
  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useGetProfileQuery();

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Get ALL orders (including pending/unpaid) for recent list and total count
  const {
    data: orders = [],
    isLoading: ordersLoading,
  } = useGetMyOrdersQuery({
    month: currentMonth,
    year: currentYear,
    // no paid filter – get all orders
  });

  // Separate query for paid totals (spending)
  const {
    data: totalSpentData,
    isLoading: spentLoading,
  } = useGetMyTotalSpentQuery({
    month: currentMonth,
    year: currentYear,
    paid: true,
  });

  const {
    data: activeOrder,
    isLoading: activeLoading,
  } = useGetMyActiveOrderQuery();

  // ─── Quick Tracking ────────────────────────────────────────
  const {
    data: trackingData,
    isLoading: trackingLoading,
  } = useGetTrackingQuery(
    activeOrder?._id,
    { skip: !activeOrder }
  );

  // ─── Derived data ──────────────────────────────────────────
  const totalOrders = orders.length;
  const monthlySpent = totalSpentData?.totalSpent || 0;
  const totalLiters = totalSpentData?.totalLiters || 0;
  const totalKg = totalSpentData?.totalKg || 0;

  // ─── Subscription status ──────────────────────────────────
  const hasGasSubscription = orders.some(
    (o) => o.orderType === "gas" && o.gasDetails?.isFirstTime
  );
  const latestGasOrder = orders
    .filter((o) => o.orderType === "gas")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const subscriptionStatus = latestGasOrder?.subscriptionStatus || "inactive";
  const dueDate = latestGasOrder?.subscriptionDueDate
    ? new Date(latestGasOrder.subscriptionDueDate)
    : null;
  const isExpired = dueDate && new Date() > dueDate;
  const isNearExpiry =
    dueDate && !isExpired && (dueDate - new Date()) / (1000 * 60 * 60 * 24) <= 7;

  let subStatus = "none";
  if (hasGasSubscription && !isExpired && !isNearExpiry) subStatus = "active";
  else if (hasGasSubscription && isNearExpiry) subStatus = "near";
  else if (hasGasSubscription && isExpired) subStatus = "expired";
  else subStatus = "none";

  // ─── Chart data (only paid orders contribute to spending) ──
  const chartData = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTotal = orders
        .filter((o) => o.createdAt && o.createdAt.startsWith(dateStr) && o.paid)
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      days.push({
        date: d.toLocaleDateString("en-US", { weekday: "short" }),
        amount: Math.round(dayTotal * 100) / 100,
      });
    }
    return days;
  }, [orders]);

  // ─── Loading & errors ──────────────────────────────────────
  const isLoading = userLoading || ordersLoading || spentLoading || activeLoading;

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

  // ─── Helper: status color ──────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "accepted":
      case "picked_up":
      case "in_transit":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "delivered":
        return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "confirmed":
        return "text-green-700 bg-green-100 dark:bg-green-900/30";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-800";
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
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Gas Subscription
          </h3>
          <button
            onClick={() => setShowSubModal(false)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {!hasGasSubscription ? (
          <div className="text-center py-6">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300">
              You don't have an active gas subscription.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Get your first cylinder to enjoy hassle‑free gas swaps.
            </p>
            <button
              onClick={() => {
                setShowSubModal(false);
                navigate("/order/gas");
              }}
              className="mt-4 px-6 py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition font-medium"
            >
              Order Gas
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Cylinder</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {latestGasOrder?.gasDetails?.cylinderSize}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isExpired || subscriptionStatus === "expired"
                    ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                    : subscriptionStatus === "active"
                    ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
                }`}
              >
                {isExpired || subscriptionStatus === "expired"
                  ? "Expired"
                  : subscriptionStatus === "active"
                  ? "Active"
                  : "Inactive"}
              </span>
            </div>
            {dueDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Renewal Date</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {dueDate.toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              {isExpired ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Your subscription has expired. Please renew.
                </p>
              ) : isNearExpiry ? (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Expires in {Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))} days.
                </p>
              ) : (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Active – swap your empty cylinder anytime.
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setShowSubModal(false);
                navigate("/order/gas");
              }}
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
  const HeroCard = () => (
    <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Welcome back
          </span>
          <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white">
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

      <div className="flex items-end justify-between mb-3">
        <div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total Orders
          </span>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {hideStats ? "••" : totalOrders}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            This Month
          </span>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {hideStats ? "••••" : `₦${monthlySpent.toFixed(0)}`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-5">
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Fuel</span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {hideStats ? "••" : `${totalLiters.toFixed(1)}L`}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Gas</span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {hideStats ? "••" : `${totalKg.toFixed(1)}kg`}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/orders")}
          className="flex items-center gap-1 text-xs font-medium text-white bg-[#13ec5b] hover:bg-[#10d04e] px-3 py-1.5 rounded-lg border border-[#13ec5b] transition shadow-sm"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  // ─── Live Tracking Card ──────────────────────────────────
  const LiveTracking = () => {
    const hasActiveOrder = !!activeOrder;
    const hasTracking = !!trackingData && trackingData.status === "active";
    const isLoadingState = trackingLoading;

    const defaultCenter = [6.5244, 3.3792];
    const mapCenter = trackingData?.riderLocation
      ? [trackingData.riderLocation.lat, trackingData.riderLocation.lng]
      : trackingData?.userLocation
      ? [trackingData.userLocation.lat, trackingData.userLocation.lng]
      : defaultCenter;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#13ec5b]" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Live Tracking
            </h3>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              hasTracking
                ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                : hasActiveOrder
                ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
                : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block bg-current" />
            {hasTracking ? "Live" : hasActiveOrder ? "Waiting" : "Inactive"}
          </span>
        </div>

        {/* Map */}
        <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-700 flex-shrink-0">
          {hasActiveOrder ? (
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
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
                  color="#13ec5b"
                  weight={3}
                  opacity={0.8}
                />
              )}
            </MapContainer>
          ) : (
            <div className="relative h-full w-full bg-gray-300 dark:bg-gray-600">
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-6 text-center max-w-xs mx-4 shadow-xl">
                  <Navigation className="h-10 w-10 text-[#13ec5b] mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    No active delivery
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Place an order to start tracking
                  </p>
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

        {/* Tracking info */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex-1 flex flex-col justify-between">
          {isLoadingState ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ) : hasActiveOrder ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Order #{activeOrder.orderId}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      hasTracking
                        ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
                    }`}
                  >
                    {hasTracking ? "Active" : "Processing"}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {activeOrder.orderType === "fuel"
                    ? `${activeOrder.quantity} L of ${activeOrder.fuelType}`
                    : `${activeOrder.gasDetails?.quantityKg} kg gas (${activeOrder.gasDetails?.cylinderSize})`}
                </p>
                {hasTracking && trackingData?.rider && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Rider: {trackingData.rider.name}
                  </p>
                )}
                {hasTracking && trackingData?.route?.distanceText && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Distance: {trackingData.route.distanceText} · ETA: {trackingData.route.durationText}
                  </p>
                )}
                {!hasTracking && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
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
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No orders to track
              </p>
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

  // ─── Recent Order Item ─────────────────────────────────────
  const RecentOrderItem = ({ order }) => (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-0 transition"
      onClick={() => navigate(`/order/${order._id}`)}
    >
      <div className="w-9 h-9 rounded-xl bg-[#13ec5b]/10 flex items-center justify-center flex-shrink-0">
        {order.orderType === "fuel" ? (
          <Flame className="h-4 w-4 text-[#13ec5b]" />
        ) : (
          <Package className="h-4 w-4 text-[#13ec5b]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            #{order.orderId}
          </p>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              order.deliveryStatus || order.status
            )}`}
          >
            {order.deliveryStatus || order.status || "pending"}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{order.orderType === "fuel" ? "Fuel" : "Gas"}</span>
          <span>·</span>
          <span>₦{order.totalAmount.toFixed(2)}</span>
          <span>·</span>
          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
          {!order.paid && (
            <span className="text-orange-500 bg-orange-100 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
              Unpaid
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
            Dashboard
          </h1>
          <div className="flex items-center gap-3">
            {!isLoading && user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                  {user.name?.split(" ")[0]}
                </span>
                <div className="h-8 w-8 rounded-full bg-[#13ec5b]/10 flex items-center justify-center overflow-hidden">
                  {user.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-[#13ec5b]" />
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ─── MAIN CONTAINER – minimal padding on mobile ── */}
        <div className="w-full px-1 sm:px-4 lg:px-6 py-4">
          <HeroCard />

          {/* Desktop stats */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-full bg-[#13ec5b]/10 flex items-center justify-center overflow-hidden">
                {!isLoading && user?.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-[#13ec5b]" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Welcome back, {isLoading ? "..." : user?.name || "User"}!
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {isLoading ? "Loading..." : user?.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 animate-pulse h-24"
                  />
                ))
              ) : (
                <>
                  <StatCard icon={Package} label="Total Orders" value={totalOrders} />
                  <StatCard
                    icon={TrendingUp}
                    label="This Month"
                    value={`₦${monthlySpent.toFixed(2)}`}
                  />
                  <StatCard
                    icon={Flame}
                    label="Total Fuel"
                    value={`${totalLiters.toFixed(1)} L`}
                  />
                  <StatCard
                    icon={Package}
                    label="Total Gas"
                    value={`${totalKg.toFixed(1)} kg`}
                  />
                </>
              )}
            </div>
          </div>

          {/* Chart + quick actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Weekly Spending
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
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
                        <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
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

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/order/fuel")}
                className="bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-2xl p-4 flex flex-col items-center justify-center transition shadow-sm hover:shadow-md"
              >
                <PlusCircle className="h-8 w-8 mb-1" />
                <span className="text-sm font-medium">Order Fuel</span>
              </button>
              <button
                onClick={() => navigate("/order/gas")}
                className="bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 text-[#13ec5b] rounded-2xl p-4 flex flex-col items-center justify-center transition border border-[#13ec5b]/20"
              >
                <Flame className="h-8 w-8 mb-1" />
                <span className="text-sm font-medium">Order Gas</span>
              </button>
              <button
                onClick={() => navigate("/orders")}
                className="col-span-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-2xl p-3 flex items-center justify-center transition"
              >
                <span className="text-sm font-medium">View All Orders</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>

          {/* 2‑column layout: Live Tracking + Gas Subscription (desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-stretch">
            <div className="hidden lg:block lg:col-span-2 h-full">
              <LiveTracking />
            </div>
            <div className="hidden lg:block h-full">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm h-full flex flex-col">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Gas Subscription
                </h3>
                {isLoading ? (
                  <div className="space-y-3 animate-pulse flex-1">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ) : hasGasSubscription ? (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Cylinder: {latestGasOrder?.gasDetails?.cylinderSize}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isExpired || subscriptionStatus === "expired"
                              ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                              : subscriptionStatus === "active"
                              ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
                          }`}
                        >
                          {isExpired || subscriptionStatus === "expired"
                            ? "Expired"
                            : subscriptionStatus === "active"
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>
                      {dueDate && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {isExpired
                            ? `Expired on ${dueDate.toLocaleDateString()}`
                            : `Renews on ${dueDate.toLocaleDateString()}`}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {isExpired
                          ? "Your cylinder subscription has expired. Please renew."
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
                    <p className="text-gray-500 dark:text-gray-400">
                      No gas subscription yet
                    </p>
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

          {/* Mobile: Live Tracking + Gas Subscription (stacked) */}
          <div className="lg:hidden space-y-6 mb-6">
            <LiveTracking />
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Gas Subscription
              </h3>
              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ) : hasGasSubscription ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Cylinder: {latestGasOrder?.gasDetails?.cylinderSize}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isExpired || subscriptionStatus === "expired"
                          ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          : subscriptionStatus === "active"
                          ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
                      }`}
                    >
                      {isExpired || subscriptionStatus === "expired"
                        ? "Expired"
                        : subscriptionStatus === "active"
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>
                  {dueDate && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {isExpired
                        ? `Expired on ${dueDate.toLocaleDateString()}`
                        : `Renews on ${dueDate.toLocaleDateString()}`}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {isExpired
                      ? "Your cylinder subscription has expired. Please renew."
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
                  <p className="text-gray-500 dark:text-gray-400">
                    No gas subscription yet
                  </p>
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

          {/* Recent Orders – full width, matches admin style */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Recent Orders
              </h3>
              <button
                onClick={() => navigate("/orders")}
                className="text-sm text-[#13ec5b] hover:underline"
              >
                View all
              </button>
            </div>
            <div>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 animate-pulse"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                    </div>
                  </div>
                ))
              ) : orders.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-6">
                  No orders yet
                </p>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <RecentOrderItem key={order._id} order={order} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Subscription Button (mobile only) */}
      <div className="lg:hidden fixed bottom-24 right-4 z-40">
        <button onClick={() => setShowSubModal(true)} className="relative group">
          <div
            className={`absolute inset-0 rounded-full animate-ping ${
              subStatus === "active"
                ? "bg-green-500/40"
                : subStatus === "near"
                ? "bg-orange-500/40"
                : "bg-red-500/40"
            }`}
            style={{ animationDuration: "1.5s" }}
          />
          <div
            className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-2 transition-all ${
              subStatus === "active"
                ? "bg-green-500 border-green-400"
                : subStatus === "near"
                ? "bg-orange-500 border-orange-400"
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

      {showSubModal && <SubscriptionModal />}

      <Bottombar />
    </div>
  );
};

export default Dashboard;