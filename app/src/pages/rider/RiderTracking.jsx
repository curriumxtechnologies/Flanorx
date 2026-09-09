// src/pages/rider/RiderTracking.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
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
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import RiderSidebar from "../../components/rider/Sidebar";
import RiderBottombar from "../../components/rider/Bottombar";
import { useGetMyAssignedDeliveriesQuery } from "../../features/deliveryApiSlice";
import { useGetTrackingQuery, useUpdateRiderLocationMutation } from "../../features/trackingApiSlice";

// ─── Leaflet icon fix ──────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icons for rider and user
const riderIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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
  } = useGetMyAssignedDeliveriesQuery();

  const {
    data: trackingData,
    isLoading: trackingLoading,
    error: trackingError,
    refetch: refetchTracking,
  } = useGetTrackingQuery(selectedOrderId, {
    skip: !selectedOrderId,
  });

  const [updateRiderLocation, { isLoading: updatingLocation }] = useUpdateRiderLocationMutation();

  // ─── State ──────────────────────────────────────────────
  const [activeOrder, setActiveOrder] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);

  // ─── When deliveries load, pick first active if none selected ──
  useEffect(() => {
    if (myDeliveries.length > 0 && !selectedOrderId) {
      const first = myDeliveries[0];
      setSelectedOrderId(first._id);
      navigate(`/rider/tracking/${first._id}`, { replace: true });
    }
  }, [myDeliveries, selectedOrderId, navigate]);

  // ─── When tracking data loads, extract locations ─────────
  useEffect(() => {
    if (trackingData) {
      setActiveOrder(trackingData.order || null);
      if (trackingData.riderLocation) {
        setRiderLocation([trackingData.riderLocation.lat, trackingData.riderLocation.lng]);
      }
      if (trackingData.userLocation) {
        setUserLocation([trackingData.userLocation.lat, trackingData.userLocation.lng]);
      }
    }
  }, [trackingData]);

  // ─── Handle order selection ──────────────────────────────
  const handleOrderSelect = (id) => {
    setSelectedOrderId(id);
    navigate(`/rider/tracking/${id}`, { replace: true });
  };

  // ─── Get current location and update rider location ──────
  const updateMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await updateRiderLocation({
            orderId: selectedOrderId,
            lat: latitude,
            lng: longitude,
          }).unwrap();
          refetchTracking();
        } catch (err) {
          alert(err.data?.message || "Failed to update location");
        }
      },
      (err) => {
        alert("Unable to fetch location: " + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // ─── Status colors ──────────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
      case "accepted": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "picked_up": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "in_transit": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "delivered": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "confirmed": return "bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  // ─── Loading & Errors ──────────────────────────────────
  const isLoading = deliveriesLoading || trackingLoading;
  const error = deliveriesError || trackingError;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <RiderSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Tracking</h1>
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Tracking</h1>
          </header>
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">Failed to load tracking data</p>
            </div>
          </div>
        </div>
        <RiderBottombar />
      </div>
    );
  }

  // ─── Default map center ────────────────────────────────
  const defaultCenter = [6.5244, 3.3792];
  const mapCenter = riderLocation || userLocation || defaultCenter;

  // ─── Polylines ───────────────────────────────────────────
  const routePolyline = trackingData?.route?.polyline
    ? L.Polyline.fromEncoded(trackingData.route.polyline).getLatLngs()
    : [];

  // ─── Mobile Hero Card ────────────────────────────────────
  const HeroCard = () => (
    <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 mb-4 shadow-sm rounded-none sm:rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Live Tracking
          </span>
          <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white">
            {activeOrder ? `Order #${activeOrder.orderId}` : "No active order"}
          </h1>
        </div>
        <button
          onClick={() => refetchTracking()}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <RefreshCw className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {activeOrder && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Status</span>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activeOrder.deliveryStatus)}`}>
                {activeOrder.deliveryStatus || "pending"}
              </span>
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Customer</span>
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {activeOrder.user?.name || "Unknown"}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2 col-span-2">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Address</span>
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {activeOrder.deliveryAddress || "—"}
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={updateMyLocation}
          disabled={updatingLocation}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#13ec5b] text-white rounded-lg text-sm font-medium hover:bg-[#10d04e] transition disabled:opacity-50"
        >
          {updatingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          Update Location
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
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Live Tracking</h1>
          <div className="flex items-center gap-3">
            {/* Order selector dropdown if multiple */}
            {myDeliveries.length > 1 && (
              <select
                value={selectedOrderId || ""}
                onChange={(e) => handleOrderSelect(e.target.value)}
                className="text-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#13ec5b]/50"
              >
                {myDeliveries.map((d) => (
                  <option key={d._id} value={d._id}>
                    #{d.orderId} – {d.deliveryStatus}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => refetchTracking()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </header>

        <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
          <HeroCard />

          {/* Map */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden rounded-none sm:rounded-2xl">
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

                {/* Rider Marker */}
                {riderLocation && (
                  <Marker position={riderLocation} icon={riderIcon}>
                    <Popup>You (Rider)</Popup>
                  </Marker>
                )}

                {/* User Marker */}
                {userLocation && (
                  <Marker position={userLocation} icon={userIcon}>
                    <Popup>Customer</Popup>
                  </Marker>
                )}

                {/* Route Polyline */}
                {routePolyline.length > 0 && (
                  <Polyline positions={routePolyline} color="#13ec5b" weight={3} opacity={0.8} />
                )}
              </MapContainer>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#13ec5b] inline-block" /> Rider
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Customer
                </span>
              </div>
              <span>
                {trackingData?.route?.distanceText && trackingData?.route?.durationText && (
                  `${trackingData.route.distanceText} · ${trackingData.route.durationText}`
                )}
              </span>
            </div>
          </div>

          {/* Order Details (Desktop) */}
          {activeOrder && (
            <div className="hidden lg:block mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Order Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Order ID</p>
                  <p className="text-gray-900 dark:text-white">#{activeOrder.orderId}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activeOrder.deliveryStatus)}`}>
                    {activeOrder.deliveryStatus || "pending"}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Customer</p>
                  <p className="text-gray-900 dark:text-white">{activeOrder.user?.name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Amount</p>
                  <p className="text-gray-900 dark:text-white">₦{activeOrder.totalAmount?.toFixed(2) || "0.00"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Delivery Address</p>
                  <p className="text-gray-900 dark:text-white">{activeOrder.deliveryAddress || "—"}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={updateMyLocation}
                  disabled={updatingLocation}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#13ec5b] text-white rounded-lg text-sm font-medium hover:bg-[#10d04e] transition disabled:opacity-50"
                >
                  {updatingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                  Update My Location
                </button>
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