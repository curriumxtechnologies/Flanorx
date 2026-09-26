// src/components/PrivateRoute.jsx
import React, { useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useSelector } from "react-redux";
import { TermsModalProvider } from "./TermsModalProvider";

const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return true;
    const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    if (!payload.exp) return false;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp < nowInSeconds;
  } catch {
    return true;
  }
};

const PrivateRoute = () => {
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);

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

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("flanorx_auth");
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <TermsModalProvider>
      <Outlet />
    </TermsModalProvider>
  );
};

export default PrivateRoute;