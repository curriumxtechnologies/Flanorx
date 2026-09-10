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
} from "lucide-react";
import { logout } from "../features/auth/authSlice";
import { useTheme } from "../context/ThemeContext";

const Sidebar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { theme, toggleTheme } = useTheme();
  const { userInfo } = useSelector((state) => state.auth);
  const isRider = userInfo?.role === "rider";

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("flanorx_auth");
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/orders", icon: Package, label: "Orders" },
    { to: "/order/fuel", icon: Fuel, label: "Fuel" },
    { to: "/order/gas", icon: Flame, label: "Gas" },
    { to: "/gas/subscription", icon: Repeat, label: "Gas Subscription" },
    { to: "/tracking", icon: MapPin, label: "Tracking" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  // Rider-specific links
  const riderLinks = [
    { to: "/rider/deliveries", icon: Truck, label: "Deliveries" },
    { to: "/rider/earnings", icon: Wallet, label: "Earnings" },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed top-0 left-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 h-16 border-b border-gray-200 dark:border-gray-800">
        <img src="/flanorx.png" alt="Flanorx" className="h-8 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#13ec5b]/10 text-[#13ec5b]"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Rider-specific links */}
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
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#13ec5b]/10 text-[#13ec5b]"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
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