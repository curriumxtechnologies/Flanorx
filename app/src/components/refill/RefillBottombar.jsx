// components/refill/RefillBottombar.jsx
//
// Mobile bottom bar for the /refill/* route tree.
//
// Primary role precedence (one view shown at a time):
//   admin > station staff/owner > station rider > customer
//
// The 3–4 most-used links for the current role are pinned; everything
// else (plus theme, profile, logout, "back to app") lives in the
// RefillMoreDrawer that this component opens.

import React, { useState } from "react";
import { NavLink } from "react-router";
import { useSelector } from "react-redux";
import {
  MapPin,
  Package,
  PlusCircle,
  Clock,
  Store,
  ClipboardList,
  Users,
  Truck,
  Shield,
  Building2,
  Receipt,
  Menu,
} from "lucide-react";

import RefillMoreDrawer from "./RefillMoreDrawer";
import { useGetProfileQuery } from "../../features/userApiSlice";
import {
  useGetMyRefillOrdersQuery,
  useGetMyRefillApplicationQuery,
  useGetRefillStationOrdersQuery,
  useAdminGetRefillStationsQuery,
} from "../../features/refillApiSlice";

const RefillBottombar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { userInfo } = useSelector((state) => state.auth);
  const { data: profile } = useGetProfileQuery();

  const role = profile?.role || userInfo?.role;
  const isMainAdmin = role === "admin";

  const refillStationId = profile?.refillStation || userInfo?.refillStation;
  const refillRole =
    profile?.refillStationRole || userInfo?.refillStationRole;
  const hasStation = !!refillStationId;

  const isRefillOwner = hasStation && refillRole === "owner";
  const isRefillStaff = hasStation && ["owner", "staff"].includes(refillRole);
  const isRefillRider = hasStation && refillRole === "rider";

  // ─── Application status (only for customer-only users) ───
  const { data: myApplication } = useGetMyRefillApplicationQuery(undefined, {
    skip: hasStation || isMainAdmin,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const appStatus = myApplication?.station?.status || null;
  const hasPendingApplication = appStatus === "pending";

  // ─── Live badges (one poll per role) ─────────────────────
  const onlyCustomer =
    !hasStation && !isMainAdmin;

  const { data: myOrders = [] } = useGetMyRefillOrdersQuery(undefined, {
    skip: !onlyCustomer,
    pollingInterval: 30000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const activeMyOrdersCount = myOrders.filter((o) =>
    ["paid", "accepted", "ready", "delivered"].includes(o.status)
  ).length;

  const { data: stationAwaiting = [] } = useGetRefillStationOrdersQuery(
    { status: "paid" },
    {
      skip: !isRefillStaff,
      pollingInterval: 20000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  const awaitingAcceptanceCount = stationAwaiting.length;

  const { data: pendingStations = [] } = useAdminGetRefillStationsQuery(
    { status: "pending" },
    {
      skip: !isMainAdmin,
      pollingInterval: 30000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  const pendingApplicationsCount = pendingStations.length;

  // ─── Build navItems per primary role ─────────────────────
  let navItems = [];

  if (isMainAdmin) {
    navItems = [
      { to: "/admin/refill", icon: Shield, label: "Refill", end: true },
      {
        to: "/admin/refill/stations",
        icon: Building2,
        label: "Stations",
        badge: pendingApplicationsCount,
      },
      { to: "/admin/refill/invoices", icon: Receipt, label: "Invoices" },
    ];
  } else if (isRefillStaff) {
    navItems = [
      { to: "/refill/station", icon: Store, label: "Station", end: true },
      {
        to: "/refill/station/orders",
        icon: ClipboardList,
        label: "Orders",
        badge: awaitingAcceptanceCount,
      },
    ];
    if (isRefillOwner) {
      navItems.push({
        to: "/refill/station/team",
        icon: Users,
        label: "Team",
      });
    }
  } else if (isRefillRider) {
    navItems = [
      {
        to: "/refill/station/orders",
        icon: Truck,
        label: "Deliveries",
      },
    ];
  } else {
    // Customer-only
    navItems = [
      { to: "/refill", icon: MapPin, label: "Find", end: true },
      {
        to: "/refill/orders",
        icon: Package,
        label: "Orders",
        badge: activeMyOrdersCount,
      },
      hasPendingApplication
        ? { to: "/refill/application", icon: Clock, label: "Pending" }
        : {
            to: "/refill/apply",
            icon: PlusCircle,
            label: "Apply",
          },
    ];
  }

  // "More" is always the last slot
  navItems.push({
    icon: Menu,
    label: "More",
    onClick: () => setDrawerOpen(true),
  });

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
                end={item.end}
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

      <RefillMoreDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
};

export default RefillBottombar;