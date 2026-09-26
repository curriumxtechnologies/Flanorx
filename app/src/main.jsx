// main.jsx
import {
  StrictMode,
  useEffect,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router";
import PullToRefresh from "pulltorefreshjs";
import store from "./store";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";

import usePushNotifications from "./hooks/usePushNotifications.js";
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

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminRiders from "./pages/admin/AdminRiders.jsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import AdminStations from "./pages/admin/AdminStations.jsx";
import Waitlist from "./pages/admin/Waitlist.jsx";
import AdminTerms from "./pages/admin/AdminTerms.jsx";

// Rider
import RiderDashboard from "./pages/rider/RiderDashboard.jsx";
import RiderDeliveries from "./pages/rider/RiderDeliveries.jsx";
import RiderEarnings from "./pages/rider/RiderEarnings.jsx";
import RiderTracking from "./pages/rider/RiderTracking.jsx";
import RiderTrackingId from "./pages/rider/RiderTrackingId.jsx";
import RiderScan from "./pages/rider/RiderScan.jsx";

// Station
import StationDashboard from "./pages/station/StationDashboard.jsx";
import StationOrders from "./pages/station/StationOrders.jsx";
import StationInventory from "./pages/station/StationInventory.jsx";
import StationTeam from "./pages/station/StationTeam.jsx";
import StationRiders from "./pages/station/StationRiders.jsx";

// API slices (needed for pull-to-refresh resetApiState)
import { userApiSlice } from "./features/userApiSlice";
import { orderApiSlice } from "./features/orderApiSlice";
import { trackingApiSlice } from "./features/trackingApiSlice";
import { gasApiSlice } from "./features/gasApiSlice";
import { stationApiSlice } from "./features/stationApiSlice";
import { adminApiSlice } from "./features/adminApiSlice";
import { deliveryApiSlice } from "./features/deliveryApiSlice";

const API_SLICES = [
  userApiSlice,
  orderApiSlice,
  trackingApiSlice,
  gasApiSlice,
  stationApiSlice,
  adminApiSlice,
  deliveryApiSlice,
];

// ═══════════════════════════════════════════════════════════
//  TOP PROGRESS BAR
// ═══════════════════════════════════════════════════════════
const ProgressContext = createContext({ start: () => {}, done: () => {} });
const useProgress = () => useContext(ProgressContext);

const TopBar = ({ progress, visible }) => (
  <div
    aria-hidden="true"
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      zIndex: 99999,
      pointerEvents: "none",
      opacity: visible ? 1 : 0,
      transition: "opacity 200ms ease-out",
    }}
  >
    <div
      style={{
        height: "100%",
        width: `${progress}%`,
        background: "#13ec5b",
        boxShadow: "0 0 10px rgba(19,236,91,0.75)",
        transition: "width 200ms ease-out",
      }}
    />
  </div>
);

const ProgressProvider = ({ children }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);
  const hideTimerRef = useRef(null);
  const activeRef = useRef(0);

  const start = useCallback(() => {
    activeRef.current += 1;
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);

    setVisible(true);
    setProgress(8);

    intervalRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.max(0.4, (90 - p) * 0.08)));
    }, 200);
  }, []);

  const done = useCallback(() => {
    activeRef.current = Math.max(0, activeRef.current - 1);
    if (activeRef.current > 0) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(100);

    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setProgress(0), 220);
    }, 250);
  }, []);

  return (
    <ProgressContext.Provider value={{ start, done }}>
      <TopBar progress={progress} visible={visible} />
      {children}
    </ProgressContext.Provider>
  );
};

// ═══════════════════════════════════════════════════════════
//  BOOT PROGRESS — fires once on app mount, never again.
// ═══════════════════════════════════════════════════════════
const BootProgress = () => {
  const { start, done } = useProgress();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    start();
    const t = setTimeout(() => done(), 900);
    return () => clearTimeout(t);
  }, [start, done]);

  return null;
};

// ═══════════════════════════════════════════════════════════
//  PULL-TO-REFRESH — pure JS, no native spinner.
//  Only this and BootProgress can turn the bar on.
// ═══════════════════════════════════════════════════════════
const PullToRefreshBootstrap = () => {
  const { start, done } = useProgress();
  const ptrRef = useRef(null);

  useEffect(() => {
    ptrRef.current = PullToRefresh.init({
      mainElement: "body",
      triggerElement: "body",
      distThreshold: 70,
      distMax: 110,
      distReload: 60,
      iconArrow: "",
      iconRefreshing: "",
      instructionsPullToRefresh: "",
      instructionsReleaseToRefresh: "",
      instructionsRefreshing: "",
      getMarkup: () => '<div class="ptr--empty"></div>',
      getStyles: () =>
        ".ptr--empty{height:0;overflow:hidden;pointer-events:none;}",
      onRefresh() {
        return new Promise((resolve) => {
          start();

          API_SLICES.forEach((api) => {
            store.dispatch(api.util.resetApiState());
          });

          setTimeout(() => {
            done();
            resolve();
          }, 900);
        });
      },
    });

    return () => {
      PullToRefresh.destroyAll();
      ptrRef.current = null;
    };
  }, [start, done]);

  return null;
};

// ═══════════════════════════════════════════════════════════
//  ROOT LAYOUT
// ═══════════════════════════════════════════════════════════
const RootLayout = () => (
  <>
    <BootProgress />
    <PullToRefreshBootstrap />
    <App />
  </>
);

// ═══════════════════════════════════════════════════════════
//  Push notifications bootstrap
// ═══════════════════════════════════════════════════════════
const PushBootstrap = () => {
  usePushNotifications();
  return <Outlet />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Welcome /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Signup /> },
      {
        element: <PrivateRoute />,
        children: [
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
              { path: "settings", element: <Settings /> },

              { path: "superuser/dashboard", element: <AdminDashboard /> },
              { path: "superuser/orders", element: <AdminOrders /> },
              { path: "superuser/users", element: <AdminUsers /> },
              { path: "superuser/riders", element: <AdminRiders /> },
              { path: "superuser/analytics", element: <AdminAnalytics /> },
              { path: "superuser/settings", element: <AdminSettings /> },
              { path: "superuser/waitlist", element: <Waitlist /> },
              { path: "superuser/stations", element: <AdminStations /> },
              {path: "superuser/terms", element: <AdminTerms />},

              { path: "rider/dashboard", element: <RiderDashboard /> },
              { path: "rider/deliveries", element: <RiderDeliveries /> },
              { path: "rider/earnings", element: <RiderEarnings /> },
              { path: "rider/tracking", element: <RiderTracking /> },
              { path: "rider/tracking/:orderId", element: <RiderTrackingId /> },
              { path: "rider/scan", element: <RiderScan /> },

              { path: "station/dashboard", element: <StationDashboard /> },
              { path: "station/orders", element: <StationOrders /> },
              { path: "station/inventory", element: <StationInventory /> },
              { path: "station/team", element: <StationTeam /> },
              { path: "station/riders", element: <StationRiders /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <StrictMode>
      <ProgressProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </ProgressProvider>
    </StrictMode>
  </Provider>
);