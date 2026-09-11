// features/adminApiSlice.js
import { apiSlice } from "./apiSlice.js";

const ADMIN_URL = "/admin";

export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Orders ──────────────────────────────────────────────
    getAllOrders: builder.query({
      query: ({
        month,
        year,
        status,
        paid,
        deliveryStatus,
        orderType,
        station,
        fulfillmentType,
      } = {}) => {
        const params = new URLSearchParams();
        if (month) params.append("month", month);
        if (year) params.append("year", year);
        if (status) params.append("status", status);
        if (paid !== undefined) params.append("paid", paid);
        if (deliveryStatus) params.append("deliveryStatus", deliveryStatus);
        if (orderType) params.append("orderType", orderType);
        if (station) params.append("station", station);
        if (fulfillmentType) params.append("fulfillmentType", fulfillmentType);
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return {
          url: `${ADMIN_URL}/orders${queryString}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "Order", id: _id })),
              { type: "Order", id: "ADMIN_LIST" },
            ]
          : [{ type: "Order", id: "ADMIN_LIST" }],
    }),

    updateOrderStatus: builder.mutation({
      query: ({ id, status, deliveryStatus }) => ({
        url: `${ADMIN_URL}/orders/${id}/status`,
        method: "PUT",
        body: { status, deliveryStatus },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Order", id },
        { type: "Order", id: "ADMIN_LIST" },
        "Order",
      ],
    }),

    getDashboardStats: builder.query({
      query: () => ({
        url: `${ADMIN_URL}/stats`,
        method: "GET",
      }),
      providesTags: ["Order"],
    }),

    // ─── Users ──────────────────────────────────────────────
    getAllUsers: builder.query({
      query: ({
        role,
        isVerified,
        search,
        station,
        riderType,
        stationRole,
      } = {}) => {
        const params = new URLSearchParams();
        if (role) params.append("role", role);
        if (isVerified !== undefined) params.append("isVerified", isVerified);
        if (search) params.append("search", search);
        if (station) params.append("station", station);
        if (riderType) params.append("riderType", riderType);
        if (stationRole) params.append("stationRole", stationRole);
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return {
          url: `${ADMIN_URL}/users${queryString}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "User", id: _id })),
              { type: "User", id: "ADMIN_LIST" },
            ]
          : [{ type: "User", id: "ADMIN_LIST" }],
    }),

    getUserById: builder.query({
      query: (id) => ({
        url: `${ADMIN_URL}/users/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "User", id }],
    }),

    updateUserRole: builder.mutation({
      query: ({ id, role }) => ({
        url: `${ADMIN_URL}/users/${id}/role`,
        method: "PUT",
        body: { role },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "User", id },
        { type: "User", id: "ADMIN_LIST" },
        { type: "Station", id: "LIST" },
      ],
    }),

    deleteUser: builder.mutation({
      query: (id) => ({
        url: `${ADMIN_URL}/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "User", id },
        { type: "User", id: "ADMIN_LIST" },
        { type: "Station", id: "LIST" },
      ],
    }),

    // ─── Rider Applications ────────────────────────────────
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
              ...result.map(({ _id }) => ({
                type: "RiderApplication",
                id: _id,
              })),
              { type: "RiderApplication", id: "LIST" },
            ]
          : [{ type: "RiderApplication", id: "LIST" }],
    }),

    approveRider: builder.mutation({
      query: (userId) => ({
        url: `${ADMIN_URL}/riders/${userId}/approve`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, userId) => [
        { type: "RiderApplication", id: userId },
        { type: "RiderApplication", id: "LIST" },
        { type: "User", id: userId },
        { type: "User", id: "ADMIN_LIST" },
        "Rider",
      ],
    }),

    rejectRider: builder.mutation({
      query: ({ userId, reason }) => ({
        url: `${ADMIN_URL}/riders/${userId}/reject`,
        method: "PUT",
        body: { reason },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "RiderApplication", id: userId },
        { type: "RiderApplication", id: "LIST" },
        { type: "User", id: userId },
        { type: "User", id: "ADMIN_LIST" },
      ],
    }),

    // ─── Riders ─────────────────────────────────────────────
    getAllRiders: builder.query({
      query: ({ riderType, station, search } = {}) => {
        const params = new URLSearchParams();
        if (riderType) params.append("riderType", riderType);
        if (station) params.append("station", station);
        if (search) params.append("search", search);
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return {
          url: `${ADMIN_URL}/riders${queryString}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "Rider", id: _id })),
              { type: "Rider", id: "LIST" },
            ]
          : [{ type: "Rider", id: "LIST" }],
    }),

    // ─── Delivery Monitoring ────────────────────────────────
    getActiveDeliveries: builder.query({
      query: ({ orderType, station } = {}) => {
        const params = new URLSearchParams();
        if (orderType) params.append("orderType", orderType);
        if (station) params.append("station", station);
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return {
          url: `${ADMIN_URL}/deliveries/active${queryString}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "Delivery", id: _id })),
              { type: "Delivery", id: "ACTIVE" },
            ]
          : [{ type: "Delivery", id: "ACTIVE" }],
    }),
  }),
});

export const {
  useGetAllOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetDashboardStatsQuery,
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  useGetRiderApplicationsQuery,
  useApproveRiderMutation,
  useRejectRiderMutation,
  useGetAllRidersQuery,
  useGetActiveDeliveriesQuery,
} = adminApiSlice;