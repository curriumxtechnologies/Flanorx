// src/components/InfiniteScroll.jsx
import { useEffect, useRef } from "react";
import { useProgress } from "../context/ProgressContext";

/**
 * Scroll-to-load-more wrapper.
 *
 * Props:
 *   onLoadMore  — async fn called when the sentinel enters the viewport
 *   hasMore     — boolean, stop observing when false
 *   isLoading   — boolean, prevents duplicate triggers
 *   rootMargin  — how far before the bottom to trigger (default 250px)
 *   className   — applied to the wrapper div
 *
 * Automatically drives the global TopProgressBar while isLoading is true.
 */
const InfiniteScroll = ({
  onLoadMore,
  hasMore = true,
  isLoading = false,
  rootMargin = "250px",
  className = "",
  children,
}) => {
  const { start, done } = useProgress();
  const sentinelRef = useRef(null);
  const loadingRef = useRef(isLoading);
  const prevLoadingRef = useRef(false);

  // Keep loadingRef fresh so observer callback stays stable
  loadingRef.current = isLoading;

  // Drive the top progress bar from isLoading
  useEffect(() => {
    if (isLoading && !prevLoadingRef.current) start();
    if (!isLoading && prevLoadingRef.current) done();
    prevLoadingRef.current = isLoading;
  }, [isLoading, start, done]);

  // Observe sentinel
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          onLoadMore();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, rootMargin]);

  return (
    <div className={className}>
      {children}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </div>
  );
};

export default InfiniteScroll;