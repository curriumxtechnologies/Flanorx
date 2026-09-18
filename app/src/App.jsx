import React from "react";
import { Outlet } from "react-router";
import { Toaster } from "react-hot-toast";


const App = () => {
  return (
    <div>
      <Outlet />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#ffffff",
            color: "#1a1a1a",
            borderRadius: "12px",
            padding: "14px 18px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
            fontSize: "14px",
            fontWeight: "500",
            border: "1px solid #e5e7eb",
          },
          success: {
            style: {
              background: "#f0fdf4",
              border: "1px solid #13ec5b",
              color: "#166534",
            },
            iconTheme: {
              primary: "#13ec5b",
              secondary: "#ffffff",
            },
          },
          error: {
            style: {
              background: "#fef2f2",
              border: "1px solid #ef4444",
              color: "#991b1b",
            },
            iconTheme: {
              primary: "#ef4444",
              secondary: "#ffffff",
            },
          },
        }}
      />
    </div>
  );
};

export default App;