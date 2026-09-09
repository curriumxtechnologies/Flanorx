// features/riderApiSlice.js
import { apiSlice } from "./apiSlice.js";

export const riderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── User: Apply to become a rider ────────────────────────
    applyForRider: builder.mutation({
      query: (formData) => ({
        url: "/riders/apply",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Rider"],
    }),

    // ─── User: Get rider application status ──────────────────
    getRiderApplicationStatus: builder.query({
      query: () => ({
        url: "/riders/status",
        method: "GET",
      }),
      providesTags: ["Rider"],
    }),

    // ─── User: Update rider application ──────────────────────
    updateRiderApplication: builder.mutation({
      query: (formData) => ({
        url: "/riders/update",
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["Rider"],
    }),

    // ─── Resolve bank account ──────────────────────────────
    resolveBank: builder.mutation({
      query: ({ accountNumber, bankCode }) => ({
        url: "/riders/resolve-bank",
        method: "POST",
        body: { accountNumber, bankCode },
      }),
    }),

    // ─── 🆕 Get bank list from Paystack ──────────────────────
    getBanks: builder.query({
      query: () => ({
        url: "/riders/banks",
        method: "GET",
      }),
      providesTags: ["Bank"],
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
    }),

    // ─── Admin: Get all rider applications ────────────────────
    getRiderApplications: builder.query({
      query: ({ status } = {}) => {
        const params = new URLSearchParams();
        if (status) params.append("status", status);
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return {
          url: `/admin/riders/applications${queryString}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "Rider", id: _id })),
              { type: "Rider", id: "APPLICATIONS" },
            ]
          : [{ type: "Rider", id: "APPLICATIONS" }],
    }),

    // ─── Admin: Approve a rider application ──────────────────
    approveRider: builder.mutation({
      query: (userId) => ({
        url: `/admin/riders/${userId}/approve`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, userId) => [
        { type: "Rider", id: userId },
        { type: "Rider", id: "APPLICATIONS" },
      ],
    }),

    // ─── Admin: Reject a rider application ────────────────────
    rejectRider: builder.mutation({
      query: ({ userId, reason }) => ({
        url: `/admin/riders/${userId}/reject`,
        method: "PUT",
        body: { reason },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "Rider", id: userId },
        { type: "Rider", id: "APPLICATIONS" },
      ],
    }),
  }),
});

export const {
  useApplyForRiderMutation,
  useGetRiderApplicationStatusQuery,
  useUpdateRiderApplicationMutation,
  useResolveBankMutation,
  useGetBanksQuery, // 👈 new hook
  useGetRiderApplicationsQuery,
  useApproveRiderMutation,
  useRejectRiderMutation,
} = riderApiSlice;