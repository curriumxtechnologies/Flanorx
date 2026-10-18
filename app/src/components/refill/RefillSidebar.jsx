// components/refill/RefillSidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  Store,
  MapPin,
  Package,
  Users,
  Receipt,
  User,
  Settings,
  Sun,
  Moon,
  Shield,
  Building2,
  PlusCircle,
  Clock,
  ClipboardList,
  Truck,
} from "lucide-react";

// ─── Corrected Paths ─────────────────────────────────────
import { useTheme } from "../../context/ThemeContext";
import { useGetProfileQuery } from "../../features/userApiSlice";
import {
  useGetMyRefillOrdersQuery,
  useGetMyRefillApplicationQuery,
  useGetRefillStationOrdersQuery,
  useAdminGetRefillStationsQuery,
} from "../../features/refillApiSlice";
import LogoutButton from "../../utils/logoutBtn";

const RefillSidebar = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
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

  const { data: myApplication } = useGetMyRefillApplicationQuery(undefined, {
    skip: hasStation,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const appStatus = myApplication?.station?.status || null; 
  const hasPendingApplication = appStatus === "pending";
  const hasRejectedApplication = appStatus === "rejected";

  const { data: myOrders = [] } = useGetMyRefillOrdersQuery(undefined, {
    skip: !hasStation && hasPendingApplication,
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

  const { data: pendingRefillStations = [] } = useAdminGetRefillStationsQuery(
    { status: "pending" },
    {
      skip: !isMainAdmin,
      pollingInterval: 30000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  const pendingRefillAppsCount = pendingRefillStations.length;

  const customerLinks = [
    { to: "/refill", icon: MapPin, label: "Find Stations", end: true },
    {
      to: "/refill/orders",
      icon: Package,
      label: "My Refill Orders",
      badge: activeMyOrdersCount,
    },
  ];

  if (!hasStation && !hasPendingApplication && !isMainAdmin) {
    customerLinks.push({
      to: "/refill/apply",
      icon: PlusCircle,
      label: hasRejectedApplication ? "Re-apply as Station" : "Apply as Station",
    });
  }
  if (!hasStation && hasPendingApplication) {
    customerLinks.push({
      to: "/refill/application",
      icon: Clock,
      label: "Application Pending",
    });
  }

  const stationLinks = [
    {
      to: "/refill/station",
      icon: Store,
      label: "Station Dashboard",
      end: true,
    },
    {
      to: "/refill/station/orders",
      icon: ClipboardList,
      label: "Orders",
      badge: awaitingAcceptanceCount,
    },
  ];

  if (isRefillOwner) {
    stationLinks.push(
      { to: "/refill/station/team", icon: Users, label: "Team" },
      {
        to: "/refill/station/commission",
        icon: Receipt,
        label: "Commission",
      },
      {
        to: "/refill/station/profile",
        icon: Settings,
        label: "Station Profile",
      }
    );
  }

  const adminLinks = [
    {
      to: "/admin/refill",
      icon: Shield,
      label: "Refill Admin",
      end: true,
    },
    {
      to: "/admin/refill/stations",
      icon: Building2,
      label: "Stations",
      badge: pendingRefillAppsCount,
    },
    { to: "/admin/refill/invoices", icon: Receipt, label: "Invoices" },
    { to: "/admin/refill/orders", icon: Package, label: "Orders" },
    { to: "/admin/refill/settings", icon: Settings, label: "Settings" },
  ];

  const sectionHeader = (label) => (
    <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
      <p className="px-4 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );

  const renderLink = (item, { purple = false } = {}) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? purple
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300"
              : "bg-[#13ec5b]/10 text-[#13ec5b]"
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
  );

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed top-0 left-0 z-40">
      <div className="flex items-center gap-2 px-6 h-16 flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
        <img src="/flanorx.png" alt="Flanorx" className="h-8 w-auto" />
        <span className="ml-auto px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#13ec5b] bg-[#13ec5b]/10 rounded">
          Refill
        </span>
      </div>

      <nav className="flex-1 min-h-0 px-4 py-6 space-y-1 overflow-y-auto">
        {customerLinks.map((item) => renderLink(item))}

        {isRefillStaff && (
          <>
            {sectionHeader("My Station")}
            {stationLinks.map((item) => renderLink(item))}
          </>
        )}

        {isRefillRider && (
          <>
            {sectionHeader("Rider")}
            {renderLink({
              to: "/refill/station/orders",
              icon: Truck,
              label: "My Deliveries",
            })}
          </>
        )}

        {isMainAdmin && (
          <>
            {sectionHeader("Admin")}
            {adminLinks.map((item) => renderLink(item, { purple: true }))}
          </>
        )}
      </nav>

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
          onClick={() => navigate("/refill/profile")}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </button>

        <LogoutButton className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" />
      </div>
    </aside>
  );
};

export default RefillSidebar;