// src/utils/pushManager.js
import { Capacitor } from "@capacitor/core";
import {
  getWebPushToken,
  isWebPushSupported,
  listenForegroundWebMessages,
} from "./pushNotification";
import {
  getMobilePushToken,
  isNativePushSupported,
  listenForegroundMobileMessages,
  listenMobileNotificationTap,
} from "./mobilePushNotification";

const TOKEN_STORAGE_KEY = "flanorx_fcm_token";

// ─── Which platform are we on? ────────────────────────────
export const getPushPlatform = () => {
  if (Capacitor.isNativePlatform()) {
    const p = Capacitor.getPlatform(); // "android" | "ios"
    return p === "ios" ? "ios" : "android";
  }
  return "web";
};

// ─── Get the token for whichever platform ─────────────────
export const getPushToken = async () => {
  if (isNativePushSupported()) {
    return getMobilePushToken();
  }
  return getWebPushToken();
};

export const isPushSupported = async () => {
  if (isNativePushSupported()) return true;
  return isWebPushSupported();
};

// ─── Persist token locally (for logout unregister) ───────
export const cachePushToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // private mode — non-fatal
  }
};

export const getCachedPushToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const clearCachedPushToken = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
};

// ─── Listen for foreground messages (both platforms) ─────
export const listenForegroundMessages = async (handler) => {
  if (isNativePushSupported()) {
    return listenForegroundMobileMessages(handler);
  }
  return listenForegroundWebMessages(handler);
};

// ─── Listen for notification taps (mobile only) ──────────
export const listenNotificationTaps = async (handler) => {
  if (!isNativePushSupported()) {
    // On web, Firebase handles this itself — browser opens the tab
    return () => {};
  }
  return listenMobileNotificationTap(handler);
};