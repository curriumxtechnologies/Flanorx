// components/admin/Bottombar.jsx
import React, { useState } from "react";
import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Menu,
} from "lucide-react";
import AdminMoreDrawer from "./MoreDrawer";
import {
  useGetDashboardStatsQuery,
  useGetRiderApplicationsQuery,
} from "../../features/adminApiSlice";

const Bottombar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const navItems = [
    { to: "/superuser/dashboard", icon: LayoutDashboard, label: "Home" },
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
    {
      icon: Menu,
      label: "More",
      onClick: () => setDrawerOpen(true),
    },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            if (item.onClick) {
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="relative flex flex-col items-center justify-center py-1 px-3 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
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

      <AdminMoreDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
};

export default Bottombar;