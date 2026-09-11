// features/orderApiSlice.js
import { apiSlice } from "./apiSlice.js";

const ORDER_URL = "/order";

export const orderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Create order (fuel or gas) ──────────────────────────
    createOrder: builder.mutation({
      query: (orderData) => ({
        url: ORDER_URL,
        method: "POST",
        body: orderData,
      }),
      invalidatesTags: ["Order"],
    }),

    // ─── Get my orders (with filters) ────────────────────────
    getMyOrders: builder.query({
      query: ({
        month,
        year,
        status,
        paid,
        deliveryStatus,
        orderType,
      } = {}) => {
        const params = new URLSearchParams();
        if (month) params.append("month", month);
        if (year) params.append("year", year);
        if (status) params.append("status", status);
        if (paid !== undefined) params.append("paid", paid);
        if (deliveryStatus) params.append("deliveryStatus", deliveryStatus);
        if (orderType) params.append("orderType", orderType);
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return {
          url: `${ORDER_URL}/my${queryString}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "Order", id: _id })),
              { type: "Order", id: "LIST" },
            ]
          : [{ type: "Order", id: "LIST" }],
    }),

    // ─── Total spent (monthly) ──────────────────────────────
    getMyTotalSpent: builder.query({
      query: ({ month, year, paid, orderType }) => {
        const params = new URLSearchParams({ month, year });
        if (paid !== undefined) params.append("paid", paid);
        if (orderType) params.append("orderType", orderType);
        return {
          url: `${ORDER_URL}/total-spent?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["Order"],
    }),

    // ─── Active order ─────────────────────────────────────────
    getMyActiveOrder: builder.query({
      query: () => ({
        url: `${ORDER_URL}/active`,
        method: "GET",
      }),
      providesTags: ["Order"],
    }),

    // ─── Single order by ID ──────────────────────────────────
    getOrderById: builder.query({
      query: (id) => ({
        url: `${ORDER_URL}/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Order", id }],
    }),

    // ─── Delivery status ──────────────────────────────────────
    getDeliveryStatus: builder.query({
      query: (id) => ({
        url: `${ORDER_URL}/${id}/delivery-status`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Order", id }],
    }),

    // ─── Pay order (verify payment) ──────────────────────────
    payOrder: builder.mutation({
      query: ({ id, paymentReference }) => ({
        url: `${ORDER_URL}/${id}/pay`,
        method: "PUT",
        body: { paymentReference },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Order", id }],
    }),

    // ─── Initialize payment ──────────────────────────────────
    initializePayment: builder.mutation({
      query: (id) => ({
        url: `${ORDER_URL}/${id}/initialize-payment`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: (result, error, id) => [{ type: "Order", id }],
    }),

    // ─── Verify payment (public) ────────────────────────────
    verifyPayment: builder.query({
      query: (reference) => ({
        url: `${ORDER_URL}/verify/${reference}`,
        method: "GET",
      }),
      providesTags: (result, error, reference) => [
        { type: "Order", id: result?.order?._id },
      ],
    }),

    // ⭐ NEW — QR scan to confirm order (fuel delivery / gas delivery / gas pickup)
    // body: { token }
    verifyOrderByToken: builder.mutation({
      query: ({ token }) => ({
        url: `${ORDER_URL}/verify`,
        method: "POST",
        body: { token },
      }),
      invalidatesTags: (result, error) => [
        "Order",
        "Delivery",
        "Station",
        { type: "Order", id: result?.order?._id },
      ],
    }),

    // ─── Admin: all orders ───────────────────────────────────
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
          url: `${ORDER_URL}${queryString}`,
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

    // ─── Admin: dashboard stats ──────────────────────────────
    getDashboardStats: builder.query({
      query: () => ({
        url: `${ORDER_URL}/stats/dashboard`,
        method: "GET",
      }),
      providesTags: ["Order"],
    }),

    // ─── Admin: update order status ──────────────────────────
    updateOrderStatus: builder.mutation({
      query: ({ id, status, deliveryStatus }) => ({
        url: `${ORDER_URL}/${id}/status`,
        method: "PUT",
        body: { status, deliveryStatus },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Order", id }],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetMyOrdersQuery,
  useGetMyTotalSpentQuery,
  useGetMyActiveOrderQuery,
  useGetOrderByIdQuery,
  useGetDeliveryStatusQuery,
  usePayOrderMutation,
  useInitializePaymentMutation,
  useVerifyPaymentQuery,
  useVerifyOrderByTokenMutation, // ⭐ NEW
  useGetAllOrdersQuery,
  useGetDashboardStatsQuery,
  useUpdateOrderStatusMutation,
} = orderApiSlice;