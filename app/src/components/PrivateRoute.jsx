// src/components/PrivateRoute.jsx
import React, { useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useSelector } from "react-redux";

// ─── Decode JWT and check expiry ────────────────────────────
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return true;

    // Handle base64url → base64
    const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));

    if (!payload.exp) return false; // no exp = treat as valid
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp < nowInSeconds;
  } catch {
    return true; // malformed token = expired
  }
};

const PrivateRoute = () => {
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);

  // Prefer Redux state, fallback to localStorage
  const authData = useMemo(() => {
    if (userInfo?.token) return userInfo;
    try {
      const stored = localStorage.getItem("flanorx_auth");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [userInfo]);

  const token = authData?.token;

  // ─── No token / expired → login ──────────────────────────
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("flanorx_auth");
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // ─── Authorized → render nested routes ───────────────────
  return <Outlet />;
};

export default PrivateRoute;