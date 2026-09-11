// src/pages/rider/RiderTracking.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import {
  MapPin,
  Navigation,
  Truck,
  User,
  Package,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  XCircle,
  QrCode,
  Flame,
  Store,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import RiderSidebar from "../../components/rider/Sidebar";
import RiderBottombar from "../../components/rider/Bottombar";
import { useGetMyAssignedDeliveriesQuery } from "../../features/deliveryApiSlice";
import {
  useGetTrackingQuery,
  useUpdateRiderLocationMutation,
} from "../../features/trackingApiSlice";

// ─── Leaflet icon fix ──────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const riderIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ═══════════════════════════════════════════════════════════
//  Custom dropdown for order selection
// ═══════════════════════════════════════════════════════════
const OrderSelector = ({ deliveries, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = deliveries.find((d) => d._id === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition min-w-[160px] max-w-[220px]"
      >
        <span className="truncate text-left">
          {selected
            ? `#${selected.orderId || selected._id.slice(-6)} — ${
                selected.deliveryStatus || "pending"
              }`
            : "Select order"}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-40 max-h-72 overflow-auto py-1">
          {deliveries.map((d) => {
            const isSelected = d._id === value;
            return (
              <button
                key={d._id}
                type="button"
                onClick={() => {
                  onChange(d._id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between gap-2 ${
                  isSelected
                    ? "bg-[#13ec5b]/10 text-[#0f9c46] dark:text-[#13ec5b] font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    #{d.orderId || d._id.slice(-6)}
                  </p>
                  <p className="text-[10px] opacity-75 truncate">
                    {d.deliveryStatus || "pending"} ·{" "}
                    {d.user?.name || "Unknown"}
                  </p>
                </div>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#13ec5b] flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Main page
// ═══════════════════════════════════════════════════════════
const RiderTracking = () => {
  const navigate = useNavigate();
  const { orderId: paramOrderId } = useParams();
  const [selectedOrderId, setSelectedOrderId] = useState(paramOrderId || null);

  // ─── Queries ──────────────────────────────────────────────
  const {
    data: myDeliveries = [],
    isLoading: deliveriesLoading,
    error: deliveriesError,
    refetch: refetchDeliveries,
    isFetching: deliveriesFetching,
  } = useGetMyAssignedDeliveriesQuery(undefined, {
    pollingInterval: 30000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: trackingData,
    isLoading: trackingLoading,
    error: trackingError,
    refetch: refetchTracking,
  } = useGetTrackingQuery(selectedOrderId, {
    skip: !selectedOrderId,
    pollingInterval: 15000,
  });

  const [updateRiderLocation, { isLoading: updatingLocation }] =
    useUpdateRiderLocationMutation();

  // ─── State ──────────────────────────────────────────────
  const [activeOrder, setActiveOrder] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);

  // ─── Auto-select first delivery if none selected ────────
  useEffect(() => {
    if (myDeliveries.length > 0 && !selectedOrderId) {
      const first = myDeliveries[0];
      setSelectedOrderId(first._id);
      navigate(`/rider/tracking/${first._id}`, { replace: true });
    }
  }, [myDeliveries, selectedOrderId, navigate]);

  // ─── Extract tracking data ──────────────────────────────
  useEffect(() => {
    if (trackingData) {
      setActiveOrder(trackingData.order || null);
      if (trackingData.riderLocation) {
        setRiderLocation([
          trackingData.riderLocation.lat,
          trackingData.riderLocation.lng,
        ]);
      } else {
        setRiderLocation(null);
      }
      if (trackingData.userLocation) {
        setUserLocation([
          trackingData.userLocation.lat,
          trackingData.userLocation.lng,
        ]);
      } else {
        setUserLocation(null);
      }
    }
  }, [trackingData]);

  const handleOrderSelect = (id) => {
    setSelectedOrderId(id);
    navigate(`/rider/tracking/${id}`, { replace: true });
  };

  // ─── Update rider location ──────────────────────────────
  const updateMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    toast.loading("Getting your location...", { id: "rider-loc" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await updateRiderLocation({
            orderId: selectedOrderId,
            lat: latitude,
            lng: longitude,
          }).unwrap();
          await refetchTracking();
          toast.success("Location updated", { id: "rider-loc" });
        } catch (err) {
          toast.error(err.data?.message || "Failed to update location", {
            id: "rider-loc",
          });
        }
      },
      (err) => {
        toast.error("Unable to fetch location: " + err.message, {
          id: "rider-loc",
        });
      },
      { enableHighAccuracy: true }
    );
  };

  // ─── Status colors ──────────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
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

  // ─── Loading ────────────────────────────────────────────
  const isLoading = deliveriesLoading || trackingLoading;
  const error = deliveriesError || trackingError;

  if (isLoading && !activeOrder) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <RiderSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Tracking
            </h1>
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Tracking
            </h1>
          </header>
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">
                Failed to load tracking data
              </p>
            </div>
          </div>
        </div>
        <RiderBottombar />
      </div>
    );
  }

  // ─── Empty state — no assigned deliveries ───────────────
  if (myDeliveries.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <RiderSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Tracking
            </h1>
          </header>
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="max-w-md mx-auto mt-12 text-center">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No active deliveries to track
              </p>
              <button
                onClick={() => navigate("/rider/deliveries")}
                className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
              >
                Go to Deliveries
              </button>
            </div>
          </div>
        </div>
        <RiderBottombar />
      </div>
    );
  }

  const defaultCenter = [6.5244, 3.3792];
  const mapCenter = riderLocation || userLocation || defaultCenter;

  // Route polyline decoded via Leaflet
  let routePolyline = [];
  if (trackingData?.route?.polyline) {
    try {
      routePolyline = L.Polyline.fromEncoded(
        trackingData.route.polyline
      ).getLatLngs();
    } catch {
      routePolyline = [];
    }
  }

  const isGas = activeOrder?.orderType === "gas";
  const isConfirmed = !!activeOrder?.verificationScannedAt;
  const needsScan =
    activeOrder?.deliveryStatus === "delivered" && !activeOrder?.verificationScannedAt;

  // ─── Mobile Hero Card ────────────────────────────────────
  const HeroCard = () => (
    <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 mb-4 shadow-sm rounded-2xl">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Live Tracking
          </span>
          <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white">
            {activeOrder
              ? `Order #${activeOrder.orderId}`
              : "No active order"}
          </h1>
        </div>
        <button
          onClick={() => refetchTracking()}
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex-shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {activeOrder && (
        <>
          {/* Type + status badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                isGas
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              }`}
            >
              {isGas ? <Flame className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
              {isGas ? "Gas" : "Fuel"}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(
                activeOrder.deliveryStatus
              )}`}
            >
              {activeOrder.deliveryStatus || "pending"}
            </span>
            {isConfirmed && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <CheckCircle className="h-2.5 w-2.5" />
                Confirmed
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2 min-w-0">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Customer
              </span>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {activeOrder.user?.name || "Unknown"}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2 min-w-0">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Amount
              </span>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                ₦{activeOrder.totalAmount?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2 col-span-2 min-w-0">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Address
              </span>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {activeOrder.deliveryAddress || "—"}
              </p>
            </div>
          </div>
        </>
      )}

      {/* QR scan CTA — the big one */}
      {needsScan && (
        <button
          onClick={() => navigate("/rider/scan")}
          className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition"
        >
          <QrCode className="h-4 w-4" />
          Scan customer QR to confirm
        </button>
      )}

      {isConfirmed && (
        <div className="mt-3 flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-green-700 dark:text-green-300">
              Order confirmed
            </p>
            {activeOrder?.verificationScannedAt && (
              <p className="text-[10px] text-green-600 dark:text-green-400">
                {new Date(
                  activeOrder.verificationScannedAt
                ).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-3">
        <button
          onClick={updateMyLocation}
          disabled={updatingLocation}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#13ec5b] text-gray-900 rounded-xl text-sm font-semibold hover:bg-[#10d04e] transition disabled:opacity-50"
        >
          {updatingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          Update My Location
        </button>
      </div>
    </div>
  );

  // ─── Main render ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RiderSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Live Tracking
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            {myDeliveries.length > 1 && (
              <OrderSelector
                deliveries={myDeliveries}
                value={selectedOrderId}
                onChange={handleOrderSelect}
              />
            )}
            <button
              onClick={() => refetchTracking()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </header>

        <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
          <HeroCard />

          {/* Desktop QR banner */}
          {needsScan && (
            <div className="hidden lg:flex mb-4 rounded-2xl bg-gray-900 dark:bg-gray-800 border border-gray-800 dark:border-gray-700 p-4 items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <QrCode className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    Ready to confirm this delivery
                  </p>
                  <p className="text-xs text-gray-400">
                    Ask the customer to show their QR code.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/rider/scan")}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg text-sm font-semibold transition"
              >
                <QrCode className="h-4 w-4" />
                Scan now
              </button>
            </div>
          )}

          {/* Map */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden rounded-2xl">
            <div className="h-80 w-full bg-gray-200 dark:bg-gray-700">
              <MapContainer
                center={mapCenter}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {riderLocation && (
                  <Marker position={riderLocation} icon={riderIcon}>
                    <Popup>You (Rider)</Popup>
                  </Marker>
                )}

                {userLocation && (
                  <Marker position={userLocation} icon={userIcon}>
                    <Popup>Customer</Popup>
                  </Marker>
                )}

                {routePolyline.length > 0 && (
                  <Polyline
                    positions={routePolyline}
                    color="#13ec5b"
                    weight={3}
                    opacity={0.8}
                  />
                )}
              </MapContainer>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#13ec5b] inline-block" />{" "}
                  You
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{" "}
                  Customer
                </span>
              </div>
              <span>
                {trackingData?.route?.distanceText &&
                  trackingData?.route?.durationText &&
                  `${trackingData.route.distanceText} · ${trackingData.route.durationText}`}
              </span>
            </div>
          </div>

          {/* Order Details (Desktop) */}
          {activeOrder && (
            <div className="hidden lg:block mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Order Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Order ID
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    #{activeOrder.orderId}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Type
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      isGas
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    }`}
                  >
                    {isGas ? (
                      <Flame className="h-3 w-3" />
                    ) : (
                      <Truck className="h-3 w-3" />
                    )}
                    {isGas ? "Gas" : "Fuel"}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      activeOrder.deliveryStatus
                    )}`}
                  >
                    {activeOrder.deliveryStatus || "pending"}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Amount
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    ₦{activeOrder.totalAmount?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Customer
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {activeOrder.user?.name || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Scheduled
                  </p>
                  <p className="text-gray-900 dark:text-white capitalize">
                    {activeOrder.scheduleType || "now"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Delivery Address
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {activeOrder.deliveryAddress || "—"}
                  </p>
                </div>
                {activeOrder.notes && (
                  <div className="col-span-2">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      Notes
                    </p>
                    <p className="text-gray-900 dark:text-white italic">
                      "{activeOrder.notes}"
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={updateMyLocation}
                  disabled={updatingLocation}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#13ec5b] text-gray-900 rounded-lg text-sm font-semibold hover:bg-[#10d04e] transition disabled:opacity-50"
                >
                  {updatingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  Update My Location
                </button>
                {needsScan && (
                  <button
                    onClick={() => navigate("/rider/scan")}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition"
                  >
                    <QrCode className="h-4 w-4" />
                    Scan QR
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <RiderBottombar />
    </div>
  );
};

export default RiderTracking;