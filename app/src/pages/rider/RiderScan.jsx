// src/pages/rider/RiderScan.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Html5Qrcode } from "html5-qrcode";
import {
  QrCode,
  Camera,
  CameraOff,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Keyboard,
  RefreshCw,
  User,
  Package,
  Flame,
  Truck,
  Store,
  Info,
  Wallet,
  MapPin,
  Phone,
  History,
} from "lucide-react";
import RiderSidebar from "../../components/rider/Sidebar";
import RiderBottombar from "../../components/rider/Bottombar";
import { useVerifyOrderByTokenMutation } from "../../features/orderApiSlice";

const SCANNER_ELEMENT_ID = "flanorx-qr-reader";
const DEBOUNCE_MS = 3000; // ignore the same token within 3s
const MAX_RECENT = 5;

// ─── Extract a token from whatever the QR contains ────────
// Handles: plain hex token, URL with ?token=, JSON {token}
const extractToken = (raw) => {
  const text = String(raw || "").trim();
  if (!text) return "";

  // JSON blob
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      if (parsed?.token) return String(parsed.token).trim();
    } catch {
      // fall through
    }
  }

  // URL with token query param
  try {
    if (text.startsWith("http")) {
      const url = new URL(text);
      const t = url.searchParams.get("token");
      if (t) return t.trim();
    }
  } catch {
    // fall through
  }

  return text;
};

