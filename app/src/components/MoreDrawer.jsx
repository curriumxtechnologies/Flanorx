// components/MoreDrawer.jsx
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  X,
  User,
  Settings,
  Sun,
  Moon,
  Monitor,
  Truck,
  Wallet,
  MapPin,
  Repeat,
  Shield,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useGetProfileQuery } from "../features/userApiSlice";
import { useGetAvailableDeliveriesQuery } from "../features/deliveryApiSlice";
import { useGetRiderApplicationsQuery } from "../features/adminApiSlice";
import LogoutButton from "../utils/logoutBtn";

const MoreDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme, setSystemTheme } = useTheme();
  const { userInfo } = useSelector((state) => state.auth);

  // Freshest role from API, fallback to Redux
  const { data: profile } = useGetProfileQuery();
  const role = profile?.role || userInfo?.role;
  const isRider = role === "rider";
  const isAdmin = role === "admin";

  // ─── Attention badges (skip when drawer is closed) ────────
  const { data: availableDeliveries = [] } = useGetAvailableDeliveriesQuery(
    undefined,
    {
      skip: !isOpen || !isRider,
      pollingInterval: 15000,
      refetchOnFocus: true,
    }
  );
  const availableDeliveriesCount = availableDeliveries.length;

  const { data: pendingApplications = [] } = useGetRiderApplicationsQuery(
    { status: "pending" },
    {
      skip: !isOpen || !isAdmin,
      pollingInterval: 30000,
      refetchOnFocus: true,
    }
  );
  const pendingAppsCount = pendingApplications.length;

  const drawerRef = useRef(null);

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

  const menuItems = [
    {
      label: "Tracking",
      icon: MapPin,
      onClick: () => {
        navigate("/tracking");
        onClose();
      },
    },
    {
      label: "Gas Subscription",
      icon: Repeat,
      onClick: () => {
        navigate("/gas/subscription");
        onClose();
      },
    },
    {
      label: "Profile",
      icon: User,
      onClick: () => {
        navigate("/profile");
        onClose();
      },
    },
    {
      label: "Settings",
      icon: Settings,
      onClick: () => {
        navigate("/settings");
        onClose();
      },
    },
  ];

  const riderItems = [
    {
      label: "Deliveries",
      icon: Truck,
      badge: availableDeliveriesCount,
      onClick: () => {
        navigate("/rider/deliveries");
        onClose();
      },
    },
    {
      label: "Earnings",
      icon: Wallet,
      onClick: () => {
        navigate("/rider/earnings");
        onClose();
      },
    },
  ];

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
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            More
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto h-[calc(100%-65px)]">
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

          <hr className="my-3 border-gray-200 dark:border-gray-800" />

          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </span>
              {item.badge > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </button>
          ))}

          {isRider && (
            <>
              <hr className="my-3 border-gray-200 dark:border-gray-800" />
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                Rider
              </p>
              {riderItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge > 0 && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={() => {
                  navigate("/rider/dashboard");
                  onClose();
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-[#13ec5b] bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 transition-colors"
              >
                <Truck className="h-5 w-5" />
                <span>Rider Dashboard</span>
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <hr className="my-3 border-gray-200 dark:border-gray-800" />
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                Admin
              </p>
              <button
                onClick={() => {
                  navigate("/superuser/dashboard");
                  onClose();
                }}
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Shield className="h-5 w-5" />
                  <span>Admin Dashboard</span>
                </span>
                {pendingAppsCount > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {pendingAppsCount > 99 ? "99+" : pendingAppsCount}
                  </span>
                )}
              </button>
            </>
          )}

          <hr className="my-3 border-gray-200 dark:border-gray-800" />

          {/* ⭐ Drop-in logout — closes the drawer first, then logs out */}
          <LogoutButton
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
            onBeforeLogout={onClose}
          />
        </div>
      </div>
    </>
  );
};

export default MoreDrawer;