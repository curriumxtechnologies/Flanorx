// src/features/waitlistApiSlice.js
import { apiSlice } from "./apiSlice.js";

const WAITLIST_URL = "/waitlist";

export const waitlistApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ---- Public ----
    joinWaitlist: builder.mutation({
      query: (data) => ({
        url: `${WAITLIST_URL}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Waitlist"],
    }),

    // ---- Admin / Protected ----
    getWaitlistEntries: builder.query({
      query: () => ({
        url: `${WAITLIST_URL}`,
        method: "GET",
      }),
      providesTags: ["Waitlist"],
    }),

    getWaitlistStats: builder.query({
      query: () => ({
        url: `${WAITLIST_URL}/stats`,
        method: "GET",
      }),
      providesTags: ["WaitlistStats"],
    }),
  }),
});

// ✅ All hooks exported
export const {
  useJoinWaitlistMutation,
  useGetWaitlistEntriesQuery,
  useGetWaitlistStatsQuery,
} = waitlistApiSlice;