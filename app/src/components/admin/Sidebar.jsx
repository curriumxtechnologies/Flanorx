// components/admin/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Settings,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  ArrowLeft,
  ClipboardList,
} from "lucide-react";
import { logout } from "../../features/auth/authSlice";
import { useTheme } from "../../context/ThemeContext";
import { apiSlice } from "../../features/apiSlice";
import {
  useGetDashboardStatsQuery,
  useGetRiderApplicationsQuery,
} from "../../features/adminApiSlice";

const Sidebar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { theme, toggleTheme } = useTheme();

  // Live counts
  const { data: stats } = useGetDashboardStatsQuery(undefined, {
    pollingInterval: 30000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const { data: pendingApplications = [] } = useGetRiderApplicationsQuery(
    { status: "pending" },
    {
      pollingInterval: 30000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );

  const pendingOrdersCount = stats?.pendingOrders || 0;
  const pendingAppsCount = pendingApplications.length;

  const handleLogout = () => {
    dispatch(logout());
    dispatch(apiSlice.util.resetApiState());
    navigate("/login", { replace: true });
  };

  const navItems = [
    { to: "/superuser/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    {
      to: "/superuser/orders",
      icon: Package,
      label: "Orders",
      badge: pendingOrdersCount,
    },
    { to: "/superuser/users", icon: Users, label: "Users" },
    {
      to: "/superuser/riders",
      icon: Truck,
      label: "Riders",
      badge: pendingAppsCount,
    },
    { to: "/superuser/waitlist", icon: ClipboardList, label: "Waitlist" },
    { to: "/superuser/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/superuser/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:h-screen bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 fixed top-0 left-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 h-16 flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
        <img src="/flanorx.png" alt="Flanorx" className="h-8 w-auto" />
      </div>

      {/* Navigation */}
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

        {/* Divider + User Dashboard shortcut */}
        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>User Dashboard</span>
          </button>
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
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