// pages/Fuel.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  Fuel as FuelIcon,
  Flame,
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
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCreateOrderMutation } from "../features/orderApiSlice";
import { useGetProfileQuery } from "../features/userApiSlice";
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

// ─── Draggable marker ─────────────────────────────────────
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

  return (
    <Marker
      draggable
      position={position}
      icon={greenIcon}
      ref={markerRef}
      eventHandlers={eventHandlers}
    />
  );
};

// ─── Map click handler ────────────────────────────────────
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

// ─── Fly to location ──────────────────────────────────────
const FlyToLocation = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16);
  }, [map, position]);
  return null;
};

const Fuel = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const { data: user, isLoading: userLoading } = useGetProfileQuery();
  const [createOrder, { isLoading: orderLoading }] = useCreateOrderMutation();

  // ─── Form state ──────────────────────────────────────────────
  const [fuelType, setFuelType] = useState("Petrol");
  const [quantity, setQuantity] = useState(10);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [scheduleType, setScheduleType] = useState("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [showFuelDropdown, setShowFuelDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  // ─── Map state ──────────────────────────────────────────────
  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState([6.5244, 3.3792]);
  const [markerPosition, setMarkerPosition] = useState([6.5244, 3.3792]);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─── Fuel prices ──────────────────────────────────────────
  const fuelPrices = {
    Petrol: 10,
    "Petrol (95 Octane)": 850,
    Diesel: 1320,
  };

  // ─── Calculate price ──────────────────────────────────────
  useEffect(() => {
    const pricePerLiter = fuelPrices[fuelType] || 0;
    const subtotal = pricePerLiter * quantity;
    const deliveryFee = 4.99;
    const serviceTax = subtotal * 0.05;
    const total = subtotal + deliveryFee + serviceTax;
    setPriceBreakdown({
      pricePerLiter,
      subtotal,
      deliveryFee,
      serviceTax,
      total,
    });
  }, [fuelType, quantity]);

  // ─── Addresses ────────────────────────────────────────────
  const addresses = user?.addresses || [];
  const defaultAddress = addresses.find((a) => a.isDefault);
  const addressOptions = addresses.map((a) => ({
    label: a.address,
    value: a._id,
  }));

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

  const handleFuelSelect = (type) => {
    setFuelType(type);
    setShowFuelDropdown(false);
  };

  // ─── Map handlers ────────────────────────────────────────
  const handleMapAddressUpdate = (addr) => {
    if (addr) {
      setDeliveryAddress(addr);
      setUseSavedAddress(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPos = [latitude, longitude];
        setMapPosition(newPos);
        setMarkerPosition(newPos);
        setUserLocation(newPos);
        reverseGeocode(latitude, longitude).then((addr) => {
          if (addr) {
            setDeliveryAddress(addr);
            setUseSavedAddress(false);
          }
        });
        setIsLocating(false);
        if (!showMap) setShowMap(true);
      },
      (err) => {
        setError("Unable to fetch location: " + err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // ─── Submit ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!deliveryAddress.trim()) {
      setError("Please provide a delivery address");
      return;
    }
    if (quantity < 5 || quantity > 500) {
      setError("Quantity must be between 5 and 500 liters");
      return;
    }
    if (scheduleType === "scheduled" && (!scheduledDate || !scheduledTime)) {
      setError("Please select both date and time for scheduled delivery");
      return;
    }

    try {
      const orderData = {
        orderType: "fuel",
        fuelType,
        quantity: Number(quantity),
        deliveryAddress: deliveryAddress.trim(),
        scheduleType,
        scheduledDate: scheduleType === "scheduled" ? scheduledDate : undefined,
        scheduledTime: scheduleType === "scheduled" ? scheduledTime : undefined,
        notes: notes.trim() || undefined,
        subtotal: priceBreakdown.subtotal,
        deliveryFee: priceBreakdown.deliveryFee,
        serviceTax: priceBreakdown.serviceTax,
        totalAmount: priceBreakdown.total,
        estimatedDeliveryMinutes: scheduleType === "now" ? 30 : undefined,
      };

      const result = await createOrder(orderData).unwrap();
      setSuccess("Order placed! Redirecting to payment...");
      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        setTimeout(() => navigate("/orders"), 2000);
      }
    } catch (err) {
      setError(err.data?.message || err.message || "Failed to place order");
    }
  };

  const isLoading = userLoading || orderLoading;
  const fuelTypes = ["Petrol", "Petrol (95 Octane)", "Diesel"];
  const quantityPresets = [10, 20, 30, 50];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
            Order Fuel
          </h1>
          <button
            onClick={() => navigate("/orders")}
            className="text-sm text-[#13ec5b] hover:underline"
          >
            View Orders
          </button>
        </header>

        {/* ─── Full-width container ────────────────────────────── */}
        <div className="w-full px-1 sm:px-4 lg:px-6 py-4 lg:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {/* ─── Main form ─────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FuelIcon className="h-5 w-5 text-[#13ec5b]" />
                    Fuel Delivery
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    We bring the pump to you – skip the queue.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800 flex items-center gap-2">
                      <span>⚠️</span>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm border border-green-200 dark:border-green-800 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      {success}
                    </div>
                  )}

                  {/* ─── Fuel Type ─────────────────────────────── */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fuel Type
                    </label>

                    {/* Mobile: grid buttons (3 columns) */}
                    <div className="lg:hidden grid grid-cols-3 gap-2">
                      {fuelTypes.map((type) => {
                        const isSelected = fuelType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleFuelSelect(type)}
                            className={`py-2.5 px-1 rounded-xl text-sm font-medium transition-all border-2 ${
                              isSelected
                                ? "border-[#13ec5b] bg-[#13ec5b] text-white shadow-lg shadow-[#13ec5b]/20"
                                : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}
                          >
                            <div className="font-semibold text-xs sm:text-sm">
                              {type === "Petrol (95 Octane)" ? "95 Octane" : type}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Desktop: dropdown */}
                    <div className="hidden lg:block relative">
                      <button
                        type="button"
                        onClick={() => setShowFuelDropdown(!showFuelDropdown)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white hover:border-[#13ec5b]/50 transition focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
                      >
                        <span className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-[#13ec5b]" />
                          {fuelType}
                        </span>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showFuelDropdown ? "rotate-180" : ""}`} />
                      </button>

                      {showFuelDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                          {fuelTypes.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => handleFuelSelect(type)}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                                fuelType === type
                                  ? "bg-[#13ec5b]/10 text-[#13ec5b]"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ─── Quantity ───────────────────────────────── */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantity (liters)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {quantityPresets.map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setQuantity(qty)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                            quantity === qty
                              ? "bg-[#13ec5b] text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          {qty}L
                        </button>
                      ))}
                      <button
                        type="button"
                        className="px-4 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        Custom
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="5"
                        max="500"
                        step="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#13ec5b]"
                        disabled={isLoading}
                      />
                      <span className="text-lg font-bold text-[#13ec5b] min-w-[60px] text-right">
                        {quantity}L
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Min 5L · Max 500L
                    </p>
                  </div>

                  {/* ─── Delivery Address ───────────────────────── */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Delivery Address
                    </label>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {addresses.length > 0 && (
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <input
                            type="checkbox"
                            checked={useSavedAddress}
                            onChange={() => setUseSavedAddress(!useSavedAddress)}
                            className="rounded border-gray-300 text-[#13ec5b] focus:ring-[#13ec5b]/50 h-4 w-4"
                          />
                          Saved address
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowMap(!showMap)}
                        className="text-sm text-[#13ec5b] hover:underline flex items-center gap-1"
                      >
                        <MapPin className="h-4 w-4" />
                        {showMap ? "Hide map" : "Pick on map"}
                      </button>
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={isLocating}
                        className="text-sm text-[#13ec5b] hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        <Navigation className="h-4 w-4" />
                        {isLocating ? "Locating..." : "Current location"}
                      </button>
                    </div>

                    {useSavedAddress && addressOptions.length > 0 ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white hover:border-[#13ec5b]/50 transition focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <MapPin className="h-4 w-4 text-[#13ec5b] flex-shrink-0" />
                            <span className="truncate">
                              {addresses.find((a) => a._id === selectedAddress)?.address ||
                                "Select an address"}
                            </span>
                          </span>
                          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showAddressDropdown ? "rotate-180" : ""}`} />
                        </button>

                        {showAddressDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto py-1">
                            {addressOptions.map((opt) => {
                              const addr = addresses.find((a) => a._id === opt.value);
                              const isDefault = addr?.isDefault;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleAddressSelect(opt.value)}
                                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-between ${
                                    selectedAddress === opt.value
                                      ? "bg-[#13ec5b]/10 text-[#13ec5b]"
                                      : "text-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  <span className="truncate">{opt.label}</span>
                                  {isDefault && (
                                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                      Default
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Enter your delivery address"
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
                          disabled={isLoading}
                        />
                      </div>
                    )}

                    {/* ─── Map ───────────────────────────────────── */}
                    {showMap && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
                        <div className="h-56 w-full bg-gray-200 dark:bg-gray-700 relative">
                          <MapContainer
                            center={mapPosition}
                            zoom={15}
                            style={{ height: "100%", width: "100%" }}
                            zoomControl={false}
                            attributionControl={false}
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            <DraggableMarker
                              position={markerPosition}
                              setPosition={(pos) => {
                                setMarkerPosition(pos);
                                setMapPosition(pos);
                              }}
                              onAddressUpdate={handleMapAddressUpdate}
                            />
                            {userLocation && (
                              <Marker position={userLocation} icon={blueIcon} interactive={false} />
                            )}
                            <MapClickHandler
                              setPosition={(pos) => {
                                setMarkerPosition(pos);
                                setMapPosition(pos);
                              }}
                              onAddressUpdate={handleMapAddressUpdate}
                            />
                            <FlyToLocation position={userLocation} />
                          </MapContainer>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                          <span>Drag the green marker or tap the map to set location</span>
                          <button
                            type="button"
                            onClick={() => setShowMap(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─── Schedule ───────────────────────────────── */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Delivery Schedule
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setScheduleType("now")}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition border-2 ${
                          scheduleType === "now"
                            ? "border-[#13ec5b] bg-[#13ec5b]/10 text-[#13ec5b]"
                            : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                        }`}
                      >
                        <Zap className="h-4 w-4" />
                        Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduleType("scheduled")}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition border-2 ${
                          scheduleType === "scheduled"
                            ? "border-[#13ec5b] bg-[#13ec5b]/10 text-[#13ec5b]"
                            : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                        }`}
                      >
                        <Calendar className="h-4 w-4" />
                        Schedule
                      </button>
                    </div>
                  </div>

                  {scheduleType === "scheduled" && (
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Time
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Special Instructions
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows="2"
                      placeholder="Any special instructions for delivery (e.g., gate code, landmark)"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent resize-none"
                      disabled={isLoading}
                    />
                  </div>
                </form>
              </div>
            </div>

            {/* ─── Order Summary ────────────────────────────────── */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-[#13ec5b]" />
                    Order Summary
                  </h3>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  {priceBreakdown ? (
                    <>
                      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-xl bg-[#13ec5b]/10 flex items-center justify-center">
                          <Flame className="h-5 w-5 text-[#13ec5b]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {fuelType}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {quantity} liters
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">
                            Fuel ({quantity}L × ₦{priceBreakdown.pricePerLiter.toFixed(2)})
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            ₦{priceBreakdown.subtotal.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            Delivery Fee
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            ₦{priceBreakdown.deliveryFee.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Service Tax (5%)</span>
                          <span className="text-gray-900 dark:text-white">
                            ₦{priceBreakdown.serviceTax.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            Total
                          </span>
                          <span className="text-2xl font-bold text-[#13ec5b]">
                            ₦{priceBreakdown.total.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Includes delivery fee and tax
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 px-3 py-2 rounded-lg">
                        <Clock className="h-4 w-4 text-[#13ec5b]" />
                        {scheduleType === "now" ? (
                          <span>Estimated delivery: 30-45 minutes</span>
                        ) : (
                          <span>Scheduled for {scheduledDate || "selected date"}</span>
                        )}
                      </div>
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
                    disabled={isLoading || !priceBreakdown}
                    className="w-full py-3.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white font-bold rounded-xl transition duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-base"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      "Place Order & Pay"
                    )}
                  </button>

                  <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                    Secure payment via Paystack
                  </p>
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

export default Fuel;