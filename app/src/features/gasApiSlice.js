// features/gasApiSlice.js
import { apiSlice } from "./apiSlice.js";

const GAS_URL = "/gas";

export const gasApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Get current subscription ──────────────────────────────
    getGasSubscription: builder.query({
      query: () => ({
        url: `${GAS_URL}/subscription`,
        method: "GET",
      }),
      providesTags: ["GasSubscription"],
    }),

    // ─── Subscribe (first time) ────────────────────────────────
    subscribeGas: builder.mutation({
      query: (data) => ({
        url: `${GAS_URL}/subscription`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["GasSubscription"],
    }),

    // ─── Verify subscription payment ───────────────────────────
    verifySubscriptionPayment: builder.query({
      query: (reference) => ({
        url: `${GAS_URL}/subscription/verify?reference=${reference}`,
        method: "GET",
      }),
      providesTags: ["GasSubscription"],
    }),

    // ─── Renew subscription ────────────────────────────────────
    renewGasSubscription: builder.mutation({
      query: () => ({
        url: `${GAS_URL}/subscription/renew`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["GasSubscription"],
    }),

    // ─── Verify renewal payment ────────────────────────────────
    verifyRenewalPayment: builder.query({
      query: (reference) => ({
        url: `${GAS_URL}/subscription/verify-renewal?reference=${reference}`,
        method: "GET",
      }),
      providesTags: ["GasSubscription"],
    }),

    // ─── Upgrade subscription ──────────────────────────────────
    upgradeGasSubscription: builder.mutation({
      query: (data) => ({
        url: `${GAS_URL}/subscription/upgrade`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["GasSubscription"],
    }),

    // ─── Verify upgrade payment ────────────────────────────────
    verifyUpgradePayment: builder.query({
      query: (reference) => ({
        url: `${GAS_URL}/subscription/verify-upgrade?reference=${reference}`,
        method: "GET",
      }),
      providesTags: ["GasSubscription"],
    }),

    // ─── Cancel subscription ───────────────────────────────────
    cancelGasSubscription: builder.mutation({
      query: () => ({
        url: `${GAS_URL}/subscription`,
        method: "DELETE",
      }),
      invalidatesTags: ["GasSubscription"],
    }),
  }),
});

// ─── Export hooks ──────────────────────────────────────────────
export const {
  useGetGasSubscriptionQuery,
  useSubscribeGasMutation,
  useVerifySubscriptionPaymentQuery,
  useRenewGasSubscriptionMutation,
  useVerifyRenewalPaymentQuery,
  useUpgradeGasSubscriptionMutation,
  useVerifyUpgradePaymentQuery,
  useCancelGasSubscriptionMutation,
} = gasApiSlice;