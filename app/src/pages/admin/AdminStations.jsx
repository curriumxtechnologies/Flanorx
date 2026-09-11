// src/pages/admin/AdminStations.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Store,
  Plus,
  Search,
  RefreshCw,
  MapPin,
  Package,
  X,
  ChevronDown,
  Eye,
  Trash2,
  AlertCircle,
  Edit3,
  UserCog,
  Users,
  Truck,
  Phone,
  CheckCircle2,
  ArrowUpDown,
  History,
  Loader2,
  Navigation,
  Check,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  useGetStationsOverviewQuery,
  useCreateStationMutation,
  useUpdateStationMutation,
  useDeleteStationMutation,
  useAssignStationAdminMutation,
  useAdminAddStationRiderMutation,
  useAdminRemoveStationRiderMutation,
  useAdminAdjustStockMutation,
  useAdminGetStationLogsQuery,
  useGetStationByIdQuery,
  useAddStationTeamMemberMutation,
  useRemoveStationTeamMemberMutation,
} from "../../features/stationApiSlice";
import {
  useGetAllUsersQuery,
  useGetAllRidersQuery,
} from "../../features/adminApiSlice";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminBottombar from "../../components/admin/Bottombar";

// ─── Leaflet icon fix ─────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const greenIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const CYLINDER_SIZES = ["3kg", "6kg", "12kg"];
const LOW_STOCK_THRESHOLD = 5;
const SEARCH_RESULT_LIMIT = 50;
const GEOCODE_DEBOUNCE_MS = 800;

// ═══════════════════════════════════════════════════════════
//  Geocoding (OpenStreetMap Nominatim — free, no key)
// ═══════════════════════════════════════════════════════════

// Address → coordinates
const forwardGeocode = async (address) => {
  const q = (address || "").trim();
  if (q.length < 5) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q
      )}&limit=1&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const top = data[0];
      return {
        lat: Number(top.lat),
        lng: Number(top.lon),
        displayName: top.display_name,
      };
    }
    return null;
  } catch {
    return null;
  }
};

// Coordinates → address
const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json();
    if (data && data.display_name) return data.display_name;
    return null;
  } catch {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════
//  Leaflet sub-components
// ═══════════════════════════════════════════════════════════

// Draggable marker + click on map → onPick([lat, lng])
const LocationPicker = ({ position, onPick }) => {
  const markerRef = useRef(null);

  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? (
    <Marker
      draggable
      position={position}
      icon={greenIcon}
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const m = markerRef.current;
          if (m) {
            const ll = m.getLatLng();
            onPick([ll.lat, ll.lng]);
          }
        },
      }}
    />
  ) : null;
};

