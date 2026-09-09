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
} from "lucide-react";
import { logout } from "../../features/auth/authSlice";
import { useTheme } from "../../context/ThemeContext";

const Sidebar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("flanorx_auth");
    navigate("/login");
  };

  const navItems = [
    { to: "/superuser/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/superuser/orders", icon: Package, label: "Orders" },
    { to: "/superuser/users", icon: Users, label: "Users" },
    { to: "/superuser/riders", icon: Truck, label: "Riders" },
    { to: "/superuser/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/superuser/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:min-h-screen bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 fixed top-0 left-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 h-16 border-b border-gray-200 dark:border-gray-800">
        <img src="/flanorx.png" alt="Flanorx" className="h-8 w-auto" />
        {/* "Admin" text removed */}
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

        {/* Divider */}
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
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
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