// src/context/ProgressContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

const ProgressContext = createContext(null);

export const useProgress = () => {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error("useProgress must be used inside <ProgressProvider>");
  }
  return ctx;
};

export const ProgressProvider = ({ children }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);
  const hideTimerRef = useRef(null);

  const start = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);

    setVisible(true);
    setProgress(8);

    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const remaining = 90 - p;
        // Fast at first, slows as it approaches 90%
        return p + Math.max(0.4, remaining * 0.08);
      });
    }, 200);
  }, []);

  const done = useCallback(() => {
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
    <ProgressContext.Provider value={{ progress, visible, start, done }}>
      {children}
    </ProgressContext.Provider>
  );
};