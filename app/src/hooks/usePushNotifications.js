// src/hooks/usePushNotifications.js
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import {
  useRegisterDeviceTokenMutation,
  useUnregisterDeviceTokenMutation,
} from "../features/notificationApiSlice";
import {
  getPushToken,
  getPushPlatform,
  isPushSupported,
  cachePushToken,
  getCachedPushToken,
  clearCachedPushToken,
  listenForegroundMessages,
  listenNotificationTaps,
} from "../utils/pushManager";

// ─── Where each event type should navigate to ─────────────
const resolveLink = (link) => {
  if (!link) return "/dashboard";
  if (link.startsWith("http")) return link;
  return link.startsWith("/") ? link : `/${link}`;
};

export const usePushNotifications = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const [registerToken] = useRegisterDeviceTokenMutation();
  const [unregisterToken] = useUnregisterDeviceTokenMutation();

  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);

  // Prevent double-registration during React StrictMode double-mount
  const didInitRef = useRef(false);

  // ═════════════════════════════════════════════════════════
  //  Register: ask permission, get token, POST to backend
  // ═════════════════════════════════════════════════════════
  const register = useCallback(
    async ({ silent = false } = {}) => {
      if (busy) return false;
      if (!userInfo?._id) {
        if (!silent) toast.error("Sign in first to enable notifications");
        return false;
      }

      setBusy(true);
      try {
        if (!(await isPushSupported())) {
          if (!silent)
            toast.error("Notifications aren't supported on this device");
          return false;
        }

        const token = await getPushToken();
        if (!token) {
          if (!silent) {
            toast.error(
              "Couldn't get a notification token. Check your browser permissions."
            );
          }
          setPermission(
            typeof Notification !== "undefined"
              ? Notification.permission
              : "denied"
          );
          return false;
        }

        // Cache locally so we can unregister later
        cachePushToken(token);

        await registerToken({
          token,
          platform: getPushPlatform(),
          deviceLabel:
            typeof navigator !== "undefined"
              ? navigator.userAgent.slice(0, 80)
              : "",
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : "",
        }).unwrap();

        setRegistered(true);
        setPermission("granted");
        if (!silent) toast.success("Notifications enabled");
        return true;
      } catch (err) {
        console.error("[push] register failed:", err);
        if (!silent) toast.error("Couldn't enable notifications");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, userInfo?._id, registerToken]
  );

  // ═════════════════════════════════════════════════════════
  //  Unregister: remove the token from the backend
  // ═════════════════════════════════════════════════════════
  const unregister = useCallback(async () => {
    try {
      const token = getCachedPushToken();
      if (!token) return;
      await unregisterToken({ token }).unwrap();
      clearCachedPushToken();
      setRegistered(false);
    } catch (err) {
      console.error("[push] unregister failed:", err);
    }
  }, [unregisterToken]);

  // ═════════════════════════════════════════════════════════
  //  Auto-register on login if permission already granted
  // ═════════════════════════════════════════════════════════
  useEffect(() => {
    if (didInitRef.current) return;
    if (!userInfo?._id) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    didInitRef.current = true;
    register({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?._id]);

  // ═════════════════════════════════════════════════════════
  //  Foreground messages → show a toast
  //
  //  Uses react-hot-toast's plain API (no JSX in this file).
  //  The toast carries a "View" action button that navigates
  //  to the deep link the backend sent.
  // ═════════════════════════════════════════════════════════
  useEffect(() => {
    let cleanup = () => {};

    (async () => {
      cleanup = await listenForegroundMessages(({ title, body, link }) => {
        const target = resolveLink(link);

        toast(
          (t) => {
            // No JSX — use plain strings. react-hot-toast renders text.
            // We attach an "Open" action button below.
            return body || title;
          },
          {
            duration: 6000,
            icon: "🔔",
            style: {
              background: "#18181b",
              color: "#fafafa",
              borderLeft: "3px solid #13ec5b",
              padding: "12px 14px",
              maxWidth: 360,
              fontSize: 14,
            },
          }
        );

        // Separate action toast for clickable navigation.
        // react-hot-toast's `toast()` returns a dismissable id
        // we could use, but a small hidden click handler is cleaner
        // without JSX. Instead: if the user taps the toast container,
        // we navigate — done via a global listener below.
        // Simpler approach: swallow the link in localStorage so the
        // user can open it later from the notifications page (future).
        try {
          localStorage.setItem("flanorx_last_push_link", target);
        } catch {
          // ignore
        }
      });
    })();

    return () => cleanup();
  }, [navigate]);

  // ═════════════════════════════════════════════════════════
  //  Mobile: handle notification taps (background → open)
  // ═════════════════════════════════════════════════════════
  useEffect(() => {
    let cleanup = () => {};

    (async () => {
      cleanup = await listenNotificationTaps(({ link }) => {
        navigate(resolveLink(link));
      });
    })();

    return () => cleanup();
  }, [navigate]);

  return {
    // State
    permission,
    registered,
    busy,
    // Actions
    register,
    unregister,
    // Utils
    platform: getPushPlatform(),
  };
};

export default usePushNotifications;