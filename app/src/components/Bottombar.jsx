// components/Bottombar.jsx
import React, { useState } from "react";
import { NavLink } from "react-router";
import { useSelector } from "react-redux";
import {
  LayoutDashboard,
  Package,
  Flame,
  Fuel,
  Menu,
} from "lucide-react";
import { useGetMyOrdersQuery } from "../features/orderApiSlice";
import { useGetProfileQuery } from "../features/userApiSlice";
import MoreDrawer from "./MoreDrawer";

const Bottombar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { userInfo } = useSelector((state) => state.auth);

  // Freshest role from API, fallback to Redux
  const { data: profile } = useGetProfileQuery();
  const role = profile?.role || userInfo?.role;

  // Poll every 30s for unpaid/pending orders
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

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
    {
      to: "/orders",
      icon: Package,
      label: "Orders",
      badge: pendingOrdersCount,
    },
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            if (item.onClick) {
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
                <span className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </span>
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