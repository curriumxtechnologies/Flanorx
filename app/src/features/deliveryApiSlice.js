// features/deliveryApiSlice.js
import { apiSlice } from "./apiSlice.js";

const DELIVERY_URL = "/delivery";

export const deliveryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Rider: Get available (fuel) deliveries ─────────────
    getAvailableDeliveries: builder.query({
      query: () => ({
        url: `${DELIVERY_URL}/available`,
        method: "GET",
      }),
      providesTags: ["Delivery"],
    }),

    // ─── Rider: Get my assigned deliveries ──────────────────
    getMyAssignedDeliveries: builder.query({
      query: () => ({
        url: `${DELIVERY_URL}/my-deliveries`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "Delivery", id: _id })),
              { type: "Delivery", id: "ASSIGNED" },
            ]
          : [{ type: "Delivery", id: "ASSIGNED" }],
    }),

    // ─── Rider: Accept a delivery (fuel only) ───────────────
    acceptDelivery: builder.mutation({
      query: (id) => ({
        url: `${DELIVERY_URL}/${id}/accept`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Delivery", id },
        "Delivery",
      ],
    }),

    // ─── Rider: Update delivery progress ────────────────────
    // (picked_up / in_transit / delivered — "delivered" is a status only,
    //  order completes on QR scan via orderApiSlice.verifyOrderByToken)
    updateDeliveryProgress: builder.mutation({
      query: ({ id, deliveryStatus }) => ({
        url: `${DELIVERY_URL}/${id}/status`,
        method: "PUT",
        body: { deliveryStatus },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Delivery", id },
        "Delivery",
      ],
    }),

    // ─── Mixed: Get delivery details ────────────────────────
    getDeliveryDetails: builder.query({
      query: (id) => ({
        url: `${DELIVERY_URL}/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Delivery", id }],
    }),

    // ─── Rider: Get earnings summary ────────────────────────
    getRiderEarnings: builder.query({
      query: () => ({
        url: `${DELIVERY_URL}/rider/earnings`,
        method: "GET",
      }),
      providesTags: ["Delivery"],
    }),
  }),
});

export const {
  useGetAvailableDeliveriesQuery,
  useGetMyAssignedDeliveriesQuery,
  useAcceptDeliveryMutation,
  useUpdateDeliveryProgressMutation,
  useGetDeliveryDetailsQuery,
  useGetRiderEarningsQuery,
} = deliveryApiSlice;