// features/refillApiSlice.js
import { apiSlice } from "./apiSlice.js";

const REFILL_URL = "/refill";
const ADMIN_REFILL_URL = "/admin/refill";

// ─── Tag helper ────────────────────────────────────────────
// Keeps the invalidateTags/providesTags arrays terse and typo-proof.
const T = {
  ORDER:      "RefillOrder",
  STATION:    "RefillStation",
  APPLICATION:"RefillApplication",
  INVOICE:    "RefillInvoice",
  SETTINGS:   "RefillSettings",
  TEAM:       "RefillTeam",
  STATS:      "RefillStats",
  COMMISSION: "RefillCommission",
};

// Entity-id tag (e.g. { type: "RefillOrder", id: "64ab..." })
const idTag = (type, id) => ({ type, id });

export const refillApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ═══════════════════════════════════════════════════════
    //  APPLICATION
    // ═══════════════════════════════════════════════════════

    // @desc   Apply to become a refill station (multipart).
    //         Caller must build a FormData with:
    //           businessName, contactPerson, phone, email?, address,
    //           coordinates (JSON string), operatingHours?,
    //           supportedCylinderSizes (JSON string),
    //           cylinderPrices (JSON string),
    //           businessLicense (File), shopPhotos (File[]),
    //           cylinderPhotos (File[])
    applyAsRefillStation: builder.mutation({
      query: (formData) => ({
        url: `${REFILL_URL}/stations/apply`,
        method: "POST",
        body: formData, // do NOT set Content-Type — browser adds boundary
      }),
      invalidatesTags: [T.APPLICATION, T.STATION],
    }),

    // @desc   My refill station application / profile
    getMyRefillApplication: builder.query({
      query: () => ({
        url: `${REFILL_URL}/stations/application/me`,
        method: "GET",
      }),
      providesTags: [T.APPLICATION],
    }),

    // ═══════════════════════════════════════════════════════
    //  DISCOVERY
    // ═══════════════════════════════════════════════════════

    // @desc   Nearby approved refill stations
    // @arg    { lat, lng, radiusKm?, cylinderSize? }
    getNearbyRefillStations: builder.query({
      query: ({ lat, lng, radiusKm, cylinderSize }) => ({
        url: `${REFILL_URL}/stations/nearby`,
        method: "GET",
        params: { lat, lng, radiusKm, cylinderSize },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => idTag(T.STATION, _id)),
              idTag(T.STATION, "NEARBY"),
            ]
          : [idTag(T.STATION, "NEARBY")],
    }),

    // @desc   Public refill station profile
    getRefillStationPublic: builder.query({
      query: (id) => ({
        url: `${REFILL_URL}/stations/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [idTag(T.STATION, id)],
    }),

    // ═══════════════════════════════════════════════════════
    //  CUSTOMER ORDERS
    // ═══════════════════════════════════════════════════════

    // @desc   Create a refill order (returns Paystack auth_url)
    // @body   { stationId, cylinderSize, quantity, fulfillmentType,
    //           deliveryAddress?, deliveryCoordinates?, scheduledDate?,
    //           scheduledTime?, notes? }
    createRefillOrder: builder.mutation({
      query: (body) => ({
        url: `${REFILL_URL}/orders`,
        method: "POST",
        body,
      }),
      invalidatesTags: [T.ORDER],
    }),

    // @desc   Verify Paystack payment after redirect
    // @arg    reference (string)
    verifyRefillPayment: builder.query({
      query: (reference) => ({
        url: `${REFILL_URL}/orders/verify`,
        method: "GET",
        params: { reference },
      }),
      providesTags: (result, error, reference) =>
        result?.order
          ? [idTag(T.ORDER, result.order._id), T.ORDER]
          : [T.ORDER],
    }),

    // @desc   My refill orders
    // @arg    { status?, limit? } | void
    getMyRefillOrders: builder.query({
      query: (params = {}) => ({
        url: `${REFILL_URL}/orders/my`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => idTag(T.ORDER, _id)),
              idTag(T.ORDER, "MINE"),
            ]
          : [idTag(T.ORDER, "MINE")],
    }),

    // @desc   Single refill order
    getRefillOrder: builder.query({
      query: (id) => ({
        url: `${REFILL_URL}/orders/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [idTag(T.ORDER, id)],
    }),

    // @desc   Customer confirms completion
    confirmRefillOrder: builder.mutation({
      query: (id) => ({
        url: `${REFILL_URL}/orders/${id}/confirm`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        idTag(T.ORDER, id),
        idTag(T.ORDER, "MINE"),
        T.ORDER,
        T.COMMISSION,
      ],
    }),

    // @desc   Customer cancels (only while pending/paid/accepted)
    cancelRefillOrder: builder.mutation({
      query: (id) => ({
        url: `${REFILL_URL}/orders/${id}/cancel`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        idTag(T.ORDER, id),
        idTag(T.ORDER, "MINE"),
        T.ORDER,
      ],
    }),

    // ═══════════════════════════════════════════════════════
    //  STATION SELF-SERVICE (owner / staff)
    // ═══════════════════════════════════════════════════════

    // @desc   My refill station
    getMyRefillStation: builder.query({
      query: () => ({
        url: `${REFILL_URL}/stations/me`,
        method: "GET",
      }),
      providesTags: [idTag(T.STATION, "ME")],
    }),

    // @desc   Update text fields (prices, address, hours, etc.)
    updateMyRefillStation: builder.mutation({
      query: (body) => ({
        url: `${REFILL_URL}/stations/me`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        idTag(T.STATION, "ME"),
        T.STATION,
        T.APPLICATION,
      ],
    }),

    // @desc   Replace documents (multipart).
    //         Caller must build FormData with any of:
    //           businessLicense (File, optional)
    //           shopPhotos      (File[], optional)
    //           cylinderPhotos  (File[], optional)
    //         Replacing the license forces re-approval.
    updateMyRefillStationDocuments: builder.mutation({
      query: (formData) => ({
        url: `${REFILL_URL}/stations/me/documents`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: [
        idTag(T.STATION, "ME"),
        T.STATION,
        T.APPLICATION,
      ],
    }),

    // @desc   Station dashboard counters + commission summary
    getRefillStationDashboard: builder.query({
      query: () => ({
        url: `${REFILL_URL}/stations/me/dashboard`,
        method: "GET",
      }),
      providesTags: [T.STATS, T.COMMISSION],
    }),

    // @desc   Orders assigned to my station
    // @arg    { status?, limit? } | void
    getRefillStationOrders: builder.query({
      query: (params = {}) => ({
        url: `${REFILL_URL}/stations/me/orders`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => idTag(T.ORDER, _id)),
              idTag(T.ORDER, "STATION"),
            ]
          : [idTag(T.ORDER, "STATION")],
    }),

    // ─── Order state transitions ───────────────────────────
    acceptRefillOrder: builder.mutation({
      query: (id) => ({
        url: `${REFILL_URL}/stations/me/orders/${id}/accept`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        idTag(T.ORDER, id),
        idTag(T.ORDER, "STATION"),
        T.STATS,
      ],
    }),

    // @arg   { id, reason }
    rejectRefillOrder: builder.mutation({
      query: ({ id, reason }) => ({
        url: `${REFILL_URL}/stations/me/orders/${id}/reject`,
        method: "PUT",
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        idTag(T.ORDER, id),
        idTag(T.ORDER, "STATION"),
        T.STATS,
      ],
    }),

    // @arg   { id, riderId }
    assignRefillRider: builder.mutation({
      query: ({ id, riderId }) => ({
        url: `${REFILL_URL}/stations/me/orders/${id}/assign-rider`,
        method: "PUT",
        body: { riderId },
      }),
      invalidatesTags: (result, error, { id }) => [
        idTag(T.ORDER, id),
        idTag(T.ORDER, "STATION"),
      ],
    }),

    markRefillReady: builder.mutation({
      query: (id) => ({
        url: `${REFILL_URL}/stations/me/orders/${id}/ready`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        idTag(T.ORDER, id),
        idTag(T.ORDER, "STATION"),
      ],
    }),

    markRefillDelivered: builder.mutation({
      query: (id) => ({
        url: `${REFILL_URL}/stations/me/orders/${id}/deliver`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        idTag(T.ORDER, id),
        idTag(T.ORDER, "STATION"),
        T.STATS,
        T.COMMISSION,
      ],
    }),

    completeRefillOrder: builder.mutation({
      query: (id) => ({
        url: `${REFILL_URL}/stations/me/orders/${id}/complete`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        idTag(T.ORDER, id),
        idTag(T.ORDER, "STATION"),
        T.STATS,
        T.COMMISSION,
        T.INVOICE,
      ],
    }),

    // ─── Team management (owner only) ─────────────────────
    getRefillTeam: builder.query({
      query: () => ({
        url: `${REFILL_URL}/stations/me/team`,
        method: "GET",
      }),
      providesTags: [T.TEAM],
    }),

    // @arg   q (string, min 2 chars)
    searchUsersForRefillStation: builder.query({
      query: (q) => ({
        url: `${REFILL_URL}/stations/me/users/search`,
        method: "GET",
        params: { q },
      }),
      // Search results are transient — no tag needed
    }),

    // @arg   { userId, role?: "staff" | "rider" }
    addRefillTeamMember: builder.mutation({
      query: (body) => ({
        url: `${REFILL_URL}/stations/me/team`,
        method: "POST",
        body,
      }),
      invalidatesTags: [T.TEAM],
    }),

    removeRefillTeamMember: builder.mutation({
      query: (userId) => ({
        url: `${REFILL_URL}/stations/me/team/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: [T.TEAM],
    }),

    // ─── Commission & invoices ────────────────────────────
    getMyRefillCommission: builder.query({
      query: () => ({
        url: `${REFILL_URL}/stations/me/commission`,
        method: "GET",
      }),
      providesTags: [T.COMMISSION],
    }),

    getMyRefillInvoices: builder.query({
      query: () => ({
        url: `${REFILL_URL}/stations/me/invoices`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => idTag(T.INVOICE, _id)),
              idTag(T.INVOICE, "STATION"),
            ]
          : [idTag(T.INVOICE, "STATION")],
    }),

    payRefillInvoice: builder.mutation({
      query: (invoiceId) => ({
        url: `${REFILL_URL}/stations/me/invoices/${invoiceId}/pay`,
        method: "POST",
      }),
      invalidatesTags: (result, error, invoiceId) => [
        idTag(T.INVOICE, invoiceId),
        idTag(T.INVOICE, "STATION"),
        T.COMMISSION,
      ],
    }),

    // @arg   reference (string)
    verifyRefillInvoicePayment: builder.query({
      query: (reference) => ({
        url: `${REFILL_URL}/stations/me/invoices/verify`,
        method: "GET",
        params: { reference },
      }),
      providesTags: (result) =>
        result?.invoice
          ? [idTag(T.INVOICE, result.invoice._id), T.COMMISSION]
          : [T.COMMISSION],
    }),

    // ═══════════════════════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════════════════════

    // ─── Stations ────────────────────────────────────────
    // @arg   { status?, search? } | void
    adminGetRefillStations: builder.query({
      query: (params = {}) => ({
        url: `${ADMIN_REFILL_URL}/stations`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => idTag(T.STATION, _id)),
              idTag(T.STATION, "ADMIN_LIST"),
            ]
          : [idTag(T.STATION, "ADMIN_LIST")],
    }),

    adminGetRefillStationById: builder.query({
      query: (id) => ({
        url: `${ADMIN_REFILL_URL}/stations/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [idTag(T.STATION, id)],
    }),

    adminApproveRefillStation: builder.mutation({
      query: (id) => ({
        url: `${ADMIN_REFILL_URL}/stations/${id}/approve`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        idTag(T.STATION, id),
        idTag(T.STATION, "ADMIN_LIST"),
        T.STATS,
        T.APPLICATION,
      ],
    }),

    // @arg   { id, reason }
    adminRejectRefillStation: builder.mutation({
      query: ({ id, reason }) => ({
        url: `${ADMIN_REFILL_URL}/stations/${id}/reject`,
        method: "PUT",
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        idTag(T.STATION, id),
        idTag(T.STATION, "ADMIN_LIST"),
        T.STATS,
        T.APPLICATION,
      ],
    }),

    // @arg   { id, reason }
    adminBanRefillStation: builder.mutation({
      query: ({ id, reason }) => ({
        url: `${ADMIN_REFILL_URL}/stations/${id}/ban`,
        method: "PUT",
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        idTag(T.STATION, id),
        idTag(T.STATION, "ADMIN_LIST"),
        T.STATS,
      ],
    }),

    adminUnbanRefillStation: builder.mutation({
      query: (id) => ({
        url: `${ADMIN_REFILL_URL}/stations/${id}/unban`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        idTag(T.STATION, id),
        idTag(T.STATION, "ADMIN_LIST"),
        T.STATS,
      ],
    }),

    // @arg   { id, commissionRate }   (null clears the override)
    adminOverrideCommissionRate: builder.mutation({
      query: ({ id, commissionRate }) => ({
        url: `${ADMIN_REFILL_URL}/stations/${id}/commission`,
        method: "PUT",
        body: { commissionRate },
      }),
      invalidatesTags: (result, error, { id }) => [
        idTag(T.STATION, id),
        idTag(T.STATION, "ADMIN_LIST"),
      ],
    }),

    // ─── Platform settings ───────────────────────────────
    adminGetRefillSettings: builder.query({
      query: () => ({
        url: `${ADMIN_REFILL_URL}/settings`,
        method: "GET",
      }),
      providesTags: [T.SETTINGS],
    }),

    // @body   { commissionRate?, graceDays? }
    adminUpdateRefillSettings: builder.mutation({
      query: (body) => ({
        url: `${ADMIN_REFILL_URL}/settings`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [T.SETTINGS, T.STATS, T.COMMISSION],
    }),

    // ─── Invoices ────────────────────────────────────────
    // @arg   { status?, stationId?, month?, year? } | void
    adminGetRefillInvoices: builder.query({
      query: (params = {}) => ({
        url: `${ADMIN_REFILL_URL}/invoices`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => idTag(T.INVOICE, _id)),
              idTag(T.INVOICE, "ADMIN_LIST"),
            ]
          : [idTag(T.INVOICE, "ADMIN_LIST")],
    }),

    // @arg   { id, note? }
    adminMarkInvoicePaid: builder.mutation({
      query: ({ id, note }) => ({
        url: `${ADMIN_REFILL_URL}/invoices/${id}/mark-paid`,
        method: "PUT",
        body: { note },
      }),
      invalidatesTags: (result, error, { id }) => [
        idTag(T.INVOICE, id),
        idTag(T.INVOICE, "ADMIN_LIST"),
        T.STATS,
        T.COMMISSION,
      ],
    }),

    // @arg   { id, reason }
    adminWaiveInvoice: builder.mutation({
      query: ({ id, reason }) => ({
        url: `${ADMIN_REFILL_URL}/invoices/${id}/waive`,
        method: "PUT",
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        idTag(T.INVOICE, id),
        idTag(T.INVOICE, "ADMIN_LIST"),
        T.STATS,
        T.COMMISSION,
      ],
    }),

    // @arg   { month?, year? }  (defaults to previous month on server)
    adminGenerateInvoicesForPeriod: builder.mutation({
      query: (body = {}) => ({
        url: `${ADMIN_REFILL_URL}/invoices/generate`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        idTag(T.INVOICE, "ADMIN_LIST"),
        T.INVOICE,
        T.STATS,
      ],
    }),

    adminRunAgingAndAutoBan: builder.mutation({
      query: () => ({
        url: `${ADMIN_REFILL_URL}/invoices/run-aging`,
        method: "POST",
      }),
      invalidatesTags: [
        idTag(T.INVOICE, "ADMIN_LIST"),
        T.INVOICE,
        T.STATS,
        T.STATION,
      ],
    }),

    // ─── Overview & orders ───────────────────────────────
    adminGetRefillStats: builder.query({
      query: () => ({
        url: `${ADMIN_REFILL_URL}/stats`,
        method: "GET",
      }),
      providesTags: [T.STATS],
    }),

    // @arg   { status?, stationId?, limit? } | void
    adminGetRefillOrders: builder.query({
      query: (params = {}) => ({
        url: `${ADMIN_REFILL_URL}/orders`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => idTag(T.ORDER, _id)),
              idTag(T.ORDER, "ADMIN_LIST"),
            ]
          : [idTag(T.ORDER, "ADMIN_LIST")],
    }),
  }),
});

// ─── Exported hooks ────────────────────────────────────────
export const {
  // Application
  useApplyAsRefillStationMutation,
  useGetMyRefillApplicationQuery,
  // Discovery
  useGetNearbyRefillStationsQuery,
  useGetRefillStationPublicQuery,
  // Customer orders
  useCreateRefillOrderMutation,
  useVerifyRefillPaymentQuery,
  useLazyVerifyRefillPaymentQuery,
  useGetMyRefillOrdersQuery,
  useGetRefillOrderQuery,
  useConfirmRefillOrderMutation,
  useCancelRefillOrderMutation,
  // Station side
  useGetMyRefillStationQuery,
  useUpdateMyRefillStationMutation,
  useUpdateMyRefillStationDocumentsMutation,
  useGetRefillStationDashboardQuery,
  useGetRefillStationOrdersQuery,
  useAcceptRefillOrderMutation,
  useRejectRefillOrderMutation,
  useAssignRefillRiderMutation,
  useMarkRefillReadyMutation,
  useMarkRefillDeliveredMutation,
  useCompleteRefillOrderMutation,
  // Team
  useGetRefillTeamQuery,
  useSearchUsersForRefillStationQuery,
  useLazySearchUsersForRefillStationQuery,
  useAddRefillTeamMemberMutation,
  useRemoveRefillTeamMemberMutation,
  // Commission / invoices (station side)
  useGetMyRefillCommissionQuery,
  useGetMyRefillInvoicesQuery,
  usePayRefillInvoiceMutation,
  useVerifyRefillInvoicePaymentQuery,
  useLazyVerifyRefillInvoicePaymentQuery,
  // Admin — stations
  useAdminGetRefillStationsQuery,
  useAdminGetRefillStationByIdQuery,
  useAdminApproveRefillStationMutation,
  useAdminRejectRefillStationMutation,
  useAdminBanRefillStationMutation,
  useAdminUnbanRefillStationMutation,
  useAdminOverrideCommissionRateMutation,
  // Admin — settings
  useAdminGetRefillSettingsQuery,
  useAdminUpdateRefillSettingsMutation,
  // Admin — invoices
  useAdminGetRefillInvoicesQuery,
  useAdminMarkInvoicePaidMutation,
  useAdminWaiveInvoiceMutation,
  useAdminGenerateInvoicesForPeriodMutation,
  useAdminRunAgingAndAutoBanMutation,
  // Admin — overview & orders
  useAdminGetRefillStatsQuery,
  useAdminGetRefillOrdersQuery,
} = refillApiSlice;