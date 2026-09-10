// src/components/rider/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  Truck,
  Wallet,
  MapPin,
  User,
  LogOut,
  Settings,
  Sun,
  Moon,
  Home,
} from "lucide-react";
import { logout } from "../../features/auth/authSlice";
import { useTheme } from "../../context/ThemeContext";
import { useGetAvailableDeliveriesQuery } from "../../features/deliveryApiSlice";
import { apiSlice } from "../../features/apiSlice";

const RiderSidebar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { theme, toggleTheme } = useTheme();
  const { userInfo } = useSelector((state) => state.auth);

  // Poll every 15s to keep the available count fresh
  const { data: availableDeliveries = [] } = useGetAvailableDeliveriesQuery(
    undefined,
    { pollingInterval: 15000, refetchOnFocus: true, refetchOnReconnect: true }
  );
  const availableCount = availableDeliveries.length;

  const handleLogout = () => {
    // 1. Clear Redux auth state + all storage keys
    dispatch(logout());

    // 2. Wipe RTK Query cache so no stale data lingers
    dispatch(apiSlice.util.resetApiState());

    // 3. Redirect with replace
    navigate("/login", { replace: true });
  };

  const navItems = [
    { to: "/rider/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    {
      to: "/rider/deliveries",
      icon: Truck,
      label: "Deliveries",
      badge: availableCount,
    },
    { to: "/rider/earnings", icon: Wallet, label: "Earnings" },
    { to: "/rider/tracking", icon: MapPin, label: "Tracking" },
    { to: "/rider/profile", icon: User, label: "Profile" },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed top-0 left-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 h-16 flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
        <img src="/flanorx.png" alt="Flanorx" className="h-8 w-auto" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Rider
        </span>
      </div>

      {/* Navigation (scrollable) */}
      <nav className="flex-1 min-h-0 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#13ec5b]/10 text-[#13ec5b]"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`
            }
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
          </NavLink>
        ))}

        {/* Switch back to user side */}
        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Home className="h-5 w-5" />
            <span>User Dashboard</span>
          </button>
        </div>
      </nav>

      {/* Bottom actions (pinned) */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === "dark" ? (
            <>
              <Sun className="h-5 w-5" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-5 w-5" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default RiderSidebar;