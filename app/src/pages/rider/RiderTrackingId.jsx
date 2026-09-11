// src/pages/rider/RiderTrackingId.jsx
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
  ChevronLeft,
  QrCode,
  Flame,
  Store,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import polyline from "@mapbox/polyline";
import RiderSidebar from "../../components/rider/Sidebar";
import RiderBottombar from "../../components/rider/Bottombar";
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

// ─── FlyToLocation ────────────────────────────────────────
const FlyToLocation = ({ position, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (position && trigger > 0) {
      map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 1.5 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
};

const RiderTrackingId = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();

  // ─── State ──────────────────────────────────────────────
  const [riderLocation, setRiderLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([6.5244, 3.3792]);
  const [recenterKey, setRecenterKey] = useState(0);

  // ─── Queries ──────────────────────────────────────────────
  const {
    data: trackingData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetTrackingQuery(orderId, {
    skip: !orderId,
    pollingInterval: 15000,
  });

  const [updateRiderLocation, { isLoading: updatingLocation }] =
    useUpdateRiderLocationMutation();

  // ─── Extract tracking data ──────────────────────────────
  useEffect(() => {
    if (trackingData) {
      if (trackingData.riderLocation) {
        setRiderLocation([
          trackingData.riderLocation.lat,
          trackingData.riderLocation.lng,
        ]);
        setMapCenter([
          trackingData.riderLocation.lat,
          trackingData.riderLocation.lng,
        ]);
      }
      if (trackingData.userLocation) {
        setUserLocation([
          trackingData.userLocation.lat,
          trackingData.userLocation.lng,
        ]);
      }
    }
  }, [trackingData]);

  // ─── Update rider location ──────────────────────────────
  const updateMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    toast.loading("Getting your location...", { id: "location-update" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await updateRiderLocation({
            orderId,
            lat: latitude,
            lng: longitude,
          }).unwrap();
          await refetch();
          setMapCenter([latitude, longitude]);
          setRecenterKey((k) => k + 1);
          toast.success("Location updated successfully", {
            id: "location-update",
          });
        } catch (err) {
          toast.error(err.data?.message || "Failed to update location", {
            id: "location-update",
          });
        }
      },
      (err) => {
        toast.error("Unable to fetch location: " + err.message, {
          id: "location-update",
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

  // ─── Decode polyline (safe) ─────────────────────────────
  const getRoutePositions = () => {
    if (!trackingData?.route?.polyline) return [];
    try {
      const decoded = polyline.decode(trackingData.route.polyline);
      return decoded.map(([lat, lng]) => [lat, lng]);
    } catch (err) {
      console.error("Failed to decode polyline:", err);
      return [];
    }
  };

  const routePositions = getRoutePositions();

  // ─── Loading ─────────────────────────────────────────────
  if (isLoading && !trackingData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <RiderSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
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

  // ─── Error ───────────────────────────────────────────────
  if (error || !trackingData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <RiderSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-2xl p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tracking not found
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {error?.data?.message ||
                    "No tracking data available for this order."}
                </p>
                <button
                  onClick={() => navigate(-1)}
                  className="mt-4 px-6 py-2 bg-[#13ec5b] text-gray-900 rounded-lg hover:bg-[#10d04e] transition inline-flex items-center gap-2 font-semibold"
                >
                  <ChevronLeft className="h-4 w-4" /> Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
        <RiderBottombar />
      </div>
    );
  }

  const order = trackingData.order || null;
  const defaultCenter = [6.5244, 3.3792];
  const center = mapCenter || defaultCenter;

  const isGas = order?.orderType === "gas";
  const isPickup = order?.fulfillmentType === "pickup";
  const isConfirmed = !!order?.verificationScannedAt;
  const needsScan =
    order?.deliveryStatus === "delivered" && !order?.verificationScannedAt;

  // ─── Mobile Hero Card ────────────────────────────────────
  const HeroCard = () => (
    <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 mb-4 shadow-sm rounded-2xl">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Live Tracking
          </span>
          <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white">
            {order ? `Order #${order.orderId}` : "No order"}
          </h1>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex-shrink-0 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {order && (
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
              {isGas ? (
                <Flame className="h-3 w-3" />
              ) : (
                <Truck className="h-3 w-3" />
              )}
              {isGas ? "Gas" : "Fuel"}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(
                order.deliveryStatus
              )}`}
            >
              {order.deliveryStatus || "pending"}
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
                {order.user?.name || "Unknown"}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2 min-w-0">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Amount
              </span>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                ₦{order.totalAmount?.toFixed(2) || "0.00"}
              </p>
            </div>
            {!isPickup && (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2 col-span-2 min-w-0">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  Address
                </span>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {order.deliveryAddress || "—"}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* QR scan CTA */}
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
            {order?.verificationScannedAt && (
              <p className="text-[10px] text-green-600 dark:text-green-400">
                {new Date(order.verificationScannedAt).toLocaleString()}
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
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
              Tracking #{order?.orderId || "..."}
            </h1>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50 flex-shrink-0"
            title="Refresh"
          >
            <RefreshCw
              className={`h-5 w-5 text-gray-500 dark:text-gray-400 ${
                isFetching ? "animate-spin" : ""
              }`}
            />
          </button>
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
                center={center}
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
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">You (Rider)</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {userLocation && (
                  <Marker position={userLocation} icon={userIcon}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">Customer</p>
                        <p className="text-gray-600">
                          {order?.user?.name || "Unknown"}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {routePositions.length > 0 && (
                  <Polyline
                    positions={routePositions}
                    color="#13ec5b"
                    weight={3}
                    opacity={0.8}
                  />
                )}

                {riderLocation && (
                  <FlyToLocation
                    position={riderLocation}
                    trigger={recenterKey}
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
          {order && (
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
                    #{order.orderId}
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
                      order.deliveryStatus
                    )}`}
                  >
                    {order.deliveryStatus || "pending"}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Amount
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    ₦{order.totalAmount?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Customer
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {order.user?.name || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Scheduled
                  </p>
                  <p className="text-gray-900 dark:text-white capitalize">
                    {order.scheduleType || "now"}
                  </p>
                </div>
                {!isPickup && (
                  <div className="col-span-2">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      Delivery Address
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      {order.deliveryAddress || "—"}
                    </p>
                  </div>
                )}
                {order.notes && (
                  <div className="col-span-2">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      Notes
                    </p>
                    <p className="text-gray-900 dark:text-white italic">
                      "{order.notes}"
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

export default RiderTrackingId;