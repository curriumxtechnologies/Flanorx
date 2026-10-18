// components/refill/RefillMoreDrawer.jsx
//
// Slide-in drawer for the RefillBottombar's "More" button.
//
// Contents:
//   • Theme switcher (Light / Dark / System)
//   • Role-specific extras not shown in the bottom bar
//   • "Personal" section (customer links) when the user also has a
//     station role — lets owners/staff still shop
//   • Switch back to the main app (customer / admin dashboard)
//   • Logout

import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  X,
  Sun,
  Moon,
  Monitor,
  MapPin,
  Package,
  PlusCircle,
  Clock,
  Users,
  Receipt,
  Settings,
  User,
  Building2,
  ClipboardList,
  ArrowLeft,
} from "lucide-react";

import { useTheme } from "../../context/ThemeContext";
import { useGetProfileQuery } from "../../features/userApiSlice";
import { useGetMyRefillApplicationQuery } from "../../features/refillApiSlice";
import LogoutButton from "../../utils/logoutBtn";

const RefillMoreDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme, setSystemTheme } = useTheme();
  const drawerRef = useRef(null);

  const { userInfo } = useSelector((state) => state.auth);
  const { data: profile } = useGetProfileQuery();

  const role = profile?.role || userInfo?.role;
  const isMainAdmin = role === "admin";

  const refillStationId = profile?.refillStation || userInfo?.refillStation;
  const refillRole =
    profile?.refillStationRole || userInfo?.refillStationRole;
  const hasStation = !!refillStationId;

  const isRefillOwner = hasStation && refillRole === "owner";
  const isRefillStaff = hasStation && ["owner", "staff"].includes(refillRole);
  const isRefillRider = hasStation && refillRole === "rider";
  const isCustomerOnly = !hasStation && !isMainAdmin;

  const { data: myApplication } = useGetMyRefillApplicationQuery(undefined, {
    skip: hasStation || isMainAdmin,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const appStatus = myApplication?.station?.status || null;
  const hasPendingApplication = appStatus === "pending";
  const hasRejectedApplication = appStatus === "rejected";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  const go = (path) => {
    navigate(path);
    onClose();
  };

  // ─── Role-specific extras (items not in the bottom bar) ─
  const stationExtras = [];
  if (isRefillOwner) {
    stationExtras.push(
      {
        label: "Commission",
        icon: Receipt,
        onClick: () => go("/refill/station/commission"),
      },
      {
        label: "Station Profile",
        icon: Settings,
        onClick: () => go("/refill/station/profile"),
      }
    );
  }

  const adminExtras = [];
  if (isMainAdmin) {
    adminExtras.push(
      {
        label: "All Refill Orders",
        icon: Package,
        onClick: () => go("/admin/refill/orders"),
      },
      {
        label: "Refill Settings",
        icon: Settings,
        onClick: () => go("/admin/refill/settings"),
      }
    );
  }

  // ─── "Personal" links (customer experience) ─────────────
  // Shown only if the user also has a station/admin role — a pure
  // customer already has these in the bottom bar.
  const customerExtras = [];
  if (hasStation || isMainAdmin) {
    customerExtras.push(
      {
        label: "Find Refill Stations",
        icon: MapPin,
        onClick: () => go("/refill"),
      },
      {
        label: "My Refill Orders",
        icon: Package,
        onClick: () => go("/refill/orders"),
      }
    );
  }

  // ─── "Apply as Station" for pure customers who can't apply ─
  // (the bottom bar hides the Apply link when an application is
  // pending, so the drawer is where the "status" link lives for
  // pure customers who already submitted.)
  const applicationLink =
    isCustomerOnly && !hasPendingApplication
      ? {
          label: hasRejectedApplication
            ? "Re-apply as Station"
            : "Apply as Station",
          icon: PlusCircle,
          onClick: () => go("/refill/apply"),
        }
      : null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        ref={drawerRef}
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            Refill · More
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto h-[calc(100%-65px)]">
          {/* ─── Theme ─────────────────────────────────── */}
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Theme
          </p>
          <button
            onClick={() => {
              if (theme !== "light") toggleTheme();
              onClose();
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              theme === "light"
                ? "bg-[#13ec5b]/10 text-[#13ec5b]"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Sun className="h-5 w-5" />
            <span>Light</span>
          </button>
          <button
            onClick={() => {
              if (theme !== "dark") toggleTheme();
              onClose();
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              theme === "dark"
                ? "bg-[#13ec5b]/10 text-[#13ec5b]"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Moon className="h-5 w-5" />
            <span>Dark</span>
          </button>
          <button
            onClick={() => {
              setSystemTheme();
              onClose();
            }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Monitor className="h-5 w-5" />
            <span>System</span>
          </button>

          {/* ─── Station extras (owner) ────────────────── */}
          {stationExtras.length > 0 && (
            <>
              <hr className="my-3 border-gray-200 dark:border-gray-800" />
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                My Station
              </p>
              {stationExtras.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </>
          )}

          {/* ─── Admin extras ──────────────────────────── */}
          {adminExtras.length > 0 && (
            <>
              <hr className="my-3 border-gray-200 dark:border-gray-800" />
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                Admin
              </p>
              {adminExtras.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </>
          )}

          {/* ─── Personal / customer view ──────────────── */}
          {(customerExtras.length > 0 || applicationLink) && (
            <>
              <hr className="my-3 border-gray-200 dark:border-gray-800" />
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                Personal
              </p>
              {customerExtras.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              ))}
              {applicationLink && (
                <button
                  onClick={applicationLink.onClick}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-[#13ec5b] bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 transition-colors"
                >
                  <applicationLink.icon className="h-5 w-5" />
                  <span>{applicationLink.label}</span>
                </button>
              )}
            </>
          )}

          {/* ─── Profile ──────────────────────────────── */}
          <hr className="my-3 border-gray-200 dark:border-gray-800" />
          <button
            onClick={() => go("/refill/profile")}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <User className="h-5 w-5" />
            <span>Profile</span>
          </button>

          {/* ─── Switch back to main app ──────────────── */}
          <hr className="my-3 border-gray-200 dark:border-gray-800" />
          <button
            onClick={() =>
              go(isMainAdmin ? "/superuser/dashboard" : "/dashboard")
            }
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-[#13ec5b] bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>
              {isMainAdmin ? "Admin Dashboard" : "Back to App"}
            </span>
          </button>

          {/* ─── Logout ───────────────────────────────── */}
          <hr className="my-3 border-gray-200 dark:border-gray-800" />
          <LogoutButton
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
            onBeforeLogout={onClose}
          />
        </div>
      </div>
    </>
  );
};

export default RefillMoreDrawer;