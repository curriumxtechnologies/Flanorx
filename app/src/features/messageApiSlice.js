// src/features/messageApiSlice.js
import { apiSlice } from "./apiSlice.js";

const MESSAGE_URL = "/messages";

export const messageApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Preview how many people will receive an audience-based send
    previewRecipients: builder.query({
      query: ({ audience, city, userType, role } = {}) => {
        const params = new URLSearchParams();
        if (audience) params.append("audience", audience);
        if (city) params.append("city", city);
        if (userType) params.append("userType", userType);
        if (role) params.append("role", role);
        return {
          url: `${MESSAGE_URL}/recipients?${params.toString()}`,
          method: "GET",
        };
      },
    }),

    // Flexible send — pass a FormData with any of:
    // audience, userIds, waitlistIds, emails, to, subject, html, text, attachments[]
    sendMessage: builder.mutation({
      query: (formData) => ({
        url: `${MESSAGE_URL}/send`,
        method: "POST",
        body: formData,
      }),
    }),

    // Convenience: single user
    sendToUser: builder.mutation({
      query: ({ userId, formData }) => ({
        url: `${MESSAGE_URL}/user/${userId}`,
        method: "POST",
        body: formData,
      }),
    }),

    // Convenience: single waitlist entry
    sendToWaitlistEntry: builder.mutation({
      query: ({ entryId, formData }) => ({
        url: `${MESSAGE_URL}/waitlist/${entryId}`,
        method: "POST",
        body: formData,
      }),
    }),

    // Send a preview to yourself
    sendTestMessage: builder.mutation({
      query: (formData) => ({
        url: `${MESSAGE_URL}/test`,
        method: "POST",
        body: formData,
      }),
    }),
  }),
});

export const {
  usePreviewRecipientsQuery,
  useSendMessageMutation,
  useSendToUserMutation,
  useSendToWaitlistEntryMutation,
  useSendTestMessageMutation,
} = messageApiSlice;