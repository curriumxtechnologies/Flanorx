// main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
} from "react-router";
import store from "./store";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";

// Push notifications bootstrap
import usePushNotifications from "./hooks/usePushNotifications.js";

// Layout
import App from "./App.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";

// Public pages
import Welcome from "./pages/Welcome.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import NotFound from "./pages/NotFound.jsx";

// User pages
import Dashboard from "./pages/Dashboard.jsx";
import Orders from "./pages/Orders.jsx";
import OrderDetail from "./pages/OrderDetail.jsx";
import Fuel from "./pages/Fuel.jsx";
import Gas from "./pages/Gas.jsx";
import GasSubscription from "./pages/GasSubscription.jsx";
import Tracking from "./pages/Tracking.jsx";
import TrackingId from "./pages/TrackingId.jsx";
import Profile from "./pages/Profile.jsx";
import RiderApplication from "./pages/RiderApplication.jsx";
import PaymentSuccess from "./pages/PaymentSuccess.jsx";
import Settings from "./pages/Settings.jsx";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminRiders from "./pages/admin/AdminRiders.jsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import AdminStations from "./pages/admin/AdminStations.jsx";
import Waitlist from "./pages/admin/Waitlist.jsx";

// Rider pages
import RiderDashboard from "./pages/rider/RiderDashboard.jsx";
import RiderDeliveries from "./pages/rider/RiderDeliveries.jsx";
import RiderEarnings from "./pages/rider/RiderEarnings.jsx";
import RiderTracking from "./pages/rider/RiderTracking.jsx";
import RiderTrackingId from "./pages/rider/RiderTrackingId.jsx";
import RiderScan from "./pages/rider/RiderScan.jsx";

// Station pages
import StationDashboard from "./pages/station/StationDashboard.jsx";
import StationOrders from "./pages/station/StationOrders.jsx";
import StationInventory from "./pages/station/StationInventory.jsx";
import StationTeam from "./pages/station/StationTeam.jsx";
import StationRiders from "./pages/station/StationRiders.jsx";

// ═══════════════════════════════════════════════════════════
//  Push notifications bootstrap
//
//  Renders nothing — just wires up:
//    • auto-registration on login (if permission already granted)
//    • foreground message listener (shows in-app toast)
//    • mobile notification tap handler (navigates on tap)
//
//  Mounted as a layout route so its effects only run for
//  authenticated users. Unmounts cleanly on logout.
// ═══════════════════════════════════════════════════════════
const PushBootstrap = () => {
  usePushNotifications();
  return <Outlet />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // ─── Public ─────────────────────────────────────────
      { index: true, element: <Welcome /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Signup /> },

      // ─── Protected (any logged-in user) ─────────────────
      {
        element: <PrivateRoute />,
        children: [
          // Push notification side effects live here.
          // Every route below renders inside this wrapper,
          // so the hook stays mounted for the whole session.
          {
            element: <PushBootstrap />,
            children: [
              { path: "dashboard", element: <Dashboard /> },
              { path: "orders", element: <Orders /> },
              { path: "order/:orderId", element: <OrderDetail /> },
              { path: "order/fuel", element: <Fuel /> },
              { path: "order/gas", element: <Gas /> },
              { path: "gas/subscription", element: <GasSubscription /> },
              { path: "tracking", element: <Tracking /> },
              { path: "tracking/:orderId", element: <TrackingId /> },
              { path: "profile", element: <Profile /> },
              { path: "rider/apply", element: <RiderApplication /> },
              { path: "payment/success", element: <PaymentSuccess /> },
              {path: "settings", element: <Settings /> },

              // Admin
              { path: "superuser/dashboard", element: <AdminDashboard /> },
              { path: "superuser/orders", element: <AdminOrders /> },
              { path: "superuser/users", element: <AdminUsers /> },
              { path: "superuser/riders", element: <AdminRiders /> },
              { path: "superuser/analytics", element: <AdminAnalytics /> },
              { path: "superuser/settings", element: <AdminSettings /> },
              { path: "superuser/waitlist", element: <Waitlist /> },
              { path: "superuser/stations", element: <AdminStations /> },

              // Rider
              { path: "rider/dashboard", element: <RiderDashboard /> },
              { path: "rider/deliveries", element: <RiderDeliveries /> },
              { path: "rider/earnings", element: <RiderEarnings /> },
              { path: "rider/tracking", element: <RiderTracking /> },
              { path: "rider/tracking/:orderId", element: <RiderTrackingId /> },
              { path: "rider/scan", element: <RiderScan /> },

              // Station
              { path: "station/dashboard", element: <StationDashboard /> },
              { path: "station/orders", element: <StationOrders /> },
              { path: "station/inventory", element: <StationInventory /> },
              { path: "station/team", element: <StationTeam /> },
              { path: "station/riders", element: <StationRiders /> },
            ],
          },
        ],
      },

      // ─── 404 ────────────────────────────────────────────
      { path: "*", element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <StrictMode>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </StrictMode>
  </Provider>
);