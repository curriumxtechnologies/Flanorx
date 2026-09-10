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

    // ─── 🆕 Get gas payment / transaction history ──────────────
    getGasPaymentHistory: builder.query({
      query: () => ({
        url: `${GAS_URL}/subscription/payments`,
        method: "GET",
      }),
      providesTags: ["GasPayments"],
    }),

    // ─── Subscribe (first time, with gas order) ────────────────
    subscribeGas: builder.mutation({
      query: (data) => ({
        url: `${GAS_URL}/subscription`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["GasSubscription", "GasPayments", "Order"],
    }),

    // ─── Verify subscription payment ───────────────────────────
    verifySubscriptionPayment: builder.query({
      query: (reference) => ({
        url: `${GAS_URL}/subscription/verify?reference=${reference}`,
        method: "GET",
      }),
      providesTags: ["GasSubscription", "GasPayments"],
    }),

    // ─── Renew subscription ────────────────────────────────────
    renewGasSubscription: builder.mutation({
      query: () => ({
        url: `${GAS_URL}/subscription/renew`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["GasSubscription", "GasPayments"],
    }),

    // ─── Verify renewal payment ────────────────────────────────
    verifyRenewalPayment: builder.query({
      query: (reference) => ({
        url: `${GAS_URL}/subscription/verify-renewal?reference=${reference}`,
        method: "GET",
      }),
      providesTags: ["GasSubscription", "GasPayments"],
    }),

    // ─── Upgrade subscription ──────────────────────────────────
    upgradeGasSubscription: builder.mutation({
      query: (data) => ({
        url: `${GAS_URL}/subscription/upgrade`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["GasSubscription", "GasPayments"],
    }),

    // ─── Verify upgrade payment ────────────────────────────────
    verifyUpgradePayment: builder.query({
      query: (reference) => ({
        url: `${GAS_URL}/subscription/verify-upgrade?reference=${reference}`,
        method: "GET",
      }),
      providesTags: ["GasSubscription", "GasPayments"],
    }),

    // ─── Cancel subscription ───────────────────────────────────
    cancelGasSubscription: builder.mutation({
      query: () => ({
        url: `${GAS_URL}/subscription`,
        method: "DELETE",
      }),
      invalidatesTags: ["GasSubscription", "GasPayments"],
    }),

    // ─── Cylinder-only subscription ────────────────────────────
    subscribeCylinderOnly: builder.mutation({
      query: (data) => ({
        url: `${GAS_URL}/subscription/cylinder`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["GasSubscription", "GasPayments"],
    }),

    // ─── Verify cylinder-only payment ──────────────────────────
    verifyCylinderOnlyPayment: builder.query({
      query: (reference) => ({
        url: `${GAS_URL}/subscription/verify-cylinder?reference=${reference}`,
        method: "GET",
      }),
      providesTags: ["GasSubscription", "GasPayments"],
    }),
  }),
});

// ─── Export hooks ──────────────────────────────────────────────
export const {
  useGetGasSubscriptionQuery,
  useGetGasPaymentHistoryQuery,        // 🆕
  useSubscribeGasMutation,
  useVerifySubscriptionPaymentQuery,
  useRenewGasSubscriptionMutation,
  useVerifyRenewalPaymentQuery,
  useUpgradeGasSubscriptionMutation,
  useVerifyUpgradePaymentQuery,
  useCancelGasSubscriptionMutation,
  useSubscribeCylinderOnlyMutation,
  useVerifyCylinderOnlyPaymentQuery,
} = gasApiSlice;