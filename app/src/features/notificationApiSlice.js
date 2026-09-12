// features/notificationApiSlice.js
import { apiSlice } from "./apiSlice.js";

const NOTIFICATIONS_URL = "/notifications";

export const notificationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ═══════════════════════════════════════════════════════
    //  CLIENT — any logged-in user
    // ═══════════════════════════════════════════════════════

    // ─── Register a device token (web or Capacitor) ─────────
    // Body: { token, platform, deviceLabel?, userAgent? }
    registerDeviceToken: builder.mutation({
      query: (data) => ({
        url: `${NOTIFICATIONS_URL}/token`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["NotificationDevices"],
    }),

    // ─── Unregister a device token (on logout) ──────────────
    // Body: { token }
    unregisterDeviceToken: builder.mutation({
      query: (data) => ({
        url: `${NOTIFICATIONS_URL}/token`,
        method: "DELETE",
        body: data,
      }),
      invalidatesTags: ["NotificationDevices"],
    }),

    // ─── List my registered devices ─────────────────────────
    getMyDevices: builder.query({
      query: () => ({
        url: `${NOTIFICATIONS_URL}/devices`,
        method: "GET",
      }),
      providesTags: ["NotificationDevices"],
    }),

    // ─── Send a test push to myself ─────────────────────────
    sendTestPush: builder.mutation({
      query: () => ({
        url: `${NOTIFICATIONS_URL}/test`,
        method: "POST",
      }),
    }),

    // ═══════════════════════════════════════════════════════
    //  ADMIN — main admin only
    // ═══════════════════════════════════════════════════════

    // ─── Push service status ────────────────────────────────
    getNotificationStatus: builder.query({
      query: () => ({
        url: `${NOTIFICATIONS_URL}/status`,
        method: "GET",
      }),
      providesTags: ["NotificationStatus"],
    }),

    // ─── Send a push to one user ────────────────────────────
    // Body: { title, body, link?, data? }
    sendPushToUser: builder.mutation({
      query: ({ userId, ...data }) => ({
        url: `${NOTIFICATIONS_URL}/send/${userId}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["NotificationStatus"],
    }),

    // ─── Broadcast a push to a filtered set of users ────────
    // Body: { title, body, link?, filters?, limit? }
    broadcastPush: builder.mutation({
      query: (data) => ({
        url: `${NOTIFICATIONS_URL}/broadcast`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["NotificationStatus"],
    }),

    // ─── Purge stale tokens older than 30 days ──────────────
    purgeInvalidTokens: builder.mutation({
      query: () => ({
        url: `${NOTIFICATIONS_URL}/invalid`,
        method: "DELETE",
      }),
      invalidatesTags: ["NotificationStatus"],
    }),
  }),
});

export const {
  // Client
  useRegisterDeviceTokenMutation,
  useUnregisterDeviceTokenMutation,
  useGetMyDevicesQuery,
  useSendTestPushMutation,
  // Admin
  useGetNotificationStatusQuery,
  useSendPushToUserMutation,
  useBroadcastPushMutation,
  usePurgeInvalidTokensMutation,
} = notificationApiSlice;