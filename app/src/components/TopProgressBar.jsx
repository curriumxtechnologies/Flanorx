// src/components/TopProgressBar.jsx
import { useProgress } from "../context/ProgressContext";

const TopProgressBar = () => {
  const { progress, visible } = useProgress();

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
      }}
    >
      <div
        className="h-full bg-[#13ec5b]"
        style={{
          width: `${progress}%`,
          transition: "width 200ms ease-out",
          boxShadow: "0 0 10px rgba(19, 236, 91, 0.75)",
        }}
      />
    </div>
  );
};

export default TopProgressBar;