// components/Bottombar.jsx
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { useSelector } from "react-redux";
import {
  LayoutDashboard,
  Package,
  Flame,
  Fuel,
  Menu,
} from "lucide-react";
import { useGetMyOrdersQuery } from "../features/orderApiSlice";
import { useGetProfileQuery } from "../features/userApiSlice";
import MoreDrawer from "./MoreDrawer";

// ─── Persistent flag key ──────────────────────────────────────
const GUIDE_SEEN_KEY = "flanorx_bottombar_guide_seen_v1";

// ─── Clean tap-hand silhouette (single color, modern) ─────────
const TapCursorHand = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Soft tap halo at the fingertip */}
    <circle cx="11.5" cy="4" r="3.4" opacity="0.18" />
    <circle cx="11.5" cy="4" r="1.5" opacity="0.85" />

    {/* Hand — index finger extended up, palm below */}
    <path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74 0-2.49-2.01-4.5-4.5-4.5S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74c-3.6-.76-3.54-.75-3.67-.75-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z" />
  </svg>
);

const Bottombar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideTarget, setGuideTarget] = useState("fuel");
  const { userInfo } = useSelector((state) => state.auth);

  // Freshest role from API, fallback to Redux
  const { data: profile } = useGetProfileQuery();
  const role = profile?.role || userInfo?.role;

  // Poll every 30s for unpaid/pending orders
  const { data: myOrders = [] } = useGetMyOrdersQuery(
    { paid: false },
    {
      pollingInterval: 30000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  const pendingOrdersCount = myOrders.filter(
    (o) => o.status !== "cancelled"
  ).length;

  // ─── Show guide only if the user hasn't seen it before ────
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(GUIDE_SEEN_KEY) === "true";
    } catch {
      // localStorage may be unavailable (private mode, etc.) — fail closed
      seen = true;
    }

    if (seen) return;

    const showT = setTimeout(() => setShowGuide(true), 900);
    return () => clearTimeout(showT);
  }, []);

  // ─── Alternate: Fuel (2s) → Gas (2s) → Fuel (2s) → Gas (2s), then hide ───
  useEffect(() => {
    if (!showGuide) return;

    setGuideTarget("fuel");

    const cycleInterval = setInterval(() => {
      setGuideTarget((prev) => (prev === "fuel" ? "gas" : "fuel"));
    }, 2000);

    const hideT = setTimeout(() => setShowGuide(false), 8000);

    return () => {
      clearInterval(cycleInterval);
      clearTimeout(hideT);
    };
  }, [showGuide]);

  // ─── Dismiss + persist ────────────────────────────────────
  const dismissGuide = () => {
    setShowGuide(false);
    try {
      localStorage.setItem(GUIDE_SEEN_KEY, "true");
    } catch {
      // localStorage unavailable — no-op, guide will simply reshow next time
    }
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
    {
      to: "/orders",
      icon: Package,
      label: "Orders",
      badge: pendingOrdersCount,
    },
    { to: "/order/fuel", icon: Fuel, label: "Fuel", guideKey: "fuel" },
    { to: "/order/gas", icon: Flame, label: "Gas", guideKey: "gas" },
    {
      icon: Menu,
      label: "More",
      onClick: () => {
        dismissGuide();
        setDrawerOpen(true);
      },
    },
  ];

  // Per-target styling so Fuel glows green and Gas glows orange
  const guideTheme = {
    fuel: {
      color: "#13ec5b",
      label: "Order fuel here",
      Icon: Fuel,
      ringClass: "ring-[#13ec5b]",
      pulseClass: "flanorx-ring-pulse",
    },
    gas: {
      color: "#f97316",
      label: "Order gas here",
      Icon: Flame,
      ringClass: "ring-orange-500",
      pulseClass: "flanorx-ring-pulse-orange",
    },
  };

  return (
    <>
      {/* Keyframes — scoped so no tailwind config change needed */}
      <style>{`
        @keyframes flanorx-ring-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(19,236,91,0.55); }
          70%  { box-shadow: 0 0 0 14px rgba(19,236,91,0); }
          100% { box-shadow: 0 0 0 0 rgba(19,236,91,0); }
        }
        @keyframes flanorx-ring-pulse-orange {
          0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.55); }
          70%  { box-shadow: 0 0 0 14px rgba(249,115,22,0); }
          100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
        }
        @keyframes flanorx-tap-bob {
          0%, 100% { transform: translate(0, 0); }
          40%      { transform: translate(-2px, 3px); }
          60%      { transform: translate(-2px, 3px); }
        }
        @keyframes flanorx-bubble-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        @keyframes flanorx-fade-in {
          from { opacity: 0; transform: translateY(4px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .flanorx-ring-pulse {
          animation: flanorx-ring-pulse 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .flanorx-ring-pulse-orange {
          animation: flanorx-ring-pulse-orange 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .flanorx-tap-bob {
          animation: flanorx-tap-bob 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .flanorx-bubble-float {
          animation: flanorx-bubble-float 2.4s ease-in-out infinite;
        }
        .flanorx-fade-in {
          animation: flanorx-fade-in 260ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }
      `}</style>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div
          className="flex items-center justify-around px-2 py-1"
          onTouchStart={dismissGuide}
          onClick={dismissGuide}
        >
          {navItems.map((item) => {
            if (item.onClick) {
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] mt-0.5">{item.label}</span>
                </button>
              );
            }

            const isGuideActive =
              item.guideKey && showGuide && guideTarget === item.guideKey;
            const theme = item.guideKey ? guideTheme[item.guideKey] : null;

            return (
              <div key={item.to} className="relative">
                {/* ═══ Onboarding guide — anchored to the active item ═══ */}
                {isGuideActive && theme && (
                  <div
                    key={item.guideKey} // re-mounts on flip so fade-in replays
                    className="flanorx-fade-in"
                  >
                    {/* Speech-bubble callout */}
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-[65%] mb-9 pointer-events-none flanorx-bubble-float"
                      style={{ width: "max-content" }}
                    >
                      <div
                        className="flex items-center gap-1.5 text-gray-900 font-semibold text-xs sm:text-sm px-3 py-2 rounded-2xl rounded-bl-sm shadow-lg"
                        style={{
                          backgroundColor: theme.color,
                          boxShadow: `0 10px 15px -3px ${theme.color}55, 0 4px 6px -4px ${theme.color}55`,
                        }}
                      >
                        <theme.Icon className="h-4 w-4" />
                        {theme.label}
                      </div>
                      {/* Curved connector arrow, down-right into the ring */}
                      <svg
                        width="40"
                        height="34"
                        viewBox="0 0 40 34"
                        className="absolute left-[70%] top-full"
                        fill="none"
                      >
                        <path
                          d="M2 2 C2 20, 16 24, 30 26"
                          stroke={theme.color}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M24 22 L30 26 L27 32"
                          stroke={theme.color}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </div>

                    {/* Pulsing glow ring — nudge down so it hugs the icon */}
                    <span
                      className={`absolute inset-0 m-auto w-11 h-11 rounded-full translate-y-[22px] pointer-events-none ${theme.pulseClass}`}
                    />
                    <span
                      className={`absolute inset-0 m-auto w-11 h-11 rounded-full translate-y-[22px] ring-2 pointer-events-none ${theme.ringClass}`}
                    />

                    {/* Clean tap-hand cursor — bottom-right of the icon */}
                    <TapCursorHand
                      className="absolute -bottom-3 -right-4 w-7 h-7 flanorx-tap-bob drop-shadow-md pointer-events-none"
                      style={{ color: theme.color }}
                    />
                  </div>
                )}

                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                      isActive
                        ? "text-[#13ec5b]"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`
                  }
                >
                  <span className="relative">
                    <item.icon className="h-5 w-5" />
                    {item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] mt-0.5">{item.label}</span>
                </NavLink>
              </div>
            );
          })}
        </div>
      </nav>

      <MoreDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

export default Bottombar;