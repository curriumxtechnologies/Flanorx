// pages/Gas.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useSelector } from "react-redux";
import {
  Flame,
  Package,
  MapPin,
  Calendar,
  Clock,
  ChevronDown,
  Loader2,
  CheckCircle,
  Truck,
  Zap,
  ShoppingBag,
  Navigation,
  X,
  ArrowRight,
  Store,
  Phone,
  Droplet,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Geolocation } from "@capacitor/geolocation";

// ─── API Slices ───────────────────────────────────────────
import { useCreateOrderMutation } from "../features/orderApiSlice";
import { useGetGasSubscriptionQuery, useSubscribeGasMutation } from "../features/gasApiSlice";
import { useGetProfileQuery } from "../features/userApiSlice";
// Standard Flanorx stations (Swap)
import { useGetNearbyStationsQuery } from "../features/stationApiSlice";
// Third-party Refill stations
import { 
  useGetNearbyRefillStationsQuery, 
  useCreateRefillOrderMutation 
} from "../features/refillApiSlice";

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

// ─── Reverse geocode ──────────────────────────────────────
const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await res.json();
    if (data && data.display_name) return data.display_name;
    return null;
  } catch {
    return null;
  }
};

// ─── Detect if running inside Capacitor native shell ──────
const isNativePlatform = () => {
  if (typeof window === "undefined") return false;
  const cap = window.Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === "function") return cap.isNativePlatform();
  return cap.platform === "android" || cap.platform === "ios";
};

const makeError = (message, code) => {
  const err = new Error(message);
  err.code = code;
  return err;
};

const isSafariBrowser = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /^((?!chrome|android).)*safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
};

const getNativePosition = async () => {
  try {
    return await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  } catch (err) {
    const msg = (err?.message || "").toLowerCase();
    if (msg.includes("location services") || msg.includes("disabled") || msg.includes("gps")) {
      throw makeError("Location Services (GPS) is turned off. Please enable it in your settings.", "LOCATION_SERVICES_OFF");
    }
    try {
      return await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
    } catch (fallbackErr) {
      throw fallbackErr;
    }
  }
};

const getWebPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(makeError("Geolocation is not supported by your browser.", "UNSUPPORTED"));
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      reject(makeError("Location requires a secure (HTTPS) connection.", "INSECURE_CONTEXT"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        if (err.code === 1) {
          const safari = isSafariBrowser();
          const message = safari
            ? "Location access is blocked. Tap 'aA' or lock icon -> Website Settings -> Location -> Allow."
            : "Location permission was denied. Please allow location access in your browser.";
          reject(makeError(message, "PERMISSION_DENIED"));
        } else if (err.code === 2) {
          reject(makeError("Location information is unavailable.", "POSITION_UNAVAILABLE"));
        } else if (err.code === 3) {
          reject(makeError("Location request timed out.", "TIMEOUT"));
        } else {
          reject(makeError(err.message || "Unable to get location", "UNKNOWN"));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
};

const getCurrentPositionSafe = async () => {
  if (isNativePlatform()) {
    let status = await Geolocation.checkPermissions();
    if (status.location !== "granted") status = await Geolocation.requestPermissions();
    if (status.location === "denied") throw makeError("Location permission denied.", "PERMISSION_DENIED");
    const position = await getNativePosition();
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  }
  return getWebPosition();
};

// ─── Map Handlers ─────────────────────────────────────────
const DraggableMarker = ({ position, setPosition, onAddressUpdate }) => {
  const markerRef = useRef(null);
  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const latlng = marker.getLatLng();
        setPosition([latlng.lat, latlng.lng]);
        reverseGeocode(latlng.lat, latlng.lng).then((addr) => {
          if (addr) onAddressUpdate(addr);
        });
      }
    },
  };
  return <Marker draggable position={position} icon={greenIcon} ref={markerRef} eventHandlers={eventHandlers} />;
};

const MapClickHandler = ({ setPosition, onAddressUpdate }) => {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      map.flyTo([lat, lng], 16);
      reverseGeocode(lat, lng).then((addr) => {
        if (addr) onAddressUpdate(addr);
      });
    },
  });
  return null;
};

