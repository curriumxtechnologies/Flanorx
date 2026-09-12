// src/utils/mobilePushNotification.js
import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";

// ─── Only relevant on native ──────────────────────────────
export const isNativePushSupported = () =>
  Capacitor.isNativePlatform() &&
  (Capacitor.getPlatform() === "android" || Capacitor.getPlatform() === "ios");

// ─── Request permission + return token ────────────────────
export const getMobilePushToken = async () => {
  try {
    if (!isNativePushSupported()) {
      console.warn("[push:mobile] not running on a native platform");
      return null;
    }

    const perm = await FirebaseMessaging.requestPermissions();
    if (perm.receive !== "granted") {
      console.warn("[push:mobile] permission not granted");
      return null;
    }

    const { token } = await FirebaseMessaging.getToken();
    if (!token) {
      console.warn("[push:mobile] no token returned");
      return null;
    }

    return token;
  } catch (err) {
    console.error("[push:mobile] getMobilePushToken failed:", err);
    return null;
  }
};

// ─── Listen for foreground messages ───────────────────────
// Returns a cleanup function
export const listenForegroundMobileMessages = async (handler) => {
  try {
    if (!isNativePushSupported()) return () => {};

    const sub = await FirebaseMessaging.addListener(
      "notificationReceived",
      (event) => {
        const title = event?.notification?.title || "Flanorx";
        const body = event?.notification?.body || "";
        const link = event?.notification?.data?.link || "/dashboard";
        handler({ title, body, link, raw: event });
      }
    );

    return () => sub.remove();
  } catch (err) {
    console.error("[push:mobile] listenForegroundMobileMessages failed:", err);
    return () => {};
  }
};

// ─── Listen for taps on notifications (background → open) ─
// Returns a cleanup function
export const listenMobileNotificationTap = async (handler) => {
  try {
    if (!isNativePushSupported()) return () => {};

    const sub = await FirebaseMessaging.addListener(
      "notificationActionPerformed",
      (event) => {
        const link = event?.notification?.data?.link || "/dashboard";
        handler({ link, raw: event });
      }
    );

    return () => sub.remove();
  } catch (err) {
    console.error("[push:mobile] listenMobileNotificationTap failed:", err);
    return () => {};
  }
};

// ─── Local scheduling (e.g. "don't forget to open the app") ─
export const scheduleLocalNotification = async ({
  title,
  body,
  link = "/dashboard",
}) => {
  try {
    if (!isNativePushSupported()) return;

    await FirebaseMessaging.createChannel?.({
      id: "flanorx_default",
      name: "Flanorx",
      importance: 5,
      visibility: 1,
    });

    // If your plugin version doesn't have createChannel, skip it.
  } catch {
    // ignore — channel is optional
  }
};