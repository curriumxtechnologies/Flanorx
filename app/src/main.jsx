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

import NotFound from "./pages/NotFound.jsx";


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