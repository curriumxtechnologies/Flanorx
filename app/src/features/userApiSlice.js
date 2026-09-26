import { apiSlice } from "./apiSlice.js";

const USER_URL = "/users";

export const userApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ---- Public ----
    register: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/register`,
        method: "POST",
        body: data,
      }),
    }),
    verifyOtp: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/verify-otp`,
        method: "POST",
        body: data,
      }),
    }),
    resendOtp: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/resend-otp`,
        method: "POST",
        body: data,
      }),
    }),
    login: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/login`,
        method: "POST",
        body: data,
      }),
    }),
    googleAuth: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/google`,
        method: "POST",
        body: data,
      }),
    }),
    forgotPassword: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/forgot-password`,
        method: "POST",
        body: data,
      }),
    }),
    verifyResetOtp: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/verify-reset-otp`,
        method: "POST",
        body: data,
      }),
    }),
    resetPassword: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/reset-password`,
        method: "POST",
        body: data,
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: `${USER_URL}/logout`,
        method: "POST",
      }),
    }),

    // ---- Terms / Privacy (public read) ----
    // Renders the register-page checkbox text AND the modal body.
    // Pass { type: "terms" | "privacy" } to fetch just one, or nothing
    // to get both documents in a single response.
    getTerms: builder.query({
      query: (params) => ({
        url: `${USER_URL}/terms`,
        method: "GET",
        params, // e.g. { type: "privacy" }
      }),
      providesTags: ["Terms"],
    }),

    // ---- Protected ----
    getProfile: builder.query({
      query: () => ({
        url: `${USER_URL}/profile`,
        method: "GET",
      }),
      providesTags: ["User"],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/profile`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
    uploadAvatar: builder.mutation({
      query: (formData) => ({
        url: `${USER_URL}/avatar`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["User"],
    }),
    changePassword: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/change-password`,
        method: "PUT",
        body: data,
      }),
    }),
    deleteAccount: builder.mutation({
      query: () => ({
        url: `${USER_URL}/account`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),

    // ---- Terms / Privacy (authenticated user) ----

    // Drives the modal: returns { requiresAcceptance, isMandatory,
    // canDismiss, daysLeft, graceEndsAt, pendingDocuments[], ... }.
    // Call this on app boot / after login to decide whether to show
    // the modal.
    getTermsStatus: builder.query({
      query: () => ({
        url: `${USER_URL}/terms-status`,
        method: "GET",
      }),
      providesTags: ["TermsStatus"],
    }),

    // Records acceptance of the current versions.
    // Body: { accepted: true, versions: { terms, privacy } }
    // Invalidates both the user profile (termsAccepted flips to true)
    // and the status query so the modal re-evaluates immediately.
    acceptTerms: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/accept-terms`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["TermsStatus", "User"],
    }),
  }),
});

// ✅ All hooks exported
export const {
  useRegisterMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useLoginMutation,
  useGoogleAuthMutation,
  useForgotPasswordMutation,
  useVerifyResetOtpMutation,
  useResetPasswordMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
  // Terms
  useGetTermsQuery,
  useGetTermsStatusQuery,
  useAcceptTermsMutation,
} = userApiSlice;