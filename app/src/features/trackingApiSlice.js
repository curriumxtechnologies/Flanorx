// features/trackingApiSlice.js
import { apiSlice } from "./apiSlice.js";

const TRACK_URL = "/tracking";

export const trackingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Rider: Start tracking ───────────────────────────────
    startTracking: builder.mutation({
      query: ({ orderId, userLat, userLng }) => ({
        url: `${TRACK_URL}/${orderId}/start`,
        method: "POST",
        body: { userLat, userLng },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: "Tracking", id: orderId },
      ],
    }),

    // ─── User: Update user location ──────────────────────────
    updateUserLocation: builder.mutation({
      query: ({ orderId, lat, lng }) => ({
        url: `${TRACK_URL}/${orderId}/user-location`,
        method: "PUT",
        body: { lat, lng },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: "Tracking", id: orderId },
      ],
    }),

    // ─── Rider: Update rider location ─────────────────────────
    updateRiderLocation: builder.mutation({
      query: ({ orderId, lat, lng }) => ({
        url: `${TRACK_URL}/${orderId}/rider-location`,
        method: "PUT",
        body: { lat, lng },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: "Tracking", id: orderId },
      ],
    }),

    // ─── Get tracking info (user/rider/admin) ────────────────
    getTracking: builder.query({
      query: (orderId) => ({
        url: `${TRACK_URL}/${orderId}`,
        method: "GET",
      }),
      providesTags: (result, error, orderId) => [
        { type: "Tracking", id: orderId },
      ],
    }),

    // ─── Stop tracking (rider/admin) ─────────────────────────
    stopTracking: builder.mutation({
      query: (orderId) => ({
        url: `${TRACK_URL}/${orderId}/stop`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, orderId) => [
        { type: "Tracking", id: orderId },
      ],
    }),
  }),
});

export const {
  useStartTrackingMutation,
  useUpdateUserLocationMutation,
  useUpdateRiderLocationMutation,
  useGetTrackingQuery,
  useStopTrackingMutation,
} = trackingApiSlice;