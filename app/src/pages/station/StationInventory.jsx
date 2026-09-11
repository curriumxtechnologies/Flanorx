// src/pages/station/StationInventory.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Boxes,
  Package,
  Plus,
  Minus,
  RefreshCw,
  AlertCircle,
  History,
  Loader2,
  X,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Filter,
} from "lucide-react";
import StationSidebar from "../../components/station/Sidebar";
import StationBottombar from "../../components/station/Bottombar";
import {
  useGetStationInventoryQuery,
  useRestockInventoryMutation,
  useGetInventoryLogsQuery,
} from "../../features/stationApiSlice";

const CYLINDER_SIZES = ["3kg", "6kg", "12kg"];
const LOW_STOCK_THRESHOLD = 5;

// ═══════════════════════════════════════════════════════════
//  Custom Dropdown
// ═══════════════════════════════════════════════════════════
const CustomDropdown = ({
  value,
  options,
  onChange,
  placeholder = "Select...",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);
  const display = selected ? selected.label : placeholder;
  const isActive = value !== "" && value !== undefined;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg text-sm transition min-w-[140px] ${
          isActive
            ? "bg-[#13ec5b]/10 border-[#13ec5b]/40 text-[#0f9c46] dark:text-[#13ec5b] font-medium"
            : "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
      >
        <span className="truncate text-left">{display}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 max-h-60 overflow-auto py-1">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value || "__all"}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition flex items-center justify-between gap-2 ${
                  isSelected
                    ? "bg-[#13ec5b]/10 text-[#0f9c46] dark:text-[#13ec5b] font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="truncate">{opt.label}</span>
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
const StationInventory = () => {
  // ─── Restock modal state ──────────────────────────────────
  const [restockSize, setRestockSize] = useState(null);

  // ─── Logs filters ─────────────────────────────────────────
  const [logFilters, setLogFilters] = useState({
    cylinderSize: "",
    reason: "",
    limit: 30,
  });

  // ─── Queries ──────────────────────────────────────────────
  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    error: inventoryError,
    refetch: refetchInventory,
    isFetching: inventoryFetching,
  } = useGetStationInventoryQuery(undefined, {
    pollingInterval: 30000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: logs = [],
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useGetInventoryLogsQuery({
    cylinderSize: logFilters.cylinderSize || undefined,
    reason: logFilters.reason || undefined,
    limit: logFilters.limit,
  });

  const inventory = inventoryData?.inventory || [];
  const station = inventoryData?.station || null;

  // ─── Derived stats ────────────────────────────────────────
  const totalStock = useMemo(
    () => inventory.reduce((sum, item) => sum + (item.count || 0), 0),
    [inventory]
  );

  const lowCount = useMemo(
    () => inventory.filter((item) => item.low).length,
    [inventory]
  );

  const findStock = (size) =>
    inventory.find((item) => item.size === size) || {
      size,
      count: 0,
      low: true,
    };

  // ─── Handlers ─────────────────────────────────────────────
  const handleRefresh = () => {
    refetchInventory();
    refetchLogs();
  };

  // ─── Error state ──────────────────────────────────────────
  if (inventoryError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <StationSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Inventory
            </h1>
          </header>
          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">
                Failed to load inventory
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {inventoryError?.data?.message ||
                  inventoryError?.message ||
                  "Please try again"}
              </p>
            </div>
          </div>
        </div>
        <StationBottombar />
      </div>
    );
  }

  const logFilterOptions = [
    { value: "", label: "All Sizes" },
    { value: "3kg", label: "3kg" },
    { value: "6kg", label: "6kg" },
    { value: "12kg", label: "12kg" },
  ];

  const reasonFilterOptions = [
    { value: "", label: "All Activity" },
    { value: "restock", label: "Restock" },
    { value: "order_fulfilled", label: "Order fulfilled" },
    { value: "adjustment", label: "Adjustment" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StationSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Inventory
          </h1>
          <button
            onClick={handleRefresh}
            disabled={inventoryFetching}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={`h-5 w-5 text-gray-500 dark:text-gray-400 ${
                inventoryFetching ? "animate-spin" : ""
              }`}
            />
          </button>
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          {/* ─── MOBILE HERO ─────────────────────────────── */}
          <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4 shadow-sm">
            {inventoryLoading ? (
              <>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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
                  </div>
                  <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex-shrink-0" />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Inventory
                    </span>
                    <h1
                      className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white"
                      title={station?.name || "Station"}
                    >
                      {station?.name || "Stock Overview"}
                    </h1>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={inventoryFetching}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex-shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        inventoryFetching ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-end justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total Cylinders
                    </span>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {totalStock}
                    </p>
                  </div>
                  <div className="text-right min-w-0">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Low Stock
                    </span>
                    <p
                      className={`text-xl font-bold truncate ${
                        lowCount > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {lowCount}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 gap-2">
                  <div className="flex items-center gap-4 min-w-0">
                    {CYLINDER_SIZES.map((size) => {
                      const item = findStock(size);
                      return (
                        <div key={size} className="min-w-0">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {size}
                          </span>
                          <p
                            className={`text-sm font-bold truncate ${
                              item.low
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {item.count}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ─── DESKTOP STATS ──────────────────────────── */}
          <div className="hidden lg:grid grid-cols-3 gap-4 mb-6">
            {inventoryLoading
              ? [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
                  >
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
                    <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                ))
              : CYLINDER_SIZES.map((size) => {
                  const item = findStock(size);
                  return (
                    <CylinderStockCard
                      key={size}
                      size={size}
                      count={item.count}
                      low={item.low}
                      onRestock={() => setRestockSize(size)}
                    />
                  );
                })}
          </div>

          {/* ─── MOBILE CYLINDER CARDS ──────────────────── */}
          <div className="lg:hidden grid grid-cols-1 gap-3 mb-4">
            {!inventoryLoading &&
              CYLINDER_SIZES.map((size) => {
                const item = findStock(size);
                return (
                  <MobileCylinderCard
                    key={size}
                    size={size}
                    count={item.count}
                    low={item.low}
                    onRestock={() => setRestockSize(size)}
                  />
                );
              })}
          </div>

          {/* ─── Stock history ──────────────────────────── */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <History className="h-4 w-4 text-[#13ec5b]" />
                Stock History
              </h2>

              {/* Filters (desktop only — mobile has them collapsed) */}
              <div className="hidden lg:flex items-center gap-2">
                <CustomDropdown
                  value={logFilters.cylinderSize}
                  options={logFilterOptions}
                  onChange={(v) =>
                    setLogFilters((f) => ({ ...f, cylinderSize: v }))
                  }
                  placeholder="All Sizes"
                />
                <CustomDropdown
                  value={logFilters.reason}
                  options={reasonFilterOptions}
                  onChange={(v) =>
                    setLogFilters((f) => ({ ...f, reason: v }))
                  }
                  placeholder="All Activity"
                />
              </div>

              {/* Mobile: chips row */}
              <div className="lg:hidden flex flex-wrap items-center gap-1.5 w-full">
                {logFilterOptions.map((opt) => (
                  <button
                    key={opt.value || "__all-size"}
                    onClick={() =>
                      setLogFilters((f) => ({ ...f, cylinderSize: opt.value }))
                    }
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                      logFilters.cylinderSize === opt.value
                        ? "bg-[#13ec5b] text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {logsLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 animate-pulse"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No stock activity yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Restocks and fulfilled orders will show up here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map((log) => (
                  <LogItem key={log._id} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <StationBottombar />

      {/* Restock modal */}
      {restockSize && (
        <RestockModal
          size={restockSize}
          currentCount={findStock(restockSize).count}
          onClose={() => setRestockSize(null)}
          onSaved={() => {
            setRestockSize(null);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Desktop Cylinder Card
// ═══════════════════════════════════════════════════════════
const CylinderStockCard = ({ size, count, low, onRestock }) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-5 min-w-0 transition ${
      low
        ? "border-red-200 dark:border-red-800"
        : "border-gray-200 dark:border-gray-700"
    }`}
  >
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            low
              ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              : "bg-[#13ec5b]/10 text-[#13ec5b]"
          }`}
        >
          <Package className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {size} Cylinder
          </p>
          {low && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-0.5">
              Low stock
            </p>
          )}
        </div>
      </div>
    </div>

    <p
      className={`text-4xl font-bold mb-4 truncate ${
        low
          ? "text-red-600 dark:text-red-400"
          : "text-gray-900 dark:text-white"
      }`}
    >
      {count}
      <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">
        in stock
      </span>
    </p>

    <button
      onClick={onRestock}
      className={`w-full py-2.5 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
        low
          ? "bg-red-600 hover:bg-red-700 text-white"
          : "bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900"
      }`}
    >
      <Plus className="h-4 w-4" />
      Restock
    </button>
  </div>
);

// ═══════════════════════════════════════════════════════════
//  Mobile Cylinder Card (horizontal)
// ═══════════════════════════════════════════════════════════
const MobileCylinderCard = ({ size, count, low, onRestock }) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-4 transition ${
      low
        ? "border-red-200 dark:border-red-800"
        : "border-gray-200 dark:border-gray-700"
    }`}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            low
              ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              : "bg-[#13ec5b]/10 text-[#13ec5b]"
          }`}
        >
          <Package className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {size} Cylinder
            </span>
            {low && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <AlertCircle className="h-2.5 w-2.5" />
                Low
              </span>
            )}
          </div>
          <p
            className={`text-2xl font-bold truncate mt-0.5 ${
              low
                ? "text-red-600 dark:text-red-400"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {count}
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1.5">
              in stock
            </span>
          </p>
        </div>
      </div>
      <button
        onClick={onRestock}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
          low
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900"
        }`}
      >
        <Plus className="h-3.5 w-3.5" />
        Restock
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
//  Log Item
// ═══════════════════════════════════════════════════════════
const LogItem = ({ log }) => {
  const isPositive = log.delta > 0;
  const reasonLabel = {
    restock: "Restocked",
    order_fulfilled: "Order fulfilled",
    adjustment: "Adjusted",
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          isPositive
            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        }`}
      >
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {isPositive ? "+" : ""}
            {log.delta} × {log.cylinderSize}
          </p>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isPositive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {log.stockBefore} → {log.stockAfter}
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {reasonLabel[log.reason] || log.reason}
          {log.order?.orderId && (
            <span className="ml-1">· #{log.order.orderId}</span>
          )}
        </p>

        {log.note && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words italic">
            "{log.note}"
          </p>
        )}

        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          {new Date(log.createdAt).toLocaleString()} ·{" "}
          {log.performedBy?.name || "System"}
        </p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Restock Modal
// ═══════════════════════════════════════════════════════════
const RestockModal = ({ size, currentCount, onClose, onSaved }) => {
  const [cylinderSize, setCylinderSize] = useState(size);
  const [quantity, setQuantity] = useState(10);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const [restock, { isLoading }] = useRestockInventoryMutation();

  // Reset quantity when switching size
  const handleSizeChange = (newSize) => {
    setCylinderSize(newSize);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Quantity must be a positive number");
      return;
    }
    if (qty > 1000) {
      setError("Quantity looks too large. Max 1000.");
      return;
    }

    try {
      await restock({
        cylinderSize,
        quantity: qty,
        note: note.trim() || undefined,
      }).unwrap();
      toast.success(`Added ${qty} × ${cylinderSize} cylinders`);
      onSaved();
    } catch (err) {
      setError(err?.data?.message || "Failed to restock");
    }
  };

  const presets = [5, 10, 20, 50];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => !isLoading && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
              Restock cylinders
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add cylinders to your station's stock
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
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

          {/* Size selector */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Cylinder size
            </label>
            <div className="flex gap-2">
              {CYLINDER_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSizeChange(s)}
                  disabled={isLoading}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition border-2 ${
                    cylinderSize === s
                      ? "border-[#13ec5b] bg-[#13ec5b] text-white shadow-md shadow-[#13ec5b]/20"
                      : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Currently in stock:{" "}
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                {cylinderSize === size
                  ? currentCount
                  : "—"}{" "}
                {cylinderSize}
              </span>
              {cylinderSize !== size && " (switch back to see)"}
            </p>
          </div>

          {/* Quantity presets */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Quantity to add
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setQuantity(p)}
                  disabled={isLoading}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                    Number(quantity) === p
                      ? "bg-[#13ec5b] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={1}
                max={1000}
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Note <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Supplier delivery"
              autoComplete="off"
              maxLength={200}
              disabled={isLoading}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
            />
          </div>

          {/* Preview */}
          {Number(quantity) > 0 && (
            <div className="rounded-lg bg-[#13ec5b]/5 border border-[#13ec5b]/20 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  New {cylinderSize} total
                </span>
                <span className="font-bold text-[#0f9c46] dark:text-[#13ec5b]">
                  {cylinderSize === size
                    ? currentCount + Number(quantity)
                    : Number(quantity)}
                </span>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
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
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add to stock
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationInventory;