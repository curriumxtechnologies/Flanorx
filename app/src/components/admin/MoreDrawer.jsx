// components/admin/MoreDrawer.jsx
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import {
  X,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  LayoutDashboard,
  Package,
  Users,
  Truck,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import { logout } from "../../features/auth/authSlice";
import { useTheme } from "../../context/ThemeContext";
import { apiSlice } from "../../features/apiSlice";
import {
  useGetDashboardStatsQuery,
  useGetRiderApplicationsQuery,
} from "../../features/adminApiSlice";

const AdminMoreDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { theme, toggleTheme, setSystemTheme } = useTheme();
  const drawerRef = useRef(null);

  // Live counts (skip when drawer closed to save bandwidth)
  const { data: stats } = useGetDashboardStatsQuery(undefined, {
    skip: !isOpen,
    pollingInterval: 30000,
    refetchOnFocus: true,
  });
  const { data: pendingApplications = [] } = useGetRiderApplicationsQuery(
    { status: "pending" },
    {
      skip: !isOpen,
      pollingInterval: 30000,
      refetchOnFocus: true,
    }
  );

  const pendingOrdersCount = stats?.pendingOrders || 0;
  const pendingAppsCount = pendingApplications.length;

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

  const handleLogout = () => {
    onClose();
    dispatch(logout());
    dispatch(apiSlice.util.resetApiState());
    navigate("/login", { replace: true });
  };

  const adminItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      onClick: () => {
        navigate("/superuser/dashboard");
        onClose();
      },
    },
    {
      label: "Orders",
      icon: Package,
      badge: pendingOrdersCount,
      onClick: () => {
        navigate("/superuser/orders");
        onClose();
      },
    },
    {
      label: "Users",
      icon: Users,
      onClick: () => {
        navigate("/superuser/users");
        onClose();
      },
    },
    {
      label: "Riders",
      icon: Truck,
      badge: pendingAppsCount,
      onClick: () => {
        navigate("/superuser/riders");
        onClose();
      },
    },
    {
      label: "Analytics",
      icon: BarChart3,
      onClick: () => {
        navigate("/superuser/analytics");
        onClose();
      },
    },
    {
      label: "Settings",
      icon: Settings,
      onClick: () => {
        navigate("/superuser/settings");
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
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
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
          {/* Theme */}
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Theme
          </p>
          <button
            onClick={() => {
              toggleTheme();
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
              toggleTheme();
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

          {/* Admin section */}
          <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
            Admin
          </p>
          {adminItems.map((item) => (
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

          {/* Switch back to user side */}
          <hr className="my-3 border-gray-200 dark:border-gray-800" />
          <button
            onClick={() => {
              navigate("/dashboard");
              onClose();
            }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-[#13ec5b] bg-[#13ec5b]/10 hover:bg-[#13ec5b]/20 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>User Dashboard</span>
          </button>

          {/* Logout */}
          <hr className="my-3 border-gray-200 dark:border-gray-800" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default AdminMoreDrawer;