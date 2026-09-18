// src/components/RouteProgress.jsx
import { useEffect } from "react";
import { useLocation } from "react-router";
import { useProgress } from "../context/ProgressContext";
import TopProgressBar from "./TopProgressBar";

const RouteProgress = () => {
  const location = useLocation();
  const { start, done } = useProgress();

  useEffect(() => {
    start();
    // No data-loaders in this app, so we "settle" after the new
    // route has committed. Pages that fetch data can also call
    // start()/done() themselves for finer control.
    const t = setTimeout(() => done(), 450);
    return () => clearTimeout(t);
  }, [location.pathname, start, done]);

  return <TopProgressBar />;
};

export default RouteProgress;