// main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router";  // core router
import store from "./store";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";

// Pages
import App from "./App.jsx";
import Welcome from "./pages/Welcome.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Orders from "./pages/Orders.jsx";
import Fuel from "./pages/Fuel.jsx"; 
import Gas from "./pages/Gas.jsx";
import Tracking from "./pages/Tracking.jsx";
import Profile from "./pages/Profile.jsx";
import RiderApplication from "./pages/RiderApplication.jsx";

import NotFound from "./pages/NotFound.jsx";


//Admin 
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminRiders from "./pages/admin/AdminRiders.jsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";


//rider
import RiderDashboard from "./pages/rider/RiderDashboard.jsx";


const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Welcome /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Signup /> },
      { path: "dashboard", element: <Dashboard /> },
      {path: "orders", element: <Orders />},
      {path: "order/fuel", element: <Fuel />},
      {path: "order/gas", element: <Gas />},
      {path: "profile", element: <Profile />},
      {path: "*", element: <NotFound />},
      {path: "tracking", element: <Tracking />},
      {path: "rider/apply", element: <RiderApplication />},

      //Admin
      {path: "superuser/dashboard", element: <AdminDashboard />},
      {path: "superuser/orders", element: <AdminOrders />},
      {path: "superuser/users", element: <AdminUsers />},
      {path: "superuser/riders", element: <AdminRiders />},
      {path: "superuser/analytics", element: <AdminAnalytics />},
      {path: "superuser/settings", element: <AdminSettings />},


      {path: "rider/dashboard", element: <RiderDashboard />},
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