// Recenter map when `trigger` changes (0 = don't run on mount)
const MapRecenter = ({ position, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (position && trigger > 0) {
      map.flyTo(position, Math.max(map.getZoom(), 14), { duration: 1.2 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
};

// ═══════════════════════════════════════════════════════════
//  SimpleDropdown
// ═══════════════════════════════════════════════════════════
const SimpleDropdown = ({ value, options, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#13ec5b]/50 disabled:opacity-60"
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 max-h-60 overflow-auto py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition truncate ${
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

// ═══════════════════════════════════════════════════════════
//  SearchableUserSelect
// ═══════════════════════════════════════════════════════════
const SearchableUserSelect = ({
  value,
  options,
  onChange,
  placeholder = "Search by name or email...",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, SEARCH_RESULT_LIMIT);
    return options
      .filter((o) => {
        const name = (o.name || "").toLowerCase();
        const email = (o.email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      })
      .slice(0, SEARCH_RESULT_LIMIT);
  }, [options, query]);

  const totalMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.length;
    return options.filter((o) => {
      const name = (o.name || "").toLowerCase();
      const email = (o.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    }).length;
  }, [options, query]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const handleSelect = (opt) => {
    onChange(opt.value);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(true)}
        className={`w-full flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border rounded-lg text-sm transition ${
          isOpen
            ? "border-[#13ec5b] ring-2 ring-[#13ec5b]/50"
            : "border-gray-200 dark:border-gray-600"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-text"}`}
      >
        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />

        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
          />
        ) : (
          <span
            className={`flex-1 min-w-0 truncate ${
              selected
                ? "text-gray-900 dark:text-white"
                : "text-gray-400 dark:text-gray-500"
            }`}
            title={selected?.email || selected?.name || ""}
          >
            {selected
              ? `${selected.name || selected.email} — ${selected.email}`
              : placeholder}
          </span>
        )}

        {selected && !isOpen && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0 disabled:opacity-50"
            title="Clear selection"
          >
            <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
          </button>
        )}

        <ChevronDown
          className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 max-h-72 overflow-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {query.trim()
                  ? "No users match your search"
                  : "No users available"}
              </p>
              {query.trim() && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Try a different name or email
                </p>
              )}
            </div>
          ) : (
            <>
              {results.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 ${
                    opt.value === value ? "bg-[#13ec5b]/10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`truncate font-medium ${
                        opt.value === value
                          ? "text-[#0f9c46] dark:text-[#13ec5b]"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {opt.name || opt.email}
                    </p>
                    {opt.sublabel && (
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {opt.email}
                  </p>
                </button>
              ))}
              {totalMatches > results.length && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 text-center">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Showing {results.length} of {totalMatches}. Keep typing to
                    narrow.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  ConfirmDialog
// ═══════════════════════════════════════════════════════════
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => !loading && onCancel()}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              danger ? "bg-red-100 dark:bg-red-900/30" : "bg-[#13ec5b]/10"
            }`}
          >
            <AlertCircle
              className={`h-5 w-5 ${
                danger ? "text-red-600 dark:text-red-400" : "text-[#13ec5b]"
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 text-white rounded-lg font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Working...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Main component
// ═══════════════════════════════════════════════════════════
const AdminStations = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [detailStationId, setDetailStationId] = useState(null);
  const [adjustingStock, setAdjustingStock] = useState(null);
  const [viewingLogs, setViewingLogs] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
    isFetching: overviewFetching,
  } = useGetStationsOverviewQuery(undefined, {
    pollingInterval: 30000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const { data: allUsers = [], isLoading: usersLoading } = useGetAllUsersQuery({
    role: "user",
  });
  const { data: allRiders = [] } = useGetAllRidersQuery();

  const [deleteStation, { isLoading: deleting }] = useDeleteStationMutation();

  const stations = overview?.stations || [];
  const totals = overview?.totals || {};

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stations.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.name?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.admin?.name?.toLowerCase().includes(q) ||
        s.admin?.email?.toLowerCase().includes(q)
      );
    });
  }, [stations, search, statusFilter]);

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteStation(confirmDelete._id).unwrap();
      toast.success("Station deactivated");
      setConfirmDelete(null);
      refetchOverview();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to deactivate station");
    }
  };

  if (overviewError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Pickup Stations
            </h1>
          </header>
          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">
                Failed to load stations
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {overviewError?.data?.message ||
                  overviewError?.message ||
                  "Please try again"}
              </p>
            </div>
          </div>
        </div>
        <AdminBottombar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Pickup Stations
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => refetchOverview()}
              disabled={overviewFetching}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50 hidden lg:flex"
              title="Refresh"
            >
              <RefreshCw
                className={`h-5 w-5 text-gray-500 dark:text-gray-400 ${
                  overviewFetching ? "animate-spin" : ""
                }`}
              />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg text-sm font-semibold transition"
            >
              <Plus className="h-4 w-4" />
              New Station
            </button>
          </div>
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          {/* Mobile Hero */}
          <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4 shadow-sm">
            {overviewLoading ? (
              <>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-2.5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                </div>
                <div className="flex items-end justify-between mb-3 gap-2">
                  <div className="min-w-0 space-y-2">
                    <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                  <div className="text-right min-w-0 space-y-2">
                    <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 gap-2">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-3.5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-3.5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex-shrink-0" />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Pickup Stations
                    </span>
                    <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white">
                      Station Network
                    </h1>
                  </div>
                  <button
                    onClick={() => refetchOverview()}
                    disabled={overviewFetching}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex-shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        overviewFetching ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-end justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total Stations
                    </span>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {totals.totalStations || 0}
                    </p>
                  </div>
                  <div className="text-right min-w-0">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Today's Revenue
                    </span>
                    <p
                      className="text-xl font-bold text-gray-900 dark:text-white truncate"
                      title={`₦${(totals.totalTodayRevenue || 0).toFixed(2)}`}
                    >
                      ₦{((totals.totalTodayRevenue || 0) / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 gap-2">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="min-w-0">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        Active
                      </span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {totals.activeStations || 0}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        Low Stock
                      </span>
                      <p
                        className={`text-sm font-bold truncate ${
                          totals.stationsWithLowStock > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {totals.stationsWithLowStock || 0}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1 text-xs font-medium text-gray-900 bg-[#13ec5b] hover:bg-[#10d04e] px-3 py-1.5 rounded-lg border border-[#13ec5b] transition shadow-sm flex-shrink-0"
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Desktop Stats */}
          <div className="hidden lg:grid grid-cols-4 gap-4 mb-6">
            {overviewLoading
              ? [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                      <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                    </div>
                  </div>
                ))
              : (
                <>
                  <StatCard
                    label="Total Stations"
                    value={totals.totalStations || 0}
                    icon={Store}
                  />
                  <StatCard
                    label="Active"
                    value={totals.activeStations || 0}
                    icon={CheckCircle2}
                  />
                  <StatCard
                    label="Today's Revenue"
                    value={`₦${(totals.totalTodayRevenue || 0).toFixed(2)}`}
                    icon={ArrowUpDown}
                  />
                  <StatCard
                    label="Low Stock"
                    value={totals.stationsWithLowStock || 0}
                    icon={AlertCircle}
                    danger={totals.stationsWithLowStock > 0}
                  />
                </>
              )}
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search stations by name, address, or admin..."
                  autoComplete="off"
                  className="w-full pl-9 pr-9 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {["all", "active", "inactive", "suspended"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition ${
                      statusFilter === s
                        ? "bg-[#13ec5b] text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {s === "all" ? "All" : s}
                  </button>
                ))}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stations list */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                {filtered.length}{" "}
                {filtered.length === 1 ? "Station" : "Stations"}
                {hasActiveFilters && (
                  <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-2">
                    filtered from {stations.length}
                  </span>
                )}
              </h2>
            </div>

            {overviewLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-4 animate-pulse"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                      <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Store className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {hasActiveFilters
                    ? "No stations match your filters"
                    : "No stations yet"}
                </p>
                {hasActiveFilters ? (
                  <button
                    onClick={clearFilters}
                    className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
                  >
                    Clear filters
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
                  >
                    Create your first station
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-[22%]" />
                      <col className="w-[18%]" />
                      <col className="w-[20%]" />
                      <col className="w-[14%]" />
                      <col className="w-[10%]" />
                      <col className="w-[16%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Station
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Admin
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Stock
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Today
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Status
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((station) => (
                        <StationRow
                          key={station._id}
                          station={station}
                          onView={() => setDetailStationId(station._id)}
                          onEdit={() => setEditingStation(station)}
                          onDelete={() => setConfirmDelete(station)}
                          onAdjustStock={(size) =>
                            setAdjustingStock({ station, cylinderSize: size })
                          }
                          onViewLogs={() => setViewingLogs(station)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map((station) => (
                    <StationSlimCard
                      key={station._id}
                      station={station}
                      onClick={() => setDetailStationId(station._id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AdminBottombar />

      {showCreateModal && (
        <StationFormModal
          mode="create"
          allUsers={allUsers}
          usersLoading={usersLoading}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            refetchOverview();
          }}
        />
      )}

      {editingStation && (
        <StationFormModal
          mode="edit"
          station={editingStation}
          allUsers={allUsers}
          usersLoading={usersLoading}
          onClose={() => setEditingStation(null)}
          onSaved={() => {
            setEditingStation(null);
            refetchOverview();
          }}
        />
      )}

      {detailStationId && (
        <StationDetailModal
          stationId={detailStationId}
          allUsers={allUsers}
          allRiders={allRiders}
          onClose={() => {
            setDetailStationId(null);
            refetchOverview();
          }}
        />
      )}

      {adjustingStock && (
        <AdjustStockModal
          station={adjustingStock.station}
          initialSize={adjustingStock.cylinderSize}
          onClose={() => setAdjustingStock(null)}
          onSaved={() => {
            setAdjustingStock(null);
            refetchOverview();
          }}
        />
      )}

      {viewingLogs && (
        <StockLogsModal
          station={viewingLogs}
          onClose={() => setViewingLogs(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Deactivate this station?"
        message={
          confirmDelete
            ? `"${confirmDelete.name}" will be marked inactive. Existing orders will still be handled, but the station won't receive new gas orders.`
            : ""
        }
        confirmLabel="Deactivate"
        danger
        loading={deleting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Stat Card
// ═══════════════════════════════════════════════════════════
const StatCard = ({ label, value, icon: Icon, danger = false }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
    <div className="flex items-center justify-between gap-2 min-w-0">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
          {label}
        </p>
        <p
          className={`text-xl lg:text-2xl font-bold mt-1 truncate ${
            danger
              ? "text-red-600 dark:text-red-400"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {value}
        </p>
      </div>
      <div
        className={`p-2 rounded-lg flex-shrink-0 ${
          danger
            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            : "bg-[#13ec5b]/10 text-[#13ec5b]"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
//  Station Row (desktop)
// ═══════════════════════════════════════════════════════════
const StationRow = ({
  station,
  onView,
  onEdit,
  onDelete,
  onAdjustStock,
  onViewLogs,
}) => {
  const hasLowStock = CYLINDER_SIZES.some(
    (s) => (station.stock?.[s] || 0) < LOW_STOCK_THRESHOLD
  );

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition last:border-b-0">
      <td className="py-3 px-3">
        <button
          onClick={onView}
          className="text-left w-full group"
          title={station.name}
        >
          <p className="font-medium text-gray-900 dark:text-white truncate group-hover:text-[#0f9c46] dark:group-hover:text-[#13ec5b] transition">
            {station.name}
          </p>
          <p
            className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5"
            title={station.address}
          >
            {station.address}
          </p>
        </button>
      </td>
      <td className="py-3 px-3">
        {station.admin ? (
          <div className="min-w-0">
            <p className="text-gray-900 dark:text-white truncate text-sm">
              {station.admin.name || "—"}
            </p>
            <p
              className="text-xs text-gray-500 dark:text-gray-400 truncate"
              title={station.admin.email}
            >
              {station.admin.email}
            </p>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
            <AlertCircle className="h-3 w-3" />
            No admin
          </span>
        )}
      </td>
      <td className="py-3 px-3">
        <div className="flex flex-wrap gap-1">
          {CYLINDER_SIZES.map((size) => {
            const count = station.stock?.[size] || 0;
            const low = count < LOW_STOCK_THRESHOLD;
            return (
              <button
                key={size}
                onClick={() => onAdjustStock(size)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition ${
                  low
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
                title={`${size}: ${count} cylinders — click to adjust`}
              >
                <Package className="h-3 w-3" />
                {size}: {count}
              </button>
            );
          })}
        </div>
        {hasLowStock && (
          <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">
            Low stock on some sizes
          </p>
        )}
      </td>
      <td className="py-3 px-3">
        <p className="text-gray-900 dark:text-white font-medium text-sm">
          ₦{(station.stats?.todayRevenue || 0).toFixed(2)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {station.stats?.todayOrders || 0} orders ·{" "}
          {station.stats?.openOrders || 0} open
        </p>
      </td>
      <td className="py-3 px-3">
        <StatusBadge status={station.status} />
      </td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onView}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="View details"
          >
            <Eye className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={onViewLogs}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Stock history"
          >
            <History className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Edit station"
          >
            <Edit3 className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-500"
            title="Deactivate"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ═══════════════════════════════════════════════════════════
//  Station Slim Card (mobile)
// ═══════════════════════════════════════════════════════════
const StationSlimCard = ({ station, onClick }) => {
  const totalStock = CYLINDER_SIZES.reduce(
    (sum, s) => sum + (station.stock?.[s] || 0),
    0
  );
  const hasLowStock = CYLINDER_SIZES.some(
    (s) => (station.stock?.[s] || 0) < LOW_STOCK_THRESHOLD
  );

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 transition"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {station.name}
          </span>
          <StatusBadge status={station.status} />
          {hasLowStock && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 flex-shrink-0">
              <AlertCircle className="h-2.5 w-2.5" />
              Low
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400 min-w-0">
          <span className="truncate">
            {station.admin?.name || "No admin assigned"}
          </span>
          <span>·</span>
          <span className="flex-shrink-0">{totalStock} cylinders</span>
        </div>
      </div>
      <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg] flex-shrink-0 ml-2" />
    </button>
  );
};

// ═══════════════════════════════════════════════════════════
//  Status Badge
// ═══════════════════════════════════════════════════════════
const StatusBadge = ({ status }) => {
  const styles = {
    active:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
        styles[status] || styles.inactive
      }`}
    >
      {status}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════
//  Station Form Modal (create + edit)
//  Address ⇄ Coordinates fully synced via Nominatim
// ═══════════════════════════════════════════════════════════
const StationFormModal = ({
  mode,
  station,
  allUsers = [],
  usersLoading = false,
  onClose,
  onSaved,
}) => {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(() => ({
    name: station?.name || "",
    address: station?.address || "",
    lat: station?.coordinates?.lat ?? 6.5244,
    lng: station?.coordinates?.lng ?? 3.3792,
    phone: station?.phone || "",
    email: station?.email || "",
    operatingHours: station?.operatingHours || "",
    status: station?.status || "active",
    adminId: station?.admin?._id || "",
  }));
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(isEdit); // open by default when editing
  const [geocodeStatus, setGeocodeStatus] = useState("idle"); // idle | searching | found | notfound
  const [isLocating, setIsLocating] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);

  // Geocode timer + last address we successfully geocoded (loop guard)
  const geocodeTimerRef = useRef(null);
  const lastSyncedAddressRef = useRef(isEdit ? station?.address || "" : "");

  const [createStation, { isLoading: creating }] = useCreateStationMutation();
  const [updateStation, { isLoading: updating }] = useUpdateStationMutation();
  const [assignAdmin, { isLoading: assigning }] =
    useAssignStationAdminMutation();

  const isSubmitting = creating || updating || assigning;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    };
  }, []);

  // ─── Address → coordinates (debounced) ──────────────────
  const handleAddressChange = (value) => {
    setForm((f) => ({ ...f, address: value }));

    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 5) {
      setGeocodeStatus("idle");
      return;
    }
    if (trimmed === lastSyncedAddressRef.current) {
      // Same string we already geocoded — don't re-fire
      return;
    }

    setGeocodeStatus("idle");
    geocodeTimerRef.current = setTimeout(async () => {
      setGeocodeStatus("searching");
      const result = await forwardGeocode(trimmed);
      if (result) {
        lastSyncedAddressRef.current = trimmed;
        setForm((f) => ({ ...f, lat: result.lat, lng: result.lng }));
        setRecenterKey((k) => k + 1);
        setGeocodeStatus("found");
        if (!showMap) setShowMap(true);
      } else {
        setGeocodeStatus("notfound");
      }
    }, GEOCODE_DEBOUNCE_MS);
  };

  // ─── Map pick → address (reverse geocode) ───────────────
  const handleMapPick = async ([lat, lng]) => {
    // Cancel any pending forward geocode — we're overriding it
    if (geocodeTimerRef.current) {
      clearTimeout(geocodeTimerRef.current);
      geocodeTimerRef.current = null;
    }
    setForm((f) => ({ ...f, lat, lng }));
    setGeocodeStatus("searching");

    const addr = await reverseGeocode(lat, lng);
    if (addr) {
      lastSyncedAddressRef.current = addr.trim();
      setForm((f) => ({ ...f, address: addr }));
      setGeocodeStatus("found");
    } else {
      setGeocodeStatus("notfound");
    }
  };

  // ─── Manual lat/lng edits (no geocode, just update) ─────
  const handleLatChange = (value) => {
    setForm((f) => ({ ...f, lat: value }));
    setGeocodeStatus("idle");
  };
  const handleLngChange = (value) => {
    setForm((f) => ({ ...f, lng: value }));
    setGeocodeStatus("idle");
  };

  // ─── Use current location ────────────────────────────────
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await handleMapPick([latitude, longitude]);
        setShowMap(true);
        setRecenterKey((k) => k + 1);
        setIsLocating(false);
      },
      (err) => {
        toast.error("Unable to get location: " + err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // ─── Admin candidates ───────────────────────────────────
  const adminOptions = useMemo(() => {
    return allUsers
      .filter((u) => {
        if (u.role === "admin") return false;
        const userStationId = u.station?._id || u.station;
        if (userStationId && String(userStationId) !== String(station?._id)) {
          return false;
        }
        return true;
      })
      .map((u) => ({
        value: u._id,
        name: u.name || "",
        email: u.email || "",
      }));
  }, [allUsers, station?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Station name is required");
      return;
    }
    if (!form.address.trim()) {
      setError("Address is required");
      return;
    }
    if (
      !Number.isFinite(Number(form.lat)) ||
      !Number.isFinite(Number(form.lng))
    ) {
      setError("Valid coordinates are required");
      return;
    }

    try {
      if (isEdit) {
        await updateStation({
          id: station._id,
          name: form.name.trim(),
          address: form.address.trim(),
          coordinates: { lat: Number(form.lat), lng: Number(form.lng) },
          phone: form.phone,
          email: form.email,
          operatingHours: form.operatingHours,
          status: form.status,
        }).unwrap();

        if (
          form.adminId &&
          String(form.adminId) !== String(station.admin?._id || "")
        ) {
          await assignAdmin({
            id: station._id,
            userId: form.adminId,
          }).unwrap();
        }

        toast.success("Station updated");
      } else {
        await createStation({
          name: form.name.trim(),
          address: form.address.trim(),
          coordinates: { lat: Number(form.lat), lng: Number(form.lng) },
          phone: form.phone,
          email: form.email,
          operatingHours: form.operatingHours,
          adminId: form.adminId || undefined,
        }).unwrap();
        toast.success("Station created");
      }
      onSaved();
    } catch (err) {
      setError(err?.data?.message || err?.message || "Failed to save station");
    }
  };

  const mapPosition = [
    Number(form.lat) || 6.5244,
    Number(form.lng) || 3.3792,
  ];

  // ─── Geocode status pill ────────────────────────────────
  const StatusPill = () => {
    if (geocodeStatus === "searching") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Searching…
        </span>
      );
    }
    if (geocodeStatus === "found") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-[#0f9c46] dark:text-[#13ec5b]">
          <Check className="h-3 w-3" />
          Location set
        </span>
      );
    }
    if (geocodeStatus === "notfound") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="h-3 w-3" />
          Couldn't find it — try the map
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
              {isEdit ? "Edit Station" : "New Station"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isEdit
                ? "Update station details"
                : "Create a new pickup / fulfillment station"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        >
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Station name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g. Lekki Phase 1 Station"
              autoComplete="off"
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
            />
          </div>

          {/* Address (with status pill) */}
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                Address *
              </label>
              <StatusPill />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              <textarea
                value={form.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="Start typing — we'll find the coordinates automatically"
                rows={2}
                disabled={isSubmitting}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none resize-none disabled:opacity-60"
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              We use OpenStreetMap to look up the location. If it's off, tap
              the map or use your current location.
            </p>
          </div>

          {/* Coordinates header + actions */}
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                Coordinates *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={isSubmitting || isLocating}
                  className="text-xs text-[#0f9c46] dark:text-[#13ec5b] hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {isLocating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Navigation className="h-3 w-3" />
                  )}
                  {isLocating ? "Locating..." : "Use my location"}
                </button>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <button
                  type="button"
                  onClick={() => setShowMap((v) => !v)}
                  className="text-xs text-[#0f9c46] dark:text-[#13ec5b] hover:underline flex items-center gap-1"
                >
                  <MapPin className="h-3 w-3" />
                  {showMap ? "Hide map" : "Pick on map"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => handleLatChange(e.target.value)}
                placeholder="Latitude"
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
              />
              <input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => handleLngChange(e.target.value)}
                placeholder="Longitude"
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
              />
            </div>

            {showMap && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="h-64 w-full bg-gray-200 dark:bg-gray-700">
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
                    <LocationPicker
                      position={mapPosition}
                      onPick={handleMapPick}
                    />
                    <MapRecenter
                      position={mapPosition}
                      trigger={recenterKey}
                    />
                  </MapContainer>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 px-3 py-1.5 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  Tap the map or drag the marker to fine-tune the location. The
                  address updates automatically.
                </div>
              </div>
            )}
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+234..."
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="station@..."
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {/* Operating hours */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Operating hours
            </label>
            <input
              type="text"
              value={form.operatingHours}
              onChange={(e) =>
                setForm((f) => ({ ...f, operatingHours: e.target.value }))
              }
              placeholder="e.g. Mon–Sat, 8am – 8pm"
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
            />
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Status
              </label>
              <SimpleDropdown
                value={form.status}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "suspended", label: "Suspended" },
                ]}
                onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Admin picker */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Station admin
            </label>
            <SearchableUserSelect
              value={form.adminId}
              options={adminOptions}
              onChange={(v) => setForm((f) => ({ ...f, adminId: v }))}
              placeholder={
                usersLoading
                  ? "Loading users..."
                  : "Type a name or email to search"
              }
              disabled={isSubmitting || usersLoading}
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              The user must already have an account and not belong to another
              station.
            </p>
          </div>
        </form>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Station"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Station Detail Modal
// ═══════════════════════════════════════════════════════════
const StationDetailModal = ({ stationId, allUsers, allRiders, onClose }) => {
  const [tab, setTab] = useState("overview");
  const { data: station, isLoading } = useGetStationByIdQuery(stationId);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
              {isLoading ? "Loading..." : station?.name || "Station"}
            </h3>
            {station && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {station.address}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="px-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {[
              { key: "overview", label: "Overview" },
              { key: "stock", label: "Stock" },
              { key: "team", label: "Team" },
              { key: "riders", label: "Riders" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  tab === t.key
                    ? "border-[#13ec5b] text-[#0f9c46] dark:text-[#13ec5b]"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-[#13ec5b]" />
            </div>
          ) : !station ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Station not found
            </p>
          ) : tab === "overview" ? (
            <OverviewTab station={station} />
          ) : tab === "stock" ? (
            <StockTab station={station} />
          ) : tab === "team" ? (
            <TeamTab station={station} allUsers={allUsers} />
          ) : (
            <RidersTab
              station={station}
              allUsers={allUsers}
              allRiders={allRiders}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Overview Tab ─────────────────────────────────────────
const OverviewTab = ({ station }) => {
  const totalStock = CYLINDER_SIZES.reduce(
    (sum, s) => sum + (station.stock?.[s] || 0),
    0
  );

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Status">
          <StatusBadge status={station.status} />
        </Field>
        <Field label="Total Stock">
          <span className="text-gray-900 dark:text-white font-medium">
            {totalStock} cylinders
          </span>
        </Field>
        <Field label="Phone">
          <span className="text-gray-900 dark:text-white truncate">
            {station.phone || "—"}
          </span>
        </Field>
        <Field label="Email">
          <span className="text-gray-900 dark:text-white truncate">
            {station.email || "—"}
          </span>
        </Field>
        <Field label="Operating hours">
          <span className="text-gray-900 dark:text-white">
            {station.operatingHours || "—"}
          </span>
        </Field>
        <Field label="Coordinates">
          <span className="text-gray-900 dark:text-white">
            {station.coordinates?.lat?.toFixed(4)},{" "}
            {station.coordinates?.lng?.toFixed(4)}
          </span>
        </Field>
      </div>

      <Field label="Admin">
        {station.admin ? (
          <div className="mt-1 rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#13ec5b]/10 flex items-center justify-center flex-shrink-0">
              <UserCog className="h-4 w-4 text-[#13ec5b]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {station.admin.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {station.admin.email}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            No admin assigned
          </p>
        )}
      </Field>

      {station.createdBy && (
        <Field label="Created by">
          <p className="text-sm text-gray-900 dark:text-white">
            {station.createdBy.name}{" "}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({station.createdBy.email})
            </span>
          </p>
        </Field>
      )}
    </div>
  );
};

// ─── Stock Tab ────────────────────────────────────────────
const StockTab = ({ station }) => {
  const [adjusting, setAdjusting] = useState(null);
  const [logOpen, setLogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {CYLINDER_SIZES.map((size) => {
          const count = station.stock?.[size] || 0;
          const low = count < LOW_STOCK_THRESHOLD;
          return (
            <button
              key={size}
              onClick={() => setAdjusting(size)}
              className={`rounded-xl border-2 p-3 text-center transition ${
                low
                  ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">{size}</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  low
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {count}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                Tap to adjust
              </p>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setLogOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
      >
        <History className="h-4 w-4" />
        View stock history
      </button>

      {adjusting && (
        <AdjustStockModal
          station={station}
          initialSize={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={() => setAdjusting(null)}
          inline
        />
      )}

      {logOpen && (
        <StockLogsModal
          station={station}
          onClose={() => setLogOpen(false)}
          inline
        />
      )}
    </div>
  );
};

// ─── Team Tab ─────────────────────────────────────────────
const TeamTab = ({ station, allUsers = [] }) => {
  const [adding, setAdding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);

  const [addMember, { isLoading: addingLoading }] =
    useAddStationTeamMemberMutation();
  const [removeMember, { isLoading: removing }] =
    useRemoveStationTeamMemberMutation();

  const candidates = useMemo(
    () =>
      allUsers.filter((u) => {
        if (u.role === "admin") return false;
        const userStationId = u.station?._id || u.station;
        if (userStationId) return false;
        return true;
      }),
    [allUsers]
  );

  const options = candidates.map((u) => ({
    value: u._id,
    name: u.name || "",
    email: u.email || "",
  }));

  const handleAdd = async () => {
    if (!selectedUserId) return;
    try {
      await addMember({
        stationId: station._id,
        userId: selectedUserId,
      }).unwrap();
      toast.success("Team member added");
      setAdding(false);
      setSelectedUserId("");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to add team member");
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      await removeMember({
        userId: confirmRemove._id,
        stationId: station._id,
      }).unwrap();
      toast.success("Team member removed");
      setConfirmRemove(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to remove team member");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {station.teamMembers?.length || 0}{" "}
          {station.teamMembers?.length === 1 ? "member" : "members"}
        </p>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg text-xs font-semibold transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Add member
        </button>
      </div>

      {adding && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
          <SearchableUserSelect
            value={selectedUserId}
            options={options}
            onChange={setSelectedUserId}
            placeholder="Type a name or email to search"
            disabled={addingLoading}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setAdding(false);
                setSelectedUserId("");
              }}
              disabled={addingLoading}
              className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedUserId || addingLoading}
              className="flex-1 py-2 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {addingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add"
              )}
            </button>
          </div>
        </div>
      )}

      {(!station.teamMembers || station.teamMembers.length === 0) && !adding ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
          No team members yet
        </p>
      ) : (
        <div className="space-y-2">
          {station.teamMembers?.map((member) => (
            <div
              key={member._id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {member.name || "—"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {member.email}
                </p>
              </div>
              <button
                onClick={() => setConfirmRemove(member)}
                disabled={removing}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove team member?"
        message={
          confirmRemove
            ? `${
                confirmRemove.name || confirmRemove.email
              } will no longer be able to manage this station.`
            : ""
        }
        confirmLabel="Remove"
        danger
        loading={removing}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
};

// ─── Riders Tab ───────────────────────────────────────────
const RidersTab = ({ station, allUsers = [], allRiders = [] }) => {
  const [adding, setAdding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);

  const [addRider, { isLoading: addingLoading }] =
    useAdminAddStationRiderMutation();
  const [removeRider, { isLoading: removing }] =
    useAdminRemoveStationRiderMutation();

  const candidates = useMemo(() => {
    const list = [];
    allUsers.forEach((u) => {
      if (u.role === "admin") return;
      const userStationId = u.station?._id || u.station;
      if (userStationId) return;
      list.push({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
      });
    });
    allRiders.forEach((r) => {
      if (r.riderType !== "fuel") return;
      const riderStationId = r.station?._id || r.station;
      if (riderStationId) return;
      list.push({
        _id: r._id,
        name: r.name,
        email: r.email,
        role: "rider",
      });
    });

    const seen = new Set();
    return list.filter((u) => {
      if (seen.has(u._id)) return false;
      seen.add(u._id);
      return true;
    });
  }, [allUsers, allRiders]);

  const options = candidates.map((u) => ({
    value: u._id,
    name: u.name || "",
    email: u.email || "",
    sublabel: u.role === "rider" ? "Rider" : null,
  }));

  const handleAdd = async () => {
    if (!selectedUserId) return;
    try {
      await addRider({ id: station._id, userId: selectedUserId }).unwrap();
      toast.success("Rider added to station");
      setAdding(false);
      setSelectedUserId("");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to add rider");
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      await removeRider({
        id: station._id,
        userId: confirmRemove._id,
      }).unwrap();
      toast.success("Rider removed");
      setConfirmRemove(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to remove rider");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {station.riders?.length || 0}{" "}
          {station.riders?.length === 1 ? "rider" : "riders"}
        </p>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg text-xs font-semibold transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Add rider
        </button>
      </div>

      {adding && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
          <SearchableUserSelect
            value={selectedUserId}
            options={options}
            onChange={setSelectedUserId}
            placeholder="Type a name or email to search"
            disabled={addingLoading}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setAdding(false);
                setSelectedUserId("");
              }}
              disabled={addingLoading}
              className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedUserId || addingLoading}
              className="flex-1 py-2 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {addingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add"
              )}
            </button>
          </div>
        </div>
      )}

      {(!station.riders || station.riders.length === 0) && !adding ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
          No riders assigned to this station
        </p>
      ) : (
        <div className="space-y-2">
          {station.riders?.map((rider) => (
            <div
              key={rider._id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Truck className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {rider.name || "—"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {rider.email}
                </p>
              </div>
              <button
                onClick={() => setConfirmRemove(rider)}
                disabled={removing}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove rider from station?"
        message={
          confirmRemove
            ? `${
                confirmRemove.name || confirmRemove.email
              } will go back to the fuel rider pool and stop receiving orders from this station.`
            : ""
        }
        confirmLabel="Remove"
        danger
        loading={removing}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
};

// ─── Small field wrapper ──────────────────────────────────
const Field = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
    <div className="text-sm text-gray-900 dark:text-white min-w-0">
      {children}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
//  Adjust Stock Modal
// ═══════════════════════════════════════════════════════════
const AdjustStockModal = ({
  station,
  initialSize = "3kg",
  onClose,
  onSaved,
  inline = false,
}) => {
  const [cylinderSize, setCylinderSize] = useState(initialSize);
  const [mode, setMode] = useState("add");
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const [adjustStock, { isLoading }] = useAdminAdjustStockMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!note.trim()) {
      setError("A note is required");
      return;
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) {
      setError("Enter a valid number");
      return;
    }

    try {
      const payload = { id: station._id, cylinderSize, note: note.trim() };
      if (mode === "add") {
        payload.delta = n;
      } else {
        payload.absolute = n;
      }
      await adjustStock(payload).unwrap();
      toast.success("Stock updated");
      onSaved();
    } catch (err) {
      setError(err?.data?.message || "Failed to adjust stock");
    }
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Cylinder size
        </label>
        <div className="flex gap-2">
          {CYLINDER_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setCylinderSize(s)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                cylinderSize === s
                  ? "bg-[#13ec5b] text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          Current: {station.stock?.[cylinderSize] || 0} in stock
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Action
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("add")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              mode === "add"
                ? "bg-[#13ec5b] text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Add / remove
          </button>
          <button
            type="button"
            onClick={() => setMode("set")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              mode === "set"
                ? "bg-[#13ec5b] text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Set to
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          {mode === "add" ? "Amount (use negatives to remove)" : "New amount"}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Note *
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Received restock from supplier"
          disabled={isLoading}
          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>
    </form>
  );

  if (inline) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Adjust stock
        </p>
        {content}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => !isLoading && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Adjust stock
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 min-h-0">{content}</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Stock Logs Modal
// ═══════════════════════════════════════════════════════════
const StockLogsModal = ({ station, onClose, inline = false }) => {
  const { data: logs = [], isLoading } = useAdminGetStationLogsQuery({
    id: station._id,
    limit: 50,
  });

  const content = isLoading ? (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="h-6 w-6 animate-spin text-[#13ec5b]" />
    </div>
  ) : logs.length === 0 ? (
    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
      No stock changes yet
    </p>
  ) : (
    <div className="space-y-2">
      {logs.map((log) => {
        const isPositive = log.delta > 0;
        return (
          <div
            key={log._id}
            className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                isPositive
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              }`}
            >
              <Package className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {isPositive ? "+" : ""}
                  {log.delta} × {log.cylinderSize}
                </p>
                <span
                  className={`text-xs font-medium ${
                    isPositive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {log.stockBefore} → {log.stockAfter}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                {log.reason?.replace("_", " ")}
              </p>
              {log.note && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                  {log.note}
                </p>
              )}
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                {new Date(log.createdAt).toLocaleString()} ·{" "}
                {log.performedBy?.name || "System"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (inline) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Stock history
          </p>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
              Stock history
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {station.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 min-h-0">{content}</div>
      </div>
    </div>
  );
};

export default AdminStations;