const RiderScan = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  // ─── Refs ─────────────────────────────────────────────────
  const scannerRef = useRef(null);
  const mountedRef = useRef(false);
  const lastScanRef = useRef({ token: null, at: 0 });

  // ─── State ────────────────────────────────────────────────
  // camera: idle | starting | ready | error
  const [cameraState, setCameraState] = useState("idle");
  const [cameraError, setCameraError] = useState("");

  const [showManual, setShowManual] = useState(false);
  const [manualToken, setManualToken] = useState("");

  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [scanError, setScanError] = useState("");
  const [recentScans, setRecentScans] = useState([]);

  const [verifyOrder, { isLoading: verifying }] =
    useVerifyOrderByTokenMutation();

  // ─── Stop scanner ─────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // already stopped
    }
    try {
      scanner.clear();
    } catch {
      // ignore
    }
    scannerRef.current = null;
  }, []);

  // ─── Handle a decoded token ───────────────────────────────
  const handleDecodedToken = useCallback(
    async (rawText) => {
      const token = extractToken(rawText);
      if (!token) return;

      // Debounce — same token within DEBOUNCE_MS is ignored
      const now = Date.now();
      if (
        lastScanRef.current.token === token &&
        now - lastScanRef.current.at < DEBOUNCE_MS
      ) {
        return;
      }
      lastScanRef.current = { token, at: now };

      // Stop camera before API call so we don't scan more
      await stopScanner();

      if (!mountedRef.current) return;
      setScanError("");

      try {
        const result = await verifyOrder({ token }).unwrap();
        if (!mountedRef.current) return;

        const order = result?.order;
        setConfirmedOrder(order);
        setRecentScans((prev) =>
          [
            {
              token,
              order,
              at: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, MAX_RECENT)
        );

        toast.success(result?.message || "Order confirmed");
      } catch (err) {
        if (!mountedRef.current) return;
        const message =
          err?.data?.message || err?.message || "Failed to confirm order";
        setScanError(message);
        toast.error(message);
      }
    },
    [verifyOrder, stopScanner]
  );

  // ─── Start scanner ────────────────────────────────────────
  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return;
    setCameraState("starting");
    setCameraError("");
    setScanError("");
    setConfirmedOrder(null);

    // Small tick to ensure the container element is in the DOM
    await new Promise((r) => setTimeout(r, 50));
    if (!mountedRef.current) return;

    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (!mountedRef.current) return;
          handleDecodedToken(decodedText);
        },
        () => {
          // per-frame decode errors are normal — ignore
        }
      );

      if (!mountedRef.current) {
        // unmounted while starting — clean up
        await stopScanner();
        return;
      }
      setCameraState("ready");
    } catch (err) {
      if (!mountedRef.current) return;
      setCameraState("error");
      setCameraError(
        err?.message ||
          "Could not access the camera. Check your browser permissions."
      );
    }
  }, [handleDecodedToken, stopScanner]);

  // ─── Mount / unmount lifecycle ────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    startScanner();
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Manual entry ─────────────────────────────────────────
  const handleManualSubmit = async (e) => {
    e?.preventDefault?.();
    const token = extractToken(manualToken);
    if (!token) {
      toast.error("Paste or type the QR token");
      return;
    }
    await stopScanner();
    await handleDecodedToken(token);
    setManualToken("");
  };

  // ─── Scan another ─────────────────────────────────────────
  const handleScanAnother = () => {
    setConfirmedOrder(null);
    setScanError("");
    startScanner();
  };

  // ─── Order helpers ────────────────────────────────────────
  const isGas = (o) => o?.orderType === "gas";
  const isPickup = (o) => o?.fulfillmentType === "pickup";

  // ─── Render: Confirmed view ───────────────────────────────
  if (confirmedOrder) {
    const order = confirmedOrder;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <RiderSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Scan Result
            </h1>
          </header>

          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="max-w-md mx-auto">
              {/* Success card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Delivery confirmed
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Order #{order.orderId || order._id?.slice(-6)} has been
                  completed.
                </p>
              </div>

              {/* Order summary */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm mt-4 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Order Details
                  </h3>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">
                      Order ID
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      #{order.orderId || order._id?.slice(-6)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">
                      Type
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isGas(order)
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}
                    >
                      {isGas(order) ? (
                        <Flame className="h-3 w-3" />
                      ) : (
                        <Truck className="h-3 w-3" />
                      )}
                      {isGas(order) ? "Gas" : "Fuel"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">
                      Customer
                    </span>
                    <span className="text-gray-900 dark:text-white truncate max-w-[60%]">
                      {order.user?.name || "Unknown"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">
                      Amount
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      ₦{order.totalAmount?.toFixed(2) || "0.00"}
                    </span>
                  </div>

                  {order.riderCommission > 0 && (
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5" />
                        Your earning
                      </span>
                      <span className="text-[#0f9c46] dark:text-[#13ec5b] font-bold">
                        ₦{order.riderCommission.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={handleScanAnother}
                  className="w-full py-3 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  <QrCode className="h-5 w-5" />
                  Scan another order
                </button>
                <button
                  onClick={() => navigate("/rider/deliveries")}
                  className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Back to deliveries
                </button>
              </div>
            </div>
          </div>
        </div>
        <RiderBottombar />
      </div>
    );
  }

  // ─── Render: Scanner view ─────────────────────────────────
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
              Scan QR code
            </h1>
          </div>
          {(cameraState === "ready" || cameraState === "starting") && (
            <button
              onClick={() => {
                stopScanner();
                setCameraState("idle");
              }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition flex-shrink-0"
              title="Stop camera"
            >
              <CameraOff className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          <div className="max-w-md mx-auto">
            {/* Info banner */}
            <div className="mb-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Ask the customer to open their order and show the QR code.
                Scan it here to complete the delivery.
              </p>
            </div>

            {/* Scanner viewport */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="relative">
                {/* The scanner mounts into this element */}
                <div
                  id={SCANNER_ELEMENT_ID}
                  className="w-full bg-black"
                  style={{
                    minHeight: "300px",
                    aspectRatio: "1 / 1",
                  }}
                />

                {/* Overlay: starting */}
                {cameraState === "starting" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 pointer-events-none">
                    <Loader2 className="h-8 w-8 animate-spin text-white mb-3" />
                    <p className="text-sm text-white">Starting camera...</p>
                  </div>
                )}

                {/* Overlay: error */}
                {cameraState === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                      <CameraOff className="h-7 w-7 text-red-500" />
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">
                      Camera unavailable
                    </p>
                    <p className="text-xs text-gray-400 max-w-xs break-words">
                      {cameraError || "Could not access the camera"}
                    </p>
                    <button
                      onClick={startScanner}
                      className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Try again
                    </button>
                  </div>
                )}

                {/* Overlay: idle (stopped) */}
                {cameraState === "idle" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-3">
                      <Camera className="h-7 w-7 text-white" />
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">
                      Camera is off
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                      Turn on the camera to scan a QR code.
                    </p>
                    <button
                      onClick={startScanner}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg text-xs font-semibold transition"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Start camera
                    </button>
                  </div>
                )}

                {/* Ready state: animated frame (CSS-only, sits above video) */}
                {cameraState === "ready" && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-56 h-56 sm:w-64 sm:h-64 relative">
                        <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#13ec5b] rounded-tl-md" />
                        <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#13ec5b] rounded-tr-md" />
                        <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#13ec5b] rounded-bl-md" />
                        <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#13ec5b] rounded-br-md" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/60 text-white rounded-full text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#13ec5b] animate-pulse" />
                        Point at the QR code
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status footer */}
              <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-700">
                <span className="flex items-center gap-1.5">
                  {cameraState === "ready" ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Scanning
                    </>
                  ) : cameraState === "starting" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Starting
                    </>
                  ) : cameraState === "error" ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Error
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      Idle
                    </>
                  )}
                </span>
                <span className="truncate">Point at customer's QR</span>
              </div>
            </div>

            {/* Scan error */}
            {scanError && (
              <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                    Scan failed
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 break-words">
                    {scanError}
                  </p>
                </div>
                <button
                  onClick={handleScanAnother}
                  className="flex-shrink-0 text-xs font-semibold text-red-700 dark:text-red-300 hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Manual entry */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowManual((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Keyboard className="h-4 w-4" />
                  Enter code manually
                </span>
                {showManual ? (
                  <X className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronLeft className="h-4 w-4 text-gray-400 -rotate-90" />
                )}
              </button>

              {showManual && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Paste the token the customer's QR contains, or type it in.
                  </p>
                  <form onSubmit={handleManualSubmit} className="space-y-2">
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Paste or type the QR token..."
                      autoComplete="off"
                      disabled={verifying}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={!manualToken.trim() || verifying}
                      className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Confirm order
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Recent scans (session only) */}
            {recentScans.length > 0 && (
              <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <History className="h-4 w-4 text-[#13ec5b]" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Scanned this session
                  </span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentScans.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          #{entry.order?.orderId || "—"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {entry.order?.user?.name || "Unknown"} ·{" "}
                          {new Date(entry.at).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                        ₦{entry.order?.riderCommission?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <RiderBottombar />
    </div>
  );
};

export default RiderScan;