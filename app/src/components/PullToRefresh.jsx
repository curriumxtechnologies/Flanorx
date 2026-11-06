import React, { useEffect, useRef, useState } from "react";
import { Loader2, ArrowDown } from "lucide-react";

const THRESHOLD = 70; // pull distance (px) needed to trigger reload
const MAX_PULL = 120;

const PullToRefresh = () => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pullRef = useRef(0);

  useEffect(() => {
    // true if the touch started inside something that is itself scrolled down
    const insideScrolledElement = (el) => {
      while (el && el !== document.body) {
        if (el.scrollTop > 0) return true;
        el = el.parentElement;
      }
      return false;
    };

    const onStart = (e) => {
      if (refreshing) return;
      const target = e.target;
      const blocked =
        window.scrollY > 0 ||
        insideScrolledElement(target) ||
        target.closest?.(
          ".leaflet-container, .fixed, input, textarea, [data-no-ptr]"
        );
      startY.current = blocked ? null : e.touches[0].clientY;
    };

    const onMove = (e) => {
      if (startY.current == null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const distance = Math.min(MAX_PULL, dy * 0.5); // resistance
      pullRef.current = distance;
      setPull(distance);
    };

    const onEnd = () => {
      if (startY.current == null) return;
      startY.current = null;
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        setTimeout(() => window.location.reload(), 500);
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [refreshing]);

  if (pull === 0 && !refreshing) return null;

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      className="fixed left-0 right-0 z-[100] flex justify-center pointer-events-none"
      style={{
        top: "env(safe-area-inset-top, 0px)",
        transform: `translateY(${pull - 44}px)`,
        transition: refreshing || pull === 0 ? "transform 0.25s ease" : "none",
      }}
    >
      <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
        {refreshing ? (
          <Loader2 className="h-5 w-5 text-[#13ec5b] animate-spin" />
        ) : (
          <ArrowDown
            className="h-5 w-5 text-[#13ec5b]"
            style={{
              opacity: progress,
              transform: `rotate(${progress >= 1 ? 180 : 0}deg)`,
              transition: "transform 0.2s",
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PullToRefresh;