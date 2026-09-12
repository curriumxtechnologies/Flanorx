// features/emailNotificationApiSlice.js
import { apiSlice } from "./apiSlice.js";

const EMAIL_URL = "/email";

export const emailNotificationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Status ────────────────────────────────────────────
    getEmailStatus: builder.query({
      query: () => ({
        url: `${EMAIL_URL}/status`,
        method: "GET",
      }),
      providesTags: ["EmailStatus"],
    }),

    getEmailTemplates: builder.query({
      query: () => ({
        url: `${EMAIL_URL}/templates`,
        method: "GET",
      }),
      providesTags: ["EmailTemplates"],
    }),

    // ─── Debug / testing ───────────────────────────────────
    // Body: { olderThanMinutes?: number } — 0 means send to everything pending
    runPendingReminders: builder.mutation({
      query: (data = {}) => ({
        url: `${EMAIL_URL}/run-reminders`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["EmailStatus"],
    }),

    // Manually fire a single order event email
    // event: "paid" | "confirmed" | "delivered" | ...
    triggerOrderEventEmail: builder.mutation({
      query: ({ orderId, event }) => ({
        url: `${EMAIL_URL}/order/${orderId}/${event}`,
        method: "POST",
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: "Order", id: orderId },
      ],
    }),
  }),
});

export const {
  useGetEmailStatusQuery,
  useGetEmailTemplatesQuery,
  useRunPendingRemindersMutation,
  useTriggerOrderEventEmailMutation,
} = emailNotificationApiSlice;