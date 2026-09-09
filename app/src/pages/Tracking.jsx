// pages/Tracking.jsx
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  MapPin,
  Navigation,
  User,
  Package,
  Flame,
  Truck,
  Clock,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Maximize,
  Minimize,
  Minus,
  Plus,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGetTrackingQuery } from "../features/trackingApiSlice";
import { useGetOrderByIdQuery } from "../features/orderApiSlice";
import { useGetMyActiveOrderQuery } from "../features/orderApiSlice";
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

const blueIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const Tracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapHeight, setMapHeight] = useState(500);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef(null);

  // ─── If no orderId in URL, try to get the user's active order ──
  const {
    data: activeOrder,
    isLoading: activeLoading,
    error: activeError,
  } = useGetMyActiveOrderQuery(undefined, { skip: !!orderId });

  React.useEffect(() => {
    if (!orderId && activeOrder && !activeLoading) {
      navigate(`/tracking/${activeOrder._id}`, { replace: true });
    }
  }, [orderId, activeOrder, activeLoading, navigate]);

  // ─── Queries (skip if no orderId) ──────────────────────────
  const {
    data: trackingData,
    isLoading: trackingLoading,
    error: trackingError,
    refetch: refetchTracking,
  } = useGetTrackingQuery(orderId, {
    skip: !orderId,
    pollingInterval: autoRefresh && orderId ? 10000 : 0,
  });

  const {
    data: orderData,
    isLoading: orderLoading,
    error: orderError,
  } = useGetOrderByIdQuery(orderId, { skip: !orderId });

  const isLoading = trackingLoading || orderLoading || activeLoading;
  const error = trackingError || orderError || activeError;

  // ─── Fullscreen toggle ──────────────────────────────────────
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (mapContainerRef.current) {
        if (mapContainerRef.current.requestFullscreen) {
          mapContainerRef.current.requestFullscreen();
        } else if (mapContainerRef.current.webkitRequestFullscreen) {
          mapContainerRef.current.webkitRequestFullscreen();
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const increaseHeight = () => setMapHeight((prev) => Math.min(prev + 50, 800));
  const decreaseHeight = () => setMapHeight((prev) => Math.max(prev - 50, 250));

  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => !prev);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200";
      case "accepted":
      case "picked_up":
      case "in_transit":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200";
      case "delivered":
        return "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200";
      case "confirmed":
        return "text-green-700 bg-green-100 dark:bg-green-900/30 border-green-300";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-800 border-gray-200";
    }
  };

  // ─── Empty state (no active order) ──────────────────────────
  const EmptyTracking = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
            Live Tracking
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAutoRefresh}
              disabled
              className="text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed"
            >
              Auto-refresh OFF
            </button>
            <button
              disabled
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            >
              <RefreshCw className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </button>
          </div>
        </header>

        <div className="w-full px-0 sm:px-4 lg:px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="relative w-full" style={{ height: `${mapHeight}px` }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
                  <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-6 text-center max-w-xs mx-4 shadow-xl">
                    <MapPin className="h-10 w-10 text-[#13ec5b] mx-auto mb-3 opacity-50" />
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
                      <PlusCircle className="h-4 w-4 inline mr-1" />
                      Place an order now
                    </button>
                  </div>
                </div>
                <MapContainer
                  center={[6.5244, 3.3792]}
                  zoom={14}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={true}
                  attributionControl={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                </MapContainer>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                    Rider
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                    You
                  </span>
                </div>
                <span>Inactive</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Order Details
                  </h3>
                </div>
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No order to display
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Truck className="h-4 w-4 text-[#13ec5b]" />
                    Rider
                  </h3>
                </div>
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No rider assigned
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-[#13ec5b]" />
                    Trip Info
                  </h3>
                </div>
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No trip in progress
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Bottombar />
    </div>
  );

  // ─── If no orderId and no active order, show empty state ──
  if (!orderId && !activeLoading && !activeOrder) {
    return <EmptyTracking />;
  }

  // ─── Still loading ──────────────────────────────────────────
  if (isLoading && !trackingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#13ec5b] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm">Loading tracking...</p>
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────
  if (error && orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">
            {error?.data?.message || "Failed to load tracking"}
          </p>
          <button
            onClick={() => refetchTracking()}
            className="mt-4 text-[#13ec5b] hover:underline flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-2 block text-[#13ec5b] hover:underline"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── No tracking data found (but order exists) ────────────
  if (orderId && !trackingData && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">
            Tracking not started for this order yet.
          </p>
          <button
            onClick={() => navigate(`/order/${orderId}`)}
            className="mt-4 text-[#13ec5b] hover:underline"
          >
            View Order Details
          </button>
        </div>
      </div>
    );
  }

  // ─── Actual tracking data ──────────────────────────────────
  const isActive = trackingData?.status === "active";
  const hasRider = !!trackingData?.rider;
  const hasUser = !!trackingData?.user;
  const hasRoute = !!trackingData?.route?.polyline;

  let routePositions = [];
  if (hasRoute) {
    try {
      routePositions = L.Polyline.fromEncoded(trackingData.route.polyline).getLatLngs();
    } catch (e) {
      console.error("Failed to decode polyline", e);
    }
  }

  const defaultCenter = [6.5244, 3.3792];
  const mapCenter = trackingData?.riderLocation
    ? [trackingData.riderLocation.lat, trackingData.riderLocation.lng]
    : trackingData?.userLocation
    ? [trackingData.userLocation.lat, trackingData.userLocation.lng]
    : defaultCenter;

  const getDeliveryAddress = () => {
    if (orderData?.deliveryAddress) return orderData.deliveryAddress;
    if (trackingData?.order?.deliveryAddress) return trackingData.order.deliveryAddress;
    return "Address not available";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
            Live Tracking
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAutoRefresh}
              className={`text-sm font-medium transition ${
                autoRefresh
                  ? "text-[#13ec5b] hover:underline"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </button>
            <button
              onClick={() => refetchTracking()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <RefreshCw className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </header>

        <div className="w-full px-0 sm:px-4 lg:px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* ─── Map ───────────────────────────────────────────── */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <div
                ref={mapContainerRef}
                className="relative w-full transition-all duration-300"
                style={{ height: `${mapHeight}px` }}
              >
                <MapContainer
                  center={mapCenter}
                  zoom={14}
                  style={{ height: "100%", width: "100%", zIndex: 0 }}
                  zoomControl={true}
                  attributionControl={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  {trackingData?.riderLocation && (
                    <Marker
                      position={[trackingData.riderLocation.lat, trackingData.riderLocation.lng]}
                      icon={greenIcon}
                    >
                      <Popup>
                        <div className="text-sm font-medium">Rider</div>
                        {trackingData.rider?.name && (
                          <div className="text-xs text-gray-600">{trackingData.rider.name}</div>
                        )}
                      </Popup>
                    </Marker>
                  )}
                  {trackingData?.userLocation && (
                    <Marker
                      position={[trackingData.userLocation.lat, trackingData.userLocation.lng]}
                      icon={blueIcon}
                    >
                      <Popup>
                        <div className="text-sm font-medium">You</div>
                        {trackingData.user?.name && (
                          <div className="text-xs text-gray-600">{trackingData.user.name}</div>
                        )}
                      </Popup>
                    </Marker>
                  )}
                  {hasRoute && routePositions.length > 0 && (
                    <Polyline
                      positions={routePositions}
                      color="#13ec5b"
                      weight={4}
                      opacity={0.8}
                    />
                  )}
                </MapContainer>

                {/* ─── Map controls ───────────────────────────────── */}
                <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-2">
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    title="Toggle fullscreen"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    ) : (
                      <Maximize className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    )}
                  </button>
                  <button
                    onClick={increaseHeight}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    title="Increase map height"
                  >
                    <Plus className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={decreaseHeight}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    title="Decrease map height"
                  >
                    <Minus className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  </button>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                    Rider
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                    You
                  </span>
                  {hasRoute && (
                    <span className="flex items-center gap-1">
                      <span className="w-6 h-1 bg-[#13ec5b] inline-block" />
                      Route
                    </span>
                  )}
                </div>
                <span className={isActive ? "text-green-600 dark:text-green-400" : "text-gray-400"}>
                  {isActive ? "Live" : "Stopped"}
                </span>
              </div>
            </div>

            {/* ─── Order info ───────────────────────────────────── */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Order Details
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Order ID</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      #{orderData?.orderId || trackingData?.order?.orderId || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Type</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {orderData?.orderType === "fuel" ? (
                        <span className="flex items-center gap-1">
                          <Flame className="h-4 w-4 text-[#13ec5b]" />
                          Fuel
                        </span>
                      ) : orderData?.orderType === "gas" ? (
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-[#13ec5b]" />
                          Gas
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        trackingData?.deliveryStatus || orderData?.deliveryStatus || "pending"
                      )}`}
                    >
                      {trackingData?.deliveryStatus || orderData?.deliveryStatus || "pending"}
                    </span>
                  </div>
                  {trackingData?.estimatedDeliveryMinutes && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">ETA</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {trackingData.estimatedDeliveryMinutes} min
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Address</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%] truncate">
                      {getDeliveryAddress()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rider info */}
              <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Truck className="h-4 w-4 text-[#13ec5b]" />
                    Rider
                  </h3>
                </div>
                <div className="p-4">
                  {hasRider ? (
                    <div className="flex items-center gap-3">
                      {trackingData.rider?.profilePicture ? (
                        <img
                          src={trackingData.rider.profilePicture}
                          alt={trackingData.rider.name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#13ec5b]/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-[#13ec5b]" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {trackingData.rider.name || "Rider"}
                        </p>
                        {trackingData.rider?.phone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {trackingData.rider.phone}
                          </p>
                        )}
                        {trackingData.rider?.email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {trackingData.rider.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No rider assigned yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Distance & duration */}
              {trackingData?.route && (
                <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-[#13ec5b]" />
                      Trip Info
                    </h3>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Distance</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {trackingData.route.distanceText || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Duration</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {trackingData.route.durationText || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Bottombar />
    </div>
  );
};

export default Tracking;