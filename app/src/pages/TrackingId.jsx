// src/pages/TrackingId.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import QRCode from "react-qr-code";
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
  Phone,
  QrCode,
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
import Sidebar from "../components/Sidebar";
import Bottombar from "../components/Bottombar";
import {
  useGetTrackingQuery,
  useUpdateUserLocationMutation,
} from "../features/trackingApiSlice";

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

// ─── Component to fly to a location ──────────────────────────
const FlyToLocation = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1.5 });
    }
  }, [map, position]);
  return null;
};

const TrackingId = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { userInfo } = useSelector((state) => state.auth);

  // ─── State ──────────────────────────────────────────────
  const [riderLocation, setRiderLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([6.5244, 3.3792]);

  // ─── Queries ──────────────────────────────────────────────
  const {
    data: trackingData,
    isLoading,
    error,
    refetch,
  } = useGetTrackingQuery(orderId, {
    skip: !orderId,
    pollingInterval: 15000,
  });

  const [updateUserLocation, { isLoading: updatingLocation }] =
    useUpdateUserLocationMutation();

  // ─── Extract tracking data ──────────────────────────────
  useEffect(() => {
    if (trackingData) {
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
        setMapCenter([
          trackingData.userLocation.lat,
          trackingData.userLocation.lng,
        ]);
      } else if (trackingData.riderLocation) {
        setMapCenter([
          trackingData.riderLocation.lat,
          trackingData.riderLocation.lng,
        ]);
      }
    }
  }, [trackingData]);

  // ─── Update user location ──────────────────────────────
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
          await updateUserLocation({
            orderId,
            lat: latitude,
            lng: longitude,
          }).unwrap();
          await refetch();
          setMapCenter([latitude, longitude]);
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

  // ─── Decode polyline ─────────────────────────────────────
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
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#13ec5b]" />
            </div>
          </div>
        </div>
        <Bottombar />
      </div>
    );
  }

  // ─── No rider has accepted yet (404 = tracking not created yet) ───────
  const noTrackingYet = error?.status === 404;

  if (noTrackingYet) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl p-6 text-center">
                <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Waiting for a rider
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Your order hasn't been picked up by a rider yet. Tracking
                  will appear here automatically once a rider accepts your
                  delivery.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => refetch()}
                    className="px-6 py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition inline-flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" /> Check Again
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition inline-flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" /> Go Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Bottombar />
      </div>
    );
  }

  // ─── Any other error ─────────────────────────────────────
  if (error || !trackingData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tracking unavailable
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {error?.data?.message ||
                    "Something went wrong loading tracking for this order."}
                </p>
                <button
                  onClick={() => navigate(-1)}
                  className="mt-4 px-6 py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition inline-flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" /> Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
        <Bottombar />
      </div>
    );
  }

  const order = trackingData.order || null;
  const defaultCenter = [6.5244, 3.3792];
  const center = mapCenter || defaultCenter;

  // ─── QR state ─────────────────────────────────────────────
  const isCustomer = userInfo?.role === "user";
  const isQrConfirmed = !!order?.verificationScannedAt;
  const canShowQr =
    isCustomer &&
    !!order?.paid &&
    !!order?.verificationToken &&
    !isQrConfirmed &&
    order?.status !== "completed" &&
    order?.status !== "cancelled" &&
    order?.status !== "failed";

  // Rider has marked delivered but scan hasn't happened yet
  const waitingForScan =
    canShowQr && order?.deliveryStatus === "delivered";

  // ─── QR Panel ─────────────────────────────────────────────
  const QrPanel = () => {
    if (!canShowQr) return null;

    const showTo =
      order?.orderType === "gas" && order?.fulfillmentType === "pickup"
        ? "station"
        : "rider";

    return (
      <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-none sm:rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="h-4 w-4 text-[#13ec5b]" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {waitingForScan
              ? `Show this to the ${showTo} — they've arrived`
              : `Show this to the ${showTo} on arrival`}
          </h3>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="bg-white p-3 rounded-xl border border-gray-200"
            style={{ width: "100%", maxWidth: 240 }}
          >
            <QRCode
              value={order.verificationToken}
              size={220}
              level="M"
              bgColor="#ffffff"
              fgColor="#09090b"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mt-3 leading-relaxed max-w-xs">
            The {showTo} will scan this code to confirm your order. Keep this
            screen open until they've scanned it.
          </p>
        </div>
      </div>
    );
  };

  // ─── Mobile Hero Card ────────────────────────────────────
  const HeroCard = () => (
    <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 mb-4 shadow-sm rounded-none sm:rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Live Tracking
          </span>
          <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white">
            {order ? `Order #${order.orderId}` : "No order"}
          </h1>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <RefreshCw className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {order && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              Status
            </span>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  order.deliveryStatus
                )}`}
              >
                {order.deliveryStatus || "pending"}
              </span>
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              Rider
            </span>
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {order.rider?.name || "Not assigned"}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2 col-span-2">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              Address
            </span>
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {order.deliveryAddress || "—"}
            </p>
          </div>
        </div>
      )}

      {/* Confirmed badge */}
      {isQrConfirmed && (
        <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold">Order confirmed by scan</p>
            {order?.verificationScannedAt && (
              <p className="text-[10px] opacity-80">
                {new Date(order.verificationScannedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={updateMyLocation}
          disabled={updatingLocation}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#13ec5b] text-white rounded-lg text-sm font-medium hover:bg-[#10d04e] transition disabled:opacity-50"
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
      <Sidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Tracking #{order?.orderId || "Loading..."}
            </h1>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </header>

        <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
          <HeroCard />

          {/* Map */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden rounded-none sm:rounded-2xl">
            <div className="h-80 w-full bg-gray-200 dark:bg-gray-700">
              <MapContainer
                center={center}
                zoom={15}
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
                        <p className="font-semibold">Rider</p>
                        <p className="text-gray-600">
                          {order?.rider?.name || "Unknown"}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {userLocation && (
                  <Marker position={userLocation} icon={userIcon}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">You</p>
                        <p className="text-gray-600">Your current location</p>
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

                {userLocation && <FlyToLocation position={userLocation} />}
              </MapContainer>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#13ec5b] inline-block" />{" "}
                  Rider
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{" "}
                  You
                </span>
              </div>
              <span>
                {trackingData?.route?.distanceText &&
                  trackingData?.route?.durationText &&
                  `${trackingData.route.distanceText} · ${trackingData.route.durationText}`}
              </span>
            </div>
          </div>

          {/* QR panel — customer shows this to the rider/station on arrival */}
          <QrPanel />

          {/* Confirmed panel (desktop + mobile) */}
          {isQrConfirmed && (
            <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-none sm:rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-lg">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    Order confirmed by scan
                  </p>
                  <p className="text-xs opacity-80 mt-0.5">
                    Your order was scanned and confirmed
                    {order?.verificationScannedAt
                      ? ` on ${new Date(
                          order.verificationScannedAt
                        ).toLocaleString()}`
                      : ""}
                    .
                  </p>
                </div>
              </div>
            </div>
          )}

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
                    Rider
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {order.rider?.name || "Not assigned"}
                  </p>
                  {order.rider?.phone && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {order.rider.phone}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Amount
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    ₦{order.totalAmount?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Delivery Address
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {order.deliveryAddress || "—"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={updateMyLocation}
                  disabled={updatingLocation}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#13ec5b] text-white rounded-lg text-sm font-medium hover:bg-[#10d04e] transition disabled:opacity-50"
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
          )}
        </div>
      </div>

      <Bottombar />
    </div>
  );
};

export default TrackingId;