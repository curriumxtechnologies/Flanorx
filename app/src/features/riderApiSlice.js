// features/riderApiSlice.js
import { apiSlice } from "./apiSlice.js";

const USERS_URL = "/users";
const ADMIN_URL = "/admin";

export const riderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── User: Apply to become a rider ────────────────────────
    applyForRider: builder.mutation({
      query: (formData) => ({
        url: `${USERS_URL}/rider/apply`,
        method: "POST",
        body: formData,
        // RTK Query will set Content-Type: multipart/form-data automatically
      }),
      invalidatesTags: ["Rider"],
    }),

    // ─── User: Get rider application status ──────────────────
    getRiderApplicationStatus: builder.query({
      query: () => ({
        url: `${USERS_URL}/rider/status`,
        method: "GET",
      }),
      providesTags: ["Rider"],
    }),

    // ─── User: Update rider application ──────────────────────
    updateRiderApplication: builder.mutation({
      query: (formData) => ({
        url: `${USERS_URL}/rider/update`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["Rider"],
    }),

    // ─── Admin: Get all rider applications ────────────────────
    getRiderApplications: builder.query({
      query: ({ status } = {}) => {
        const params = new URLSearchParams();
        if (status) params.append("status", status);
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return {
          url: `${ADMIN_URL}/riders/applications${queryString}`,
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
        url: `${ADMIN_URL}/riders/${userId}/approve`,
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
        url: `${ADMIN_URL}/riders/${userId}/reject`,
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
  useGetRiderApplicationsQuery,
  useApproveRiderMutation,
  useRejectRiderMutation,
} = riderApiSlice;