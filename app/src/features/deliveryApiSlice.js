// features/deliveryApiSlice.js
import { apiSlice } from "./apiSlice.js";

const DELIVERY_URL = "/delivery";

export const deliveryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Rider: Get available deliveries ────────────────────
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

    // ─── Rider: Accept a delivery ───────────────────────────
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

    // ─── Customer: Confirm delivery ─────────────────────────
    confirmDelivery: builder.mutation({
      query: (id) => ({
        url: `${DELIVERY_URL}/${id}/confirm`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
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

// ─── Export hooks ──────────────────────────────────────────────
export const {
  useGetAvailableDeliveriesQuery,
  useGetMyAssignedDeliveriesQuery,
  useAcceptDeliveryMutation,
  useUpdateDeliveryProgressMutation,
  useConfirmDeliveryMutation,
  useGetDeliveryDetailsQuery,
  useGetRiderEarningsQuery,
} = deliveryApiSlice;