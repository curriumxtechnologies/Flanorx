// components/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  Package,
  Flame,
  Fuel,
  User,
  LogOut,
  Settings,
  Sun,
  Moon,
  MapPin,
  Truck,
  Wallet,
  Repeat,
  Shield,
  Store,
} from "lucide-react";
import { logout } from "../features/auth/authSlice";
import { useTheme } from "../context/ThemeContext";
import { useGetMyOrdersQuery } from "../features/orderApiSlice";
import { useGetProfileQuery } from "../features/userApiSlice";
import { useGetAvailableDeliveriesQuery } from "../features/deliveryApiSlice";
import { useGetRiderApplicationsQuery } from "../features/adminApiSlice";
import { apiSlice } from "../features/apiSlice";

const Sidebar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { theme, toggleTheme } = useTheme();
  const { userInfo } = useSelector((state) => state.auth);

  // Freshest role from API, fallback to Redux
  const { data: profile } = useGetProfileQuery();
  const role = profile?.role || userInfo?.role;
  const isRider = role === "rider";
  const isAdmin = role === "admin";

  // ─── Station membership ───────────────────────────────────
  // The profile response gives us `station` (ObjectId or null) and
  // `stationRole` ("admin" | "staff" | "rider" | null).
  const stationId = profile?.station || userInfo?.station;
  const stationRole = profile?.stationRole || userInfo?.stationRole;
  const isStationAdmin = !!stationId && stationRole === "admin";

  // ─── Polling counts ───────────────────────────────────────
  // Unpaid/pending user orders
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

  // Available deliveries (rider only)
  const { data: availableDeliveries = [] } = useGetAvailableDeliveriesQuery(
    undefined,
    {
      skip: !isRider,
      pollingInterval: 15000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  const availableDeliveriesCount = availableDeliveries.length;

  // Pending rider applications (admin only)
  const { data: pendingApplications = [] } = useGetRiderApplicationsQuery(
    { status: "pending" },
    {
      skip: !isAdmin,
      pollingInterval: 30000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  const pendingAppsCount = pendingApplications.length;

  const handleLogout = () => {
    dispatch(logout());
    dispatch(apiSlice.util.resetApiState());
    navigate("/login", { replace: true });
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    {
      to: "/orders",
      icon: Package,
      label: "Orders",
      badge: pendingOrdersCount,
    },
    { to: "/order/fuel", icon: Fuel, label: "Fuel" },
    { to: "/order/gas", icon: Flame, label: "Gas" },
    { to: "/gas/subscription", icon: Repeat, label: "Gas Subscription" },
    { to: "/tracking", icon: MapPin, label: "Tracking" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  const riderLinks = [
    {
      to: "/rider/deliveries",
      icon: Truck,
      label: "Deliveries",
      badge: availableDeliveriesCount,
    },
    { to: "/rider/earnings", icon: Wallet, label: "Earnings" },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed top-0 left-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 h-16 flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
        <img src="/flanorx.png" alt="Flanorx" className="h-8 w-auto" />
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

        {/* ─── Station Admin section ───────────────────────── */}
        {isStationAdmin && (
          <>
            <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="px-4 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Station
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/station/dashboard")}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-[#13ec5b] bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 transition-colors"
            >
              <Store className="h-5 w-5" />
              <span>Station Dashboard</span>
            </button>
          </>
        )}

        {isRider && (
          <>
            <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="px-4 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Rider
              </p>
            </div>
            {riderLinks.map((item) => (
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
            <button
              type="button"
              onClick={() => navigate("/rider/dashboard")}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-[#13ec5b] bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 transition-colors"
            >
              <Truck className="h-5 w-5" />
              <span>Rider Dashboard</span>
            </button>
          </>
        )}

        {isAdmin && (
          <>
            <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="px-4 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Admin
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/superuser/dashboard")}
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

export default Sidebar;