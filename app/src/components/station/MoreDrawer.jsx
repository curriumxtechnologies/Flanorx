// src/components/station/MoreDrawer.jsx
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  LogOut,
  Sun,
  Moon,
  Monitor,
  ArrowLeft,
  Users,
  Truck,
} from "lucide-react";
import { logout } from "../../features/auth/authSlice";
import { useTheme } from "../../context/ThemeContext";
import { apiSlice } from "../../features/apiSlice";

const StationMoreDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.auth);
  const { theme, toggleTheme, setSystemTheme } = useTheme();
  const drawerRef = useRef(null);

  const isStationAdmin = userInfo?.stationRole === "admin";

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

  // ─── Station admin only ──────────────────────────────────
  const adminItems = isStationAdmin
    ? [
        {
          label: "Team",
          icon: Users,
          onClick: () => {
            navigate("/station/team");
            onClose();
          },
        },
        {
          label: "Riders",
          icon: Truck,
          onClick: () => {
            navigate("/station/riders");
            onClose();
          },
        },
      ]
    : [];

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

          {/* Station admin section — only rendered for admins */}
          {adminItems.length > 0 && (
            <>
              <hr className="my-3 border-gray-200 dark:border-gray-800" />
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                Station Admin
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
                </button>
              ))}
            </>
          )}

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

export default StationMoreDrawer;