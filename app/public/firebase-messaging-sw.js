// public/firebase-messaging-sw.js
//
// Service worker for Flanorx web push notifications.
// This file CANNOT read import.meta.env — Vite doesn't process SW files.
// The config values are hardcoded. They are public by design.

/* eslint-disable no-undef */

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

// ─── Firebase config (hardcoded — must match .env) ────────
firebase.initializeApp({
  apiKey: "AIzaSyBUwwHwRXu3m5prvDk7JWpjbjpBvkZNUcc",
  authDomain: "flanorx-547b5.firebaseapp.com",
  projectId: "flanorx-547b5",
  storageBucket: "flanorx-547b5.firebasestorage.app",
  messagingSenderId: "648354728103",
  appId: "1:648354728103:web:1cf7885d74c22bc3893382",
});

const messaging = firebase.messaging();

// ─── Background message → show native OS notification ─────
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Flanorx";
  const body = payload?.notification?.body || "";
  const link = payload?.data?.link || "/dashboard";
  const imageUrl = payload?.notification?.image || undefined;

  self.registration.showNotification(title, {
    body,
    icon: "/flanorx.png",
    badge: "/flanorx.png",
    ...(imageUrl && { image: imageUrl }),
    data: { link },
    tag: "flanorx-notification",
    renotify: true,
    requireInteraction: false,
  });
});

// ─── Notification click → focus existing tab or open new one ──
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const link = event.notification?.data?.link || "/dashboard";
  const targetUrl = new URL(link, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an existing Flanorx tab if one is open
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin)) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a fresh tab
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});