// components/Bottombar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import {
  LayoutDashboard,
  Package,
  Flame,
  Fuel,
  Menu,
} from "lucide-react";
import { logout } from "../features/auth/authSlice";
import MoreDrawer from "./MoreDrawer";

const Bottombar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("flanorx_auth");
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { to: "/orders", icon: Package, label: "Orders" },
    { to: "/order/fuel", icon: Fuel, label: "Fuel" },
    { to: "/order/gas", icon: Flame, label: "Gas" },
    {
      icon: Menu,
      label: "More",
      onClick: () => setDrawerOpen(true),
    },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            if (item.onClick) {
              // "More" button
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
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                    isActive
                      ? "text-[#13ec5b]"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <MoreDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

export default Bottombar;