// src/utils/pushNotification.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// ─── Lazy app init ────────────────────────────────────────
const getFirebaseApp = () => {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
};

// ─── Is web push even supported here? ─────────────────────
export const isWebPushSupported = async () => {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("Notification" in window)) return false;
  if (!("PushManager" in window)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
};

// ─── Ask for permission + return token ────────────────────
export const getWebPushToken = async () => {
  try {
    if (!(await isWebPushSupported())) {
      console.warn("[push:web] not supported in this browser");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[push:web] permission not granted");
      return null;
    }

    const app = getFirebaseApp();
    const messaging = getMessaging(app);

    // Register the service worker before getting the token
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn("[push:web] no token returned");
      return null;
    }

    return token;
  } catch (err) {
    console.error("[push:web] getWebPushToken failed:", err);
    return null;
  }
};

// ─── Foreground messages (when app is focused) ────────────
// Returns an unsubscribe function
export const listenForegroundWebMessages = async (handler) => {
  try {
    if (!(await isWebPushSupported())) return () => {};

    const app = getFirebaseApp();
    const messaging = getMessaging(app);

    return onMessage(messaging, (payload) => {
      const title = payload?.notification?.title || "Flanorx";
      const body = payload?.notification?.body || "";
      const link = payload?.data?.link || "/dashboard";
      handler({ title, body, link, raw: payload });
    });
  } catch (err) {
    console.error("[push:web] listenForegroundWebMessages failed:", err);
    return () => {};
  }
};