const formatDistance = (km) => {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

const Gas = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: user, isLoading: userLoading } = useGetProfileQuery();

  // ─── Queries & Mutations ─────────────────────────────────
  const { data: subscriptionData, isLoading: subLoading } = useGetGasSubscriptionQuery();
  
  const [subscribeGas, { isLoading: subscribeLoading }] = useSubscribeGasMutation();
  const [createOrder, { isLoading: orderLoading }] = useCreateOrderMutation();
  // Third-party refill order mutation
  const [createRefillOrder, { isLoading: refillOrderLoading }] = useCreateRefillOrderMutation();

  // ─── Derived subscription state ───────────────────────────
  const subscription = subscriptionData?.subscription || null;
  const isActive = subscriptionData?.isActive || false;
  const currentCylinderSize = subscription?.cylinderSize || null;
  const daysRemaining = subscriptionData?.daysRemaining || 0;

  // ─── Form state ───────────────────────────────────────────
  const [cylinderSize, setCylinderSize] = useState(currentCylinderSize || "3kg");
  const [fulfillmentType, setFulfillmentType] = useState("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [scheduleType, setScheduleType] = useState("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [showCylinderDropdown, setShowCylinderDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  // ─── Swap vs Refill state ─────────────────────────────────
  const [serviceType, setServiceType] = useState(() =>
    searchParams.get("serviceType") === "refill" ? "refill" : "swap"
  );

  // ─── Pickup station state ─────────────────────────────────
  const [pickupCoords, setPickupCoords] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [isLocatingForPickup, setIsLocatingForPickup] = useState(false);

  // ─── Map state ────────────────────────────────────────────
  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState([6.5244, 3.3792]);
  const [markerPosition, setMarkerPosition] = useState([6.5244, 3.3792]);
  const [isLocating, setIsLocating] = useState(false);

  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─── Gas constants (TESTING prices) ───────────────────────
  const GAS_PRICE_PER_KG = 10;
  const CYLINDER_COST = { "3kg": 100, "6kg": 200, "12kg": 300 };
  const CYLINDER_SIZES = [
    { label: "3kg", value: "3kg" },
    { label: "6kg", value: "6kg" },
    { label: "12kg", value: "12kg" },
  ];

  const quantityKg = useMemo(() => {
    const n = parseInt(cylinderSize, 10);
    return Number.isFinite(n) && n > 0 ? n : 3;
  }, [cylinderSize]);

  useEffect(() => {
    if (currentCylinderSize) setCylinderSize(currentCylinderSize);
  }, [currentCylinderSize]);

  const isSizeChange = isActive && cylinderSize !== currentCylinderSize;

  // ─── Fetch Stations Conditionally ─────────────────────────
  
  // 1. Flanorx Pickup Stations (For Swaps)
  const {
    data: flanorxStations = [],
    isFetching: flanorxLoading,
    refetch: refetchFlanorx,
  } = useGetNearbyStationsQuery(
    { lat: pickupCoords?.lat, lng: pickupCoords?.lng, radiusKm: 50 },
    { skip: serviceType !== "swap" || fulfillmentType !== "pickup" || !pickupCoords }
  );

  // 2. Refill Stations (For Refills)
  const {
    data: refillStations = [],
    isFetching: refillLoading,
    refetch: refetchRefill,
  } = useGetNearbyRefillStationsQuery(
    { lat: pickupCoords?.lat, lng: pickupCoords?.lng, radiusKm: 50, cylinderSize },
    { skip: serviceType !== "refill" || fulfillmentType !== "pickup" || !pickupCoords }
  );

  const nearbyLoading = flanorxLoading || refillLoading;

  const refetchNearby = () => {
    if (serviceType === "refill") refetchRefill();
    else refetchFlanorx();
  };

  // ─── Combine & Filter Stations ────────────────────────────
  const availableStations = useMemo(() => {
    if (serviceType === "refill") {
      return refillStations;
    }
    return flanorxStations.filter((s) => Number(s.stock?.[cylinderSize] || 0) > 0);
  }, [flanorxStations, refillStations, cylinderSize, serviceType]);

  useEffect(() => {
    if (!selectedStationId) return;
    const stillValid = availableStations.some((s) => String(s._id) === String(selectedStationId));
    if (!stillValid) setSelectedStationId(null);
  }, [availableStations, selectedStationId]);

  // ─── Calculate price ──────────────────────────────────────
  useEffect(() => {
    const cylinderCost = serviceType === "refill" ? 0 : !isActive ? CYLINDER_COST[cylinderSize] || 0 : 0;
    const gasContentCost = quantityKg * GAS_PRICE_PER_KG;
    const subtotal = gasContentCost + cylinderCost;
    const deliveryFee = fulfillmentType === "pickup" ? 0 : 1.0;
    const serviceTax = subtotal * 0.01;
    const total = subtotal + deliveryFee + serviceTax;

    setPriceBreakdown({
      gasContentCost,
      cylinderCost,
      subtotal,
      deliveryFee,
      serviceTax,
      total,
      cylinderSize,
      quantityKg,
      isActive,
      currentCylinderSize,
      fulfillmentType,
    });
  }, [cylinderSize, quantityKg, isActive, currentCylinderSize, fulfillmentType, serviceType]);

  // ─── Address selection ────────────────────────────────────
  const addresses = user?.addresses || [];
  const defaultAddress = addresses.find((a) => a.isDefault);
  const addressOptions = addresses.map((a) => ({ label: a.address, value: a._id }));

  useEffect(() => {
    if (defaultAddress && !useSavedAddress) {
      setDeliveryAddress(defaultAddress.address);
    } else if (useSavedAddress && defaultAddress) {
      setDeliveryAddress(defaultAddress.address);
      setSelectedAddress(defaultAddress._id);
    }
  }, [defaultAddress, useSavedAddress]);

  const handleAddressSelect = (addrId) => {
    setSelectedAddress(addrId);
    const addr = addresses.find((a) => a._id === addrId);
    if (addr) setDeliveryAddress(addr.address);
    setShowAddressDropdown(false);
  };

  const handleCylinderSelect = (size) => {
    setCylinderSize(size);
    setShowCylinderDropdown(false);
  };

  // ─── Map handlers ─────────────────────────────────────────
  const handleMapAddressUpdate = (addr) => {
    if (addr) {
      setDeliveryAddress(addr);
      setUseSavedAddress(false);
    }
  };

  const getCurrentLocation = async () => {
    setError("");
    setIsLocating(true);
    try {
      const { latitude, longitude } = await getCurrentPositionSafe();
      const newPos = [latitude, longitude];
      setMapPosition(newPos);
      setMarkerPosition(newPos);
      const addr = await reverseGeocode(latitude, longitude);
      if (addr) {
        setDeliveryAddress(addr);
        setUseSavedAddress(false);
      }
      if (!showMap) setShowMap(true);
    } catch (err) {
      setError(err.message || "Unable to fetch location");
    } finally {
      setIsLocating(false);
    }
  };

  const locateForPickup = async () => {
    setError("");
    setIsLocatingForPickup(true);
    try {
      const { latitude, longitude } = await getCurrentPositionSafe();
      setPickupCoords({ lat: latitude, lng: longitude });
    } catch (err) {
      setError(err.message || "Unable to fetch your location");
    } finally {
      setIsLocatingForPickup(false);
    }
  };

  useEffect(() => {
    if (fulfillmentType === "pickup" && !pickupCoords && !isLocatingForPickup) {
      locateForPickup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fulfillmentType]);

  // ─── Handle submit ────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isSizeChange) {
      setError("You can't change cylinder size from this page. Please use the Gas Subscription page.");
      return;
    }

    let coords = null;
    if (fulfillmentType === "delivery") {
      if (!deliveryAddress.trim()) {
        setError("Please provide a delivery address");
        return;
      }
      coords = { lat: markerPosition[0], lng: markerPosition[1] };
      if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
        setError("We need your delivery location. Please use the map or 'Current location'.");
        return;
      }
    } else {
      if (!selectedStationId) {
        setError(`Please choose a ${serviceType === "refill" ? "refill" : "pickup"} station`);
        return;
      }
    }

    if (scheduleType === "scheduled" && (!scheduledDate || !scheduledTime)) {
      setError("Please select both date and time for scheduled delivery");
      return;
    }

    try {
      let result;

      // ==========================================
      // 🟢 PATH 1: REFILL (Third-Party Station API)
      // ==========================================
      if (serviceType === "refill") {
        const payload = {
          stationId: selectedStationId,
          cylinderSize,
          quantity: quantityKg,
          fulfillmentType,
          deliveryAddress: fulfillmentType === "pickup" ? "" : deliveryAddress.trim(),
          deliveryCoordinates: fulfillmentType === "delivery" ? coords : undefined,
          scheduledDate: scheduleType === "scheduled" ? scheduledDate : undefined,
          scheduledTime: scheduleType === "scheduled" ? scheduledTime : undefined,
          notes: notes.trim() || undefined,
        };
        
        result = await createRefillOrder(payload).unwrap();
        if (result.authorization_url) {
          window.location.href = result.authorization_url;
        } else {
          setError("Failed to initialize refill payment");
        }
        return;
      }

      // ==========================================
      // 🔵 PATH 2: SWAP (Flanorx API)
      // ==========================================
      
      // 2a. If no active subscription, they must subscribe first
      if (!isActive) {
        const payload = { cylinderSize, quantityKg, fulfillmentType };
        if (fulfillmentType === "pickup") {
          payload.stationId = selectedStationId;
        } else {
          payload.deliveryCoordinates = coords;
        }
        result = await subscribeGas(payload).unwrap();
        if (result.authorization_url) {
          window.location.href = result.authorization_url;
        } else {
          setError("Failed to initialize subscription payment");
        }
        return;
      }

      // 2b. Active subscription, just a swap order
      const orderData = {
        orderType: "gas",
        gasDetails: {
          cylinderSize,
          quantityKg,
          isFirstTime: false,
          cylinderCost: 0,
          gasContentCost: priceBreakdown.gasContentCost,
          previousCylinderSize: currentCylinderSize,
          serviceType: "swap",
        },
        fulfillmentType,
        deliveryAddress: fulfillmentType === "pickup" ? "" : deliveryAddress.trim(),
        deliveryCoordinates: fulfillmentType === "delivery" ? coords : undefined,
        stationId: fulfillmentType === "pickup" ? selectedStationId : undefined,
        scheduleType,
        scheduledDate: scheduleType === "scheduled" ? scheduledDate : undefined,
        scheduledTime: scheduleType === "scheduled" ? scheduledTime : undefined,
        notes: notes.trim() || undefined,
        subtotal: priceBreakdown.subtotal,
        deliveryFee: priceBreakdown.deliveryFee,
        serviceTax: priceBreakdown.serviceTax,
        totalAmount: priceBreakdown.total,
        estimatedDeliveryMinutes: scheduleType === "now" && fulfillmentType === "delivery" ? 45 : undefined,
      };
      
      result = await createOrder(orderData).unwrap();
      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        setError("Failed to initialize payment");
      }
    } catch (err) {
      setError(err.data?.message || err.message || "Failed to place order");
    }
  };

  const isLoading = userLoading || subLoading || subscribeLoading || orderLoading || refillOrderLoading;
  const isPickup = fulfillmentType === "pickup";

  const selectedStation = useMemo(() => {
    return availableStations.find((s) => String(s._id) === String(selectedStationId)) || null;
  }, [availableStations, selectedStationId]);

  const ctaLabel = () => {
    if (isSizeChange) return "Change Plan First";
    if (serviceType === "refill") return isPickup ? "Refill & Drop-off" : "Refill & Pay";
    return !isActive
      ? isPickup
        ? "Subscribe & Pick Up"
        : "Subscribe & Pay"
      : isPickup
        ? "Swap & Pick Up"
        : "Swap & Pay";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            {isActive ? "Order Gas" : serviceType === "refill" ? "Refill Gas" : "Get Gas Subscription"}
          </h1>
          <button
            onClick={() => navigate("/orders")}
            className="text-xs sm:text-sm text-[#13ec5b] hover:underline flex-shrink-0 ml-2"
          >
            View Orders
          </button>
        </header>

        <div className="w-full px-0 sm:px-4 lg:px-6 py-4 lg:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {/* ─── Main form ─────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-[#13ec5b] flex-shrink-0" />
                    {serviceType === "refill" ? "Refill Your Cylinder" : !isActive ? "Start Your Gas Subscription" : "Swap Your Gas"}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {serviceType === "refill"
                      ? `Keep your ${cylinderSize} cylinder — we'll collect, refill, and return it.`
                      : !isActive
                        ? "Choose how you want to get your gas."
                        : `You have an active ${currentCylinderSize} subscription (${daysRemaining} days left).`}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                  {error && (
                    <div className="p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-xs sm:text-sm border border-red-200 dark:border-red-800 flex items-start gap-2">
                      <span className="flex-shrink-0">⚠️</span>
                      <span className="min-w-0 break-words whitespace-pre-line">{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="p-2.5 sm:p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-xs sm:text-sm border border-green-200 dark:border-green-800 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" /> {success}
                    </div>
                  )}

                  {isActive && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 sm:p-4 border border-green-200 dark:border-green-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-300 truncate">Active Subscription</p>
                        <p className="text-[11px] sm:text-xs text-green-600 dark:text-green-400 truncate">{currentCylinderSize} · {daysRemaining} days remaining</p>
                      </div>
                      <span className="text-[10px] sm:text-xs bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full flex-shrink-0">Active</span>
                    </div>
                  )}

                  {isSizeChange && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                      <p className="font-medium">Changing cylinder size?</p>
                      <p className="mt-1 text-[11px] sm:text-xs">Size changes are handled as a plan change on your subscription page.</p>
                      <button type="button" onClick={() => navigate("/gas/subscription")} className="mt-2 sm:mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-[11px] sm:text-xs font-medium transition">
                        Go to Subscription Page <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* ⭐ 1. Cylinder Handling (Swap vs Refill) */}
                  {!isSizeChange && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cylinder Handling</label>
                      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {serviceType === "swap" ? "Exchange your empty cylinder for a full one, or start a new subscription." : "Keep your own cylinder — we'll collect it, refill it, and return it full."}
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => setServiceType("swap")}
                          className={`flex flex-col items-start gap-0.5 sm:gap-1 p-2.5 sm:p-3.5 rounded-xl text-xs sm:text-sm font-medium transition border-2 text-left ${
                            serviceType === "swap" ? "border-[#13ec5b] bg-[#13ec5b]/10 text-[#13ec5b]" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 sm:gap-2"><Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" /><span>Swap</span></span>
                          <span className="text-[9px] sm:text-[10px] opacity-75 leading-tight">{!isActive ? "Buy a new cylinder" : "Exchange for a full cylinder"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setServiceType("refill")}
                          className={`flex flex-col items-start gap-0.5 sm:gap-1 p-2.5 sm:p-3.5 rounded-xl text-xs sm:text-sm font-medium transition border-2 text-left ${
                            serviceType === "refill" ? "border-[#13ec5b] bg-[#13ec5b]/10 text-[#13ec5b]" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 sm:gap-2"><Droplet className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" /><span>Refill</span></span>
                          <span className="text-[9px] sm:text-[10px] opacity-75 leading-tight">Keep your cylinder, top it up</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ⭐ 2. Fulfillment Type (Adapts to Swap vs Refill) */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      How do you want to {serviceType === "refill" ? "get your cylinder refilled" : "get your gas"}?
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setFulfillmentType("delivery")}
                        className={`flex flex-col items-start gap-0.5 sm:gap-1 p-2.5 sm:p-3.5 rounded-xl text-xs sm:text-sm font-medium transition border-2 text-left ${
                          !isPickup ? "border-[#13ec5b] bg-[#13ec5b]/10 text-[#13ec5b]" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 sm:gap-2">
                          <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>{serviceType === "refill" ? "Home Collection" : "Delivery"}</span>
                        </span>
                        <span className="text-[9px] sm:text-[10px] opacity-75 leading-tight">
                          {serviceType === "refill" ? "Rider collects & returns" : "Bring it to your door"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFulfillmentType("pickup")}
                        className={`flex flex-col items-start gap-0.5 sm:gap-1 p-2.5 sm:p-3.5 rounded-xl text-xs sm:text-sm font-medium transition border-2 text-left ${
                          isPickup ? "border-[#13ec5b] bg-[#13ec5b]/10 text-[#13ec5b]" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 sm:gap-2">
                          <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>{serviceType === "refill" ? "Drop-off" : "Pickup"}</span>
                        </span>
                        <span className="text-[9px] sm:text-[10px] opacity-75 leading-tight">
                          {serviceType === "refill" ? "Take it to the station" : "Pick up at a nearby station"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* ─── Cylinder Size ───────────────────────────── */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cylinder Size</label>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-2">You'll receive {quantityKg}kg of gas.</p>
                    <div className="lg:hidden grid grid-cols-3 gap-1.5 sm:gap-2">
                      {CYLINDER_SIZES.map((size) => {
                        const isSelected = cylinderSize === size.value;
                        const isCurrent = isActive && currentCylinderSize === size.value;
                        let costLabel = "";
                        if (!isActive && serviceType === "swap") costLabel = `+₦${CYLINDER_COST[size.value]}`;
                        else if (isCurrent) costLabel = "current";
                        else if (serviceType === "refill") costLabel = "no cylinder cost";
                        else costLabel = "change";

                        return (
                          <button
                            key={size.value}
                            type="button"
                            onClick={() => handleCylinderSelect(size.value)}
                            className={`py-2 px-0.5 sm:py-2.5 sm:px-1 rounded-xl text-xs sm:text-sm font-medium transition-all border-2 ${
                              isSelected ? "border-[#13ec5b] bg-[#13ec5b] text-white shadow-lg shadow-[#13ec5b]/20" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}
                          >
                            <div className="font-semibold leading-tight">{size.label}</div>
                            <div className="text-[9px] sm:text-[10px] opacity-80 leading-tight mt-0.5">{costLabel}</div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="hidden lg:block relative">
                      <button
                        type="button"
                        onClick={() => setShowCylinderDropdown(!showCylinderDropdown)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white hover:border-[#13ec5b]/50 transition focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
                      >
                        <span className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-[#13ec5b]" /> {cylinderSize}
                          {isActive && currentCylinderSize && <span className="text-xs text-gray-400 ml-1">(current: {currentCylinderSize})</span>}
                        </span>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showCylinderDropdown ? "rotate-180" : ""}`} />
                      </button>
                      {showCylinderDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                          {CYLINDER_SIZES.map((size) => {
                            const isCurrent = isActive && currentCylinderSize === size.value;
                            let costLabel = "";
                            if (!isActive && serviceType === "swap") costLabel = `+₦${CYLINDER_COST[size.value]}`;
                            else if (isCurrent) costLabel = "current";
                            else if (serviceType === "refill") costLabel = "no cylinder cost";
                            else costLabel = "change plan";

                            return (
                              <button
                                key={size.value}
                                type="button"
                                onClick={() => handleCylinderSelect(size.value)}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-between ${
                                  cylinderSize === size.value ? "bg-[#13ec5b]/10 text-[#13ec5b]" : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                <span>{size.label}</span>
                                <span className="text-xs text-gray-400">{costLabel}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ─── Delivery: Address + Map ─────────────────── */}
                  {!isPickup && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {serviceType === "refill" ? "Pickup Address" : "Delivery Address"}
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {addresses.length > 0 && (
                          <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            <input type="checkbox" checked={useSavedAddress} onChange={() => setUseSavedAddress(!useSavedAddress)} className="rounded border-gray-300 text-[#13ec5b] focus:ring-[#13ec5b]/50 h-4 w-4" /> Saved address
                          </label>
                        )}
                        <button type="button" onClick={() => setShowMap(!showMap)} className="text-xs sm:text-sm text-[#13ec5b] hover:underline flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {showMap ? "Hide map" : "Pick on map"}
                        </button>
                        <button type="button" onClick={getCurrentLocation} disabled={isLocating} className="text-xs sm:text-sm text-[#13ec5b] hover:underline flex items-center gap-1 disabled:opacity-50">
                          {isLocating ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Navigation className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                          {isLocating ? "Locating..." : "Current location"}
                        </button>
                      </div>

                      {useSavedAddress && addressOptions.length > 0 ? (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                            className="w-full flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white hover:border-[#13ec5b]/50 transition focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
                          >
                            <span className="flex items-center gap-2 truncate">
                              <MapPin className="h-4 w-4 text-[#13ec5b] flex-shrink-0" />
                              <span className="truncate">{addresses.find((a) => a._id === selectedAddress)?.address || "Select an address"}</span>
                            </span>
                            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${showAddressDropdown ? "rotate-180" : ""}`} />
                          </button>
                          {showAddressDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto py-1">
                              {addressOptions.map((opt) => {
                                const addr = addresses.find((a) => a._id === opt.value);
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleAddressSelect(opt.value)}
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-between ${
                                      selectedAddress === opt.value ? "bg-[#13ec5b]/10 text-[#13ec5b]" : "text-gray-700 dark:text-gray-300"
                                    }`}
                                  >
                                    <span className="truncate">{opt.label}</span>
                                    {addr?.isDefault && <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">Default</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                          <input
                            type="text"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder={serviceType === "refill" ? "Where should we collect your cylinder?" : "Enter your delivery address"}
                            className="w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
                            disabled={isLoading}
                          />
                        </div>
                      )}

                      {showMap && (
                        <div className="mt-3 rounded-none sm:rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
                          <div className="h-56 w-full bg-gray-200 dark:bg-gray-700">
                            <MapContainer center={mapPosition} zoom={15} style={{ height: "100%", width: "100%" }} zoomControl={false} attributionControl={false}>
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                              <DraggableMarker position={markerPosition} setPosition={(pos) => { setMarkerPosition(pos); setMapPosition(pos); }} onAddressUpdate={handleMapAddressUpdate} />
                              <MapClickHandler setPosition={(pos) => { setMarkerPosition(pos); setMapPosition(pos); }} onAddressUpdate={handleMapAddressUpdate} />
                            </MapContainer>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/30 px-3 py-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between gap-2">
                            <span className="truncate">Drag the marker or tap the map</span>
                            <button type="button" onClick={() => setShowMap(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"><X className="h-4 w-4" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── Pickup/Drop-off: Station selector ───────────────── */}
                  {isPickup && (
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                          {serviceType === "refill" ? "Refill Station" : "Pickup Station"}
                        </label>
                        <button type="button" onClick={locateForPickup} disabled={isLocatingForPickup} className="text-[11px] sm:text-xs text-[#13ec5b] hover:underline flex items-center gap-1 disabled:opacity-50 flex-shrink-0">
                          <Navigation className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {isLocatingForPickup ? "Locating..." : "Refresh"}
                        </button>
                      </div>

                      {!pickupCoords ? (
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 p-4 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2 text-gray-400" />
                          We need your location to show stations near you.
                          <button type="button" onClick={locateForPickup} disabled={isLocatingForPickup} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 bg-[#13ec5b] text-white rounded-lg text-xs font-medium disabled:opacity-50">
                            {isLocatingForPickup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                            Use my location
                          </button>
                        </div>
                      ) : nearbyLoading ? (
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 p-6 text-center">
                          <Loader2 className="h-5 w-5 animate-spin text-[#13ec5b] mx-auto" />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Finding {serviceType === "refill" ? "refill" : "swap"} stations near you...</p>
                        </div>
                      ) : availableStations.length === 0 ? (
                        <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 sm:p-4 text-xs sm:text-sm text-yellow-800 dark:text-yellow-300">
                          {serviceType === "refill" ? (
                            <>No nearby refill stations found. Try switching to Home Collection.</>
                          ) : (
                            <>No nearby station has <span className="font-semibold">{cylinderSize}</span> cylinders in stock right now. Try a different size, or switch to Delivery.</>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {availableStations.map((station) => {
                            const isSelected = String(station._id) === String(selectedStationId);
                            const stock = Number(station.stock?.[cylinderSize] || 0);
                            // Fallback to name if businessName isn't provided (Flanorx vs Refill schema)
                            const displayName = station.businessName || station.name || "Station";
                            
                            return (
                              <button
                                key={station._id}
                                type="button"
                                onClick={() => setSelectedStationId(station._id)}
                                className={`w-full text-left p-3 rounded-xl border-2 transition flex items-start gap-2.5 sm:gap-3 ${
                                  isSelected ? "border-[#13ec5b] bg-[#13ec5b]/10" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 hover:border-gray-300 dark:hover:border-gray-500"
                                }`}
                              >
                                <div className={`mt-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-[#13ec5b] bg-[#13ec5b]" : "border-gray-300 dark:border-gray-500"}`}>
                                  {isSelected && <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                                    {Number.isFinite(station.distanceKm) && (
                                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">{formatDistance(station.distanceKm)}</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{station.address}</p>
                                  <div className="flex items-center gap-3 mt-1.5 text-[10px] flex-wrap">
                                    {serviceType === "swap" ? (
                                      <span className="inline-flex items-center gap-1 text-[#0f9c46] dark:text-[#13ec5b] font-medium">
                                        <Package className="h-3 w-3" /> {stock} × {cylinderSize} in stock
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                        <Droplet className="h-3 w-3" /> Refill Supported {station.cylinderPrices?.[cylinderSize] ? `· ₦${station.cylinderPrices[cylinderSize]}` : ""}
                                      </span>
                                    )}
                                    {station.phone && (
                                      <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                        <Phone className="h-3 w-3" /> {station.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── Schedule (delivery only) ────────────────── */}
                  {!isPickup && (
                    <>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {serviceType === "refill" ? "Collection Schedule" : "Delivery Schedule"}
                        </label>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <button
                            type="button"
                            onClick={() => setScheduleType("now")}
                            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition border-2 ${
                              scheduleType === "now" ? "border-[#13ec5b] bg-[#13ec5b]/10 text-[#13ec5b]" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}
                          >
                            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Now
                          </button>
                          <button
                            type="button"
                            onClick={() => setScheduleType("scheduled")}
                            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition border-2 ${
                              scheduleType === "scheduled" ? "border-[#13ec5b] bg-[#13ec5b]/10 text-[#13ec5b]" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}
                          >
                            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Schedule
                          </button>
                        </div>
                      </div>

                      {scheduleType === "scheduled" && (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-gray-50 dark:bg-gray-700/30 rounded-none sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                            <input
                              type="date"
                              value={scheduledDate}
                              onChange={(e) => setScheduledDate(e.target.value)}
                              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
                              disabled={isLoading}
                            />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
                            <input
                              type="time"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Special Instructions</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows="2"
                      placeholder="Any special instructions (e.g., gate code, landmark)"
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent resize-none"
                      disabled={isLoading}
                    />
                  </div>
                </form>
              </div>
            </div>

            {/* ─── Order Summary ────────────────────────────────── */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-[#13ec5b] flex-shrink-0" /> Order Summary
                  </h3>
                </div>

                <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                  {priceBreakdown ? (
                    <>
                      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#13ec5b]/10 flex items-center justify-center flex-shrink-0">
                          {isPickup ? <Store className="h-4 w-4 sm:h-5 sm:w-5 text-[#13ec5b]" /> : <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-[#13ec5b]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{cylinderSize} Cylinder</p>
                          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                            {quantityKg}kg gas · {isPickup ? "Drop-off" : (serviceType === "refill" ? "Collection" : "Delivery")}
                            {!isActive && serviceType === "swap" && " · New subscription"}
                            {!isActive && serviceType === "refill" && " · Refill only"}
                            {isActive && serviceType === "swap" && " · Swap"}
                            {isActive && serviceType === "refill" && " · Refill"}
                          </p>
                        </div>
                      </div>

                      {isPickup && selectedStation && (
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-700/30 px-3 py-2 text-[11px] sm:text-xs">
                          <p className="text-gray-500 dark:text-gray-400">{serviceType === "refill" ? "Drop off at" : "Pickup at"}</p>
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{selectedStation.businessName || selectedStation.name}</p>
                          <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{selectedStation.address}</p>
                        </div>
                      )}

                      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                        {priceBreakdown.cylinderCost > 0 && (
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Cylinder cost</span>
                            <span className="text-gray-900 dark:text-white flex-shrink-0">₦{priceBreakdown.cylinderCost.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500 dark:text-gray-400">Gas ({quantityKg}kg × ₦{GAS_PRICE_PER_KG})</span>
                          <span className="text-gray-900 dark:text-white flex-shrink-0">₦{priceBreakdown.gasContentCost.toFixed(2)}</span>
                        </div>
                        {!isPickup && (
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><Truck className="h-3 w-3" /> {serviceType === "refill" ? "Collection Fee" : "Delivery Fee"}</span>
                            <span className="text-gray-900 dark:text-white flex-shrink-0">₦{priceBreakdown.deliveryFee.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500 dark:text-gray-400">Service Tax (1%)</span>
                          <span className="text-gray-900 dark:text-white flex-shrink-0">₦{priceBreakdown.serviceTax.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Total</span>
                          <span className="text-xl sm:text-2xl font-bold text-[#13ec5b] truncate">₦{priceBreakdown.total.toFixed(2)}</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {isPickup ? "No fee for station drop-off" : "Includes fee and tax"}
                        </p>
                      </div>

                      <div className="flex items-start gap-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 px-3 py-2 rounded-lg">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#13ec5b] flex-shrink-0 mt-0.5" />
                        {isPickup ? (
                          <span>{serviceType === "refill" ? "Drop off your cylinder — we'll notify you when it's ready" : "Ready for pickup shortly after payment"}</span>
                        ) : scheduleType === "now" ? (
                          <span>{serviceType === "refill" ? "Estimated return: 60–90 minutes (includes refill time)" : "Estimated delivery: 30–45 minutes"}</span>
                        ) : (
                          <span>Scheduled for {scheduledDate || "selected date"}</span>
                        )}
                      </div>

                      {!isActive && serviceType === "swap" && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 sm:p-3 text-[11px] sm:text-xs text-blue-700 dark:text-blue-300">
                          <p className="font-medium">Cylinder subscription included</p>
                          <p className="mt-1">Valid for 30 days. 6-day grace period to renew.</p>
                        </div>
                      )}

                      {isActive && !isSizeChange && serviceType === "swap" && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5 sm:p-3 text-[11px] sm:text-xs text-green-700 dark:text-green-300">
                          <p className="font-medium">Gas Swap</p>
                          <p className="mt-1">You're ordering gas content only — swap your empty cylinder for a full one.</p>
                        </div>
                      )}

                      {!isSizeChange && serviceType === "refill" && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 sm:p-3 text-[11px] sm:text-xs text-blue-700 dark:text-blue-300">
                          <p className="font-medium">Cylinder Refill</p>
                          <p className="mt-1">We'll collect your cylinder, refill it, and return it full — you keep your own cylinder.</p>
                        </div>
                      )}

                      {isSizeChange && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2.5 sm:p-3 text-[11px] sm:text-xs text-yellow-700 dark:text-yellow-300">
                          <p className="font-medium">Cylinder change required</p>
                          <p className="mt-1">First change your plan on the subscription page.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || !priceBreakdown || isSizeChange || (isPickup && !selectedStationId)}
                    className="w-full py-3 sm:py-3.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white font-bold rounded-xl transition duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" /> Processing...
                      </>
                    ) : (
                      ctaLabel()
                    )}
                  </button>

                  <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">Secure payment via Paystack</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Bottombar />
    </div>
  );
};

export default Gas;