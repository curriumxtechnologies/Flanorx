// features/stationApiSlice.js
import { apiSlice } from "./apiSlice.js";

const STATIONS_URL = "/stations";   // public nearby
const ADMIN_URL = "/admin/stations"; // main admin CRUD + overrides
const STATION_URL = "/station";      // station-scoped endpoints

export const stationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ═══════════════════════════════════════════════════════
    //  PUBLIC / ANY AUTH USER
    // ═══════════════════════════════════════════════════════
    getNearbyStations: builder.query({
      query: ({ lat, lng, radiusKm } = {}) => {
        const params = new URLSearchParams();
        if (lat !== undefined) params.append("lat", lat);
        if (lng !== undefined) params.append("lng", lng);
        if (radiusKm) params.append("radiusKm", radiusKm);
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return {
          url: `${STATIONS_URL}/nearby${queryString}`,
          method: "GET",
        };
      },
      providesTags: ["Station"],
    }),

    // ═══════════════════════════════════════════════════════
    //  MAIN ADMIN
    // ═══════════════════════════════════════════════════════

    // Overview (all stations + aggregated stats)
    getStationsOverview: builder.query({
      query: () => ({
        url: `${ADMIN_URL}/overview`,
        method: "GET",
      }),
      providesTags: (result) =>
        result?.stations
          ? [
              ...result.stations.map(({ _id }) => ({
                type: "Station",
                id: _id,
              })),
              { type: "Station", id: "OVERVIEW" },
              { type: "Station", id: "LIST" },
            ]
          : [
              { type: "Station", id: "OVERVIEW" },
              { type: "Station", id: "LIST" },
            ],
    }),

    // Full list
    getAllStations: builder.query({
      query: () => ({
        url: ADMIN_URL,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "Station", id: _id })),
              { type: "Station", id: "LIST" },
            ]
          : [{ type: "Station", id: "LIST" }],
    }),

    getStationById: builder.query({
      query: (id) => ({
        url: `${ADMIN_URL}/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Station", id }],
    }),

    createStation: builder.mutation({
      query: (data) => ({
        url: ADMIN_URL,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "Station", id: "LIST" },
        { type: "Station", id: "OVERVIEW" },
        { type: "User", id: "ADMIN_LIST" },
      ],
    }),

    updateStation: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${ADMIN_URL}/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Station", id },
        { type: "Station", id: "LIST" },
        { type: "Station", id: "OVERVIEW" },
      ],
    }),

    deleteStation: builder.mutation({
      query: (id) => ({
        url: `${ADMIN_URL}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Station", id },
        { type: "Station", id: "LIST" },
        { type: "Station", id: "OVERVIEW" },
      ],
    }),

    assignStationAdmin: builder.mutation({
      query: ({ id, userId }) => ({
        url: `${ADMIN_URL}/${id}/assign-admin`,
        method: "PUT",
        body: { userId },
      }),
      invalidatesTags: (result, error, { id, userId }) => [
        { type: "Station", id },
        { type: "Station", id: "LIST" },
        { type: "Station", id: "OVERVIEW" },
        { type: "User", id: userId },
        { type: "User", id: "ADMIN_LIST" },
        "User", // ⭐ refetch useGetProfileQuery so the sidebar updates
      ],
    }),

    adminAddStationRider: builder.mutation({
      query: ({ id, userId }) => ({
        url: `${ADMIN_URL}/${id}/riders`,
        method: "POST",
        body: { userId },
      }),
      invalidatesTags: (result, error, { id, userId }) => [
        { type: "Station", id },
        { type: "Station", id: "LIST" },
        { type: "User", id: userId },
        { type: "User", id: "ADMIN_LIST" },
        { type: "Rider", id: "LIST" },
        "User", // ⭐ profile refetch
      ],
    }),

    adminRemoveStationRider: builder.mutation({
      query: ({ id, userId }) => ({
        url: `${ADMIN_URL}/${id}/riders/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { id, userId }) => [
        { type: "Station", id },
        { type: "Station", id: "LIST" },
        { type: "User", id: userId },
        { type: "User", id: "ADMIN_LIST" },
        { type: "Rider", id: "LIST" },
        "User", // ⭐ profile refetch
      ],
    }),

    adminAdjustStock: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${ADMIN_URL}/${id}/adjust-stock`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Station", id },
        { type: "Station", id: "LIST" },
        { type: "Station", id: "OVERVIEW" },
        { type: "Station", id: `LOGS_${id}` },
      ],
    }),

    adminGetStationLogs: builder.query({
      query: ({ id, cylinderSize, reason, limit } = {}) => {
        const params = new URLSearchParams();
        if (cylinderSize) params.append("cylinderSize", cylinderSize);
        if (reason) params.append("reason", reason);
        if (limit) params.append("limit", limit);
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return {
          url: `${ADMIN_URL}/${id}/logs${queryString}`,
          method: "GET",
        };
      },
      providesTags: (result, error, { id }) => [
        { type: "Station", id: `LOGS_${id}` },
      ],
    }),

    // ═══════════════════════════════════════════════════════
    //  STATION SCOPE (station admin + staff; main admin bypasses)
    // ═══════════════════════════════════════════════════════

    getMyStation: builder.query({
      query: () => ({
        url: `${STATION_URL}/me`,
        method: "GET",
      }),
      providesTags: ["Station"],
    }),

    getStationDashboard: builder.query({
      query: (stationId) => {
        const qs = stationId ? `?stationId=${stationId}` : "";
        return {
          url: `${STATION_URL}/dashboard${qs}`,
          method: "GET",
        };
      },
      providesTags: ["Station", "Delivery", "Order"],
    }),

    // ─── Inventory ──────────────────────────────────────────
    getStationInventory: builder.query({
      query: (stationId) => {
        const qs = stationId ? `?stationId=${stationId}` : "";
        return {
          url: `${STATION_URL}/inventory${qs}`,
          method: "GET",
        };
      },
      providesTags: ["Station"],
    }),

    restockInventory: builder.mutation({
      query: (data) => ({
        url: `${STATION_URL}/inventory/restock`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Station"],
    }),

    getInventoryLogs: builder.query({
      query: ({ stationId, cylinderSize, reason, limit } = {}) => {
        const params = new URLSearchParams();
        if (stationId) params.append("stationId", stationId);
        if (cylinderSize) params.append("cylinderSize", cylinderSize);
        if (reason) params.append("reason", reason);
        if (limit) params.append("limit", limit);
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return {
          url: `${STATION_URL}/inventory/logs${queryString}`,
          method: "GET",
        };
      },
      providesTags: ["Station"],
    }),

    // ─── Orders ─────────────────────────────────────────────
    getStationOrders: builder.query({
      query: ({
        stationId,
        status,
        deliveryStatus,
        fulfillmentType,
        paid,
      } = {}) => {
        const params = new URLSearchParams();
        if (stationId) params.append("stationId", stationId);
        if (status) params.append("status", status);
        if (deliveryStatus) params.append("deliveryStatus", deliveryStatus);
        if (fulfillmentType) params.append("fulfillmentType", fulfillmentType);
        if (paid !== undefined) params.append("paid", paid);
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return {
          url: `${STATION_URL}/orders${queryString}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "Order", id: _id })),
              { type: "Order", id: "STATION_LIST" },
            ]
          : [{ type: "Order", id: "STATION_LIST" }],
    }),

    assignRiderToOrder: builder.mutation({
      query: ({ id, riderId }) => ({
        url: `${STATION_URL}/orders/${id}/assign-rider`,
        method: "PUT",
        body: { riderId },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Order", id },
        { type: "Order", id: "STATION_LIST" },
        { type: "Delivery", id },
        "Delivery",
      ],
    }),

    markOrderReady: builder.mutation({
      query: (id) => ({
        url: `${STATION_URL}/orders/${id}/mark-ready`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Order", id },
        { type: "Order", id: "STATION_LIST" },
      ],
    }),

    // ─── Team (station admin) ───────────────────────────────
    getStationTeam: builder.query({
      query: (stationId) => {
        const qs = stationId ? `?stationId=${stationId}` : "";
        return {
          url: `${STATION_URL}/team${qs}`,
          method: "GET",
        };
      },
      providesTags: ["Station"],
    }),

    addStationTeamMember: builder.mutation({
      query: (data) => ({
        url: `${STATION_URL}/team`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Station", "User"],
    }),

    removeStationTeamMember: builder.mutation({
      query: ({ userId, stationId }) => {
        const qs = stationId ? `?stationId=${stationId}` : "";
        return {
          url: `${STATION_URL}/team/${userId}${qs}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["Station", "User"],
    }),

    // ─── Users search (station admin) ───────────────────────
    // Powers the type-ahead picker on Team & Riders pages.
    // Requires at least 2 characters (enforced on both ends).
    searchStationUsers: builder.query({
      query: ({ q, stationId, limit } = {}) => {
        const params = new URLSearchParams();
        if (q) params.append("q", q);
        if (stationId) params.append("stationId", stationId);
        if (limit) params.append("limit", limit);
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return {
          url: `${STATION_URL}/users/search${queryString}`,
          method: "GET",
        };
      },
      providesTags: ["User"],
    }),

    // ─── Riders (station admin) ─────────────────────────────
    getStationRiders: builder.query({
      query: (stationId) => {
        const qs = stationId ? `?stationId=${stationId}` : "";
        return {
          url: `${STATION_URL}/riders${qs}`,
          method: "GET",
        };
      },
      providesTags: ["Station", "Rider"],
    }),

    addStationRider: builder.mutation({
      query: (data) => ({
        url: `${STATION_URL}/riders`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Station", "User", "Rider"],
    }),

    removeStationRider: builder.mutation({
      query: ({ userId, stationId }) => {
        const qs = stationId ? `?stationId=${stationId}` : "";
        return {
          url: `${STATION_URL}/riders/${userId}${qs}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["Station", "User", "Rider"],
    }),
  }),
});

export const {
  // Public
  useGetNearbyStationsQuery,
  // Main admin
  useGetStationsOverviewQuery,
  useGetAllStationsQuery,
  useGetStationByIdQuery,
  useCreateStationMutation,
  useUpdateStationMutation,
  useDeleteStationMutation,
  useAssignStationAdminMutation,
  useAdminAddStationRiderMutation,
  useAdminRemoveStationRiderMutation,
  useAdminAdjustStockMutation,
  useAdminGetStationLogsQuery,
  // Station scope
  useGetMyStationQuery,
  useGetStationDashboardQuery,
  useGetStationInventoryQuery,
  useRestockInventoryMutation,
  useGetInventoryLogsQuery,
  useGetStationOrdersQuery,
  useAssignRiderToOrderMutation,
  useMarkOrderReadyMutation,
  // Team
  useGetStationTeamQuery,
  useAddStationTeamMemberMutation,
  useRemoveStationTeamMemberMutation,
  // Users search
  useSearchStationUsersQuery,
  // Riders
  useGetStationRidersQuery,
  useAddStationRiderMutation,
  useRemoveStationRiderMutation,
} = stationApiSlice;