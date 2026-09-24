// Login.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router";
import { useDispatch } from "react-redux";
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import {
  useLoginMutation,
  useGoogleAuthMutation,
  useForgotPasswordMutation,
  useVerifyResetOtpMutation,
  useResetPasswordMutation,
} from "../features/userApiSlice";
import { setCredentials } from "../features/auth/authSlice";

// ─── Brand icons ────────────────────────────────────────────
const GoogleIcon = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className}>
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

// ─── Role-based redirect helper ────────────────────────────
const getRedirectPath = (role) => {
  if (role === "admin") return "/superuser/dashboard";
  if (role === "rider") return "/rider/dashboard";
  return "/dashboard";
};

// ─── OAuth bridge ──────────────────────────────────────────
// Google's Web client ONLY accepts http(s) redirect URIs.
// Native apps must bounce through a hosted HTTPS page that
// forwards the OAuth params into a custom scheme, which the
// app's appUrlOpen listener then picks up.
//
// Flow:
//   Google → https://flanorx.com/oauth/mobile-callback.html#access_token=…
//          → com.flanorx.app://oauth_callback#access_token=…
//          → appUrlOpen listener → handleGoogleTokenExchange()
const NATIVE_REDIRECT_URI = "https://flanorx.com/oauth/mobile-callback.html";
const APP_DEEP_LINK = "com.flanorx.app://oauth_callback";

// ─── Step constants ────────────────────────────────────────
const STEP = {
  LOGIN: "login",
  FORGOT: "forgot",
  OTP: "otp",
  RESET: "reset",
  DONE: "done",
};

// ─── Modern "Remember me" chip ─────────────────────────────
const RememberChip = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`group inline-flex items-center gap-2 rounded-full pl-2.5 pr-3.5 py-1.5 text-xs font-medium tracking-tight transition-all duration-200 ease-out select-none ${
      checked
        ? "bg-[#13ec5b]/12 text-[#0f9c46] dark:bg-[#13ec5b]/15 dark:text-[#13ec5b] shadow-[inset_0_0_0_1px_rgba(19,236,91,0.25)]"
        : "bg-slate-100/70 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.15)] hover:bg-slate-100 dark:hover:bg-slate-800"
    }`}
  >
    <span className="relative flex items-center justify-center h-3.5 w-3.5">
      <span
        className={`absolute inset-0 rounded-full transition-opacity duration-300 ${
          checked ? "opacity-100 bg-[#13ec5b]/25" : "opacity-0"
        }`}
      />
      <span
        className={`relative h-2 w-2 rounded-full transition-all duration-300 ease-out ${
          checked
            ? "bg-[#13ec5b] shadow-[0_0_8px_rgba(19,236,91,0.7)]"
            : "bg-slate-400 dark:bg-slate-500"
        }`}
      />
    </span>
    <span className="transition-colors duration-200">{label}</span>
  </button>
);

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ─── Auth mutations ──────────────────────────────────────
  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [googleAuth, { isLoading: isGoogleLoading }] = useGoogleAuthMutation();
  const [forgotPassword, { isLoading: isForgotLoading }] =
    useForgotPasswordMutation();
  const [verifyResetOtp, { isLoading: isVerifyOtpLoading }] =
    useVerifyResetOtpMutation();
  const [resetPassword, { isLoading: isResetLoading }] =
    useResetPasswordMutation();

  // ─── Login form state ────────────────────────────────────
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─── Reset-password flow state ───────────────────────────
  const [step, setStep] = useState(STEP.LOGIN);
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [flowMessage, setFlowMessage] = useState({ text: "", type: "" });

  const appUrlListenerRef = useRef(null);

  // ─── Redirect if already logged in ───────────────────────
  useEffect(() => {
    const authData =
      localStorage.getItem("userInfo") || localStorage.getItem("flanorx_auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed?.token) {
          navigate(getRedirectPath(parsed.role), { replace: true });
        }
      } catch {
        localStorage.removeItem("flanorx_auth");
        localStorage.removeItem("userInfo");
      }
    }
  }, [navigate]);

  // ─── Deep link listener (native only) ───────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removed = false;

    const setupListener = async () => {
      const listener = await App.addListener("appUrlOpen", async (event) => {
        try {
          const url = new URL(event.url);

          const isOAuthCallback =
            url.hostname === "oauth_callback" ||
            url.pathname.includes("oauth_callback") ||
            url.href.includes("oauth_callback");

          if (!isOAuthCallback) return;

          // Google's implicit flow returns the token in the URL FRAGMENT
          // (after '#'), not the query string. Merge both so we handle
          // implicit ("#access_token=…") and code flow ("?code=…").
          const params = new URLSearchParams(url.search);
          if (url.hash && url.hash.length > 1) {
            const hashParams = new URLSearchParams(url.hash.substring(1));
            hashParams.forEach((value, key) => params.set(key, value));
          }

          const accessToken = params.get("access_token");
          const authError = params.get("error");

          try {
            await Browser.close();
          } catch {
            // ignore if already closed
          }

          if (authError) {
            setError("Google sign-in was cancelled or failed");
            return;
          }

          if (accessToken) {
            await handleGoogleTokenExchange(accessToken);
          }
        } catch {
          // Malformed URL — ignore
        }
      });

      if (removed) {
        listener.remove();
      } else {
        appUrlListenerRef.current = listener;
      }
    };

    setupListener();

    return () => {
      removed = true;
      if (appUrlListenerRef.current) {
        appUrlListenerRef.current.remove();
        appUrlListenerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Reset the entire forgot-password flow ───────────────
  const resetForgotFlow = () => {
    setStep(STEP.LOGIN);
    setResetEmail("");
    setOtp("");
    setVerifiedOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setFlowMessage({ text: "", type: "" });
  };

  // ─── Login submit ────────────────────────────────────────
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { email, password } = formData;
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const result = await login({ email, password, rememberMe }).unwrap();
      dispatch(setCredentials(result));
      localStorage.setItem(
        "flanorx_auth",
        JSON.stringify({
          token: result.token,
          _id: result._id,
          name: result.name,
          email: result.email,
          role: result.role,
          profile: result.profile,
          authMethod: result.authMethod,
          userType: "customer",
          rememberMe,
          loggedInAt: Date.now(),
        })
      );
      setSuccess("Login successful! Redirecting...");
      setTimeout(() => {
        navigate(getRedirectPath(result.role), { replace: true });
      }, 1000);
    } catch (err) {
      setError(err.data?.message || err.message || "Login failed");
    }
  };

  // ─── Shared: exchange Google token with backend ──────────
  const handleGoogleTokenExchange = async (accessToken) => {
    try {
      const result = await googleAuth({ token: accessToken }).unwrap();

      dispatch(setCredentials(result));
      localStorage.setItem(
        "flanorx_auth",
        JSON.stringify({
          token: result.token,
          _id: result._id,
          name: result.name,
          email: result.email,
          role: result.role,
          profile: result.profile,
          authMethod: result.authMethod,
          userType: "customer",
          loggedInAt: Date.now(),
        })
      );

      setSuccess("Google login successful!");
      setTimeout(() => {
        navigate(getRedirectPath(result.role), { replace: true });
      }, 1000);
    } catch (err) {
      setError(err.data?.message || err.message || "Google login failed");
    }
  };

  // ─── Platform-aware Google login ─────────────────────────
  const handleGoogleLogin = () => {
    setError("");

    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (Capacitor.isNativePlatform()) {
      // Web client IDs only accept http(s) redirect URIs, so we bounce
      // through a hosted HTTPS bridge that forwards to our app scheme.
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: NATIVE_REDIRECT_URI,
        response_type: "token",
        scope: "openid email profile",
        prompt: "select_account",
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      Browser.open({
        url: authUrl,
        presentationStyle: "popover",
      });
      return;
    }

    // ── Web path: Google Identity Services popup flow ──
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: async (resp) => {
        try {
          if (!resp?.access_token) throw new Error("No access token");
          await handleGoogleTokenExchange(resp.access_token);
        } catch (err) {
          setError(err.data?.message || err.message || "Google login failed");
        }
      },
    });

    if (!tokenClient) {
      setError(
        "Google sign-in is not ready yet. Please refresh and try again."
      );
      return;
    }

    tokenClient.requestAccessToken({ prompt: "select_account" });
  };

  // ═══════════════════════════════════════════════════════════
  // RESET PASSWORD FLOW
  // ═══════════════════════════════════════════════════════════

  // Step 1: request OTP
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setFlowMessage({ text: "", type: "" });

    if (!resetEmail.trim()) {
      setFlowMessage({ text: "Please enter your email", type: "error" });
      return;
    }

    try {
      await forgotPassword({ email: resetEmail.trim() }).unwrap();
      setStep(STEP.OTP);
      setOtp("");
      setVerifiedOtp("");
      setFlowMessage({
        text: `We've sent a 6-digit code to ${resetEmail}.`,
        type: "success",
      });
    } catch (err) {
      setFlowMessage({
        text: err.data?.message || "Failed to send reset email",
        type: "error",
      });
    }
  };

  // Step 2: verify OTP BEFORE showing password form
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setFlowMessage({ text: "", type: "" });

    const cleanOtp = otp.replace(/\D/g, "").slice(0, 6);
    if (cleanOtp.length !== 6) {
      setFlowMessage({
        text: "Please enter the 6-digit code from your email",
        type: "error",
      });
      return;
    }

    try {
      await verifyResetOtp({
        email: resetEmail.trim(),
        otp: cleanOtp,
      }).unwrap();

      setVerifiedOtp(cleanOtp);
      setStep(STEP.RESET);
      setNewPassword("");
      setConfirmPassword("");
      setFlowMessage({
        text: "Code verified. Now choose your new password.",
        type: "success",
      });
    } catch (err) {
      setFlowMessage({
        text: err.data?.message || "Invalid or expired code. Try again.",
        type: "error",
      });
    }
  };

  // Step 3: submit new password (OTP is already verified)
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setFlowMessage({ text: "", type: "" });

    if (newPassword.length < 8) {
      setFlowMessage({
        text: "Password must be at least 8 characters",
        type: "error",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFlowMessage({ text: "Passwords don't match", type: "error" });
      return;
    }

    try {
      await resetPassword({
        email: resetEmail.trim(),
        otp: verifiedOtp,
        newPassword,
      }).unwrap();

      setStep(STEP.DONE);
      setFlowMessage({ text: "", type: "" });

      setFormData((prev) => ({ ...prev, email: resetEmail.trim() }));

      setTimeout(() => {
        resetForgotFlow();
      }, 4000);
    } catch (err) {
      setFlowMessage({
        text: err.data?.message || "Failed to reset password. Try again.",
        type: "error",
      });
    }
  };

  // ─── Resend OTP ──────────────────────────────────────────
  const handleResendOtp = async () => {
    setFlowMessage({ text: "", type: "" });
    try {
      await forgotPassword({ email: resetEmail.trim() }).unwrap();
      setOtp("");
      setFlowMessage({
        text: `A new code was sent to ${resetEmail}.`,
        type: "success",
      });
    } catch (err) {
      setFlowMessage({
        text: err.data?.message || "Couldn't resend code. Try again.",
        type: "error",
      });
    }
  };

  const isLoading = isLoginLoading || isGoogleLoading;

  // ─── Reusable alert block ────────────────────────────────
  const FlowAlert = () =>
    flowMessage.text ? (
      <div
        className={`mb-5 p-3 rounded-lg text-sm border ${
          flowMessage.type === "error"
            ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
            : "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
        }`}
      >
        {flowMessage.text}
      </div>
    ) : null;

  // ─── Reusable input classes ──────────────────────────────
  const inputCls =
    "w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 focus:border-[#13ec5b] transition";

  const primaryBtnCls =
    "w-full py-3.5 px-4 bg-[#13ec5b] hover:bg-[#10d04e] active:bg-[#0fbe47] text-gray-900 font-bold rounded-xl transition duration-150 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base";

  // ─── Password strength hints ─────────────────────────────
  const passwordOk = newPassword.length >= 8;
  const passwordsMatch =
    newPassword && confirmPassword && newPassword === confirmPassword;

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      {/* ═══ LEFT — image panel (desktop only) ═══ */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen sticky top-0 h-screen overflow-hidden">
        <img
          src="https://i.pinimg.com/1200x/ce/1c/4f/ce1c4f2e9b5bc5f27cdc3a92289d3b25.jpg"
          alt="Fuel and gas delivery"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#13ec5b]/20 to-transparent" />
        <div className="absolute bottom-10 left-10 text-white">
          <h2 className="text-3xl font-bold drop-shadow-lg">
            Fuel &amp; Gas at your doorstep
          </h2>
          <p className="text-lg opacity-90">Skip the line, we deliver.</p>
        </div>
      </div>

      {/* ═══ RIGHT — form panel ═══ */}
      <div className="w-full lg:w-1/2 min-h-screen overflow-y-auto flex flex-col justify-center bg-white dark:bg-gray-950">
        <div className="w-full max-w-md lg:max-w-xl 2xl:max-w-2xl mx-auto px-5 py-8 sm:px-8 sm:py-12 lg:px-8 lg:py-16">
          {/* Logo */}
          <div className="flex justify-center lg:justify-start mb-8 lg:mb-10">
            <img
              src="/flanorx.png"
              alt="Flanorx"
              className="h-7 sm:h-8 w-auto"
            />
          </div>

          {/* ═══════════════════════════════════════════════════
              STEP: LOGIN
              ═══════════════════════════════════════════════════ */}
          {step === STEP.LOGIN && (
            <>
              <div className="text-center lg:text-left mb-7 lg:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Welcome back
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
                  Sign in to continue saving on fuel &amp; gas.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-5 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm border border-green-200 dark:border-green-800">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                      className={inputCls}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(STEP.FORGOT);
                        setResetEmail(formData.email || "");
                        setFlowMessage({ text: "", type: "" });
                      }}
                      className="text-xs sm:text-sm font-medium text-[#0f9c46] dark:text-[#13ec5b] hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-12 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 focus:border-[#13ec5b] transition"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>
                </div>

                <RememberChip
                  checked={rememberMe}
                  onChange={setRememberMe}
                  label="Remember me"
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className={primaryBtnCls}
                >
                  {isLoginLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-[11px] sm:text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  or continue with
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-gray-900 hover:bg-slate-50 dark:hover:bg-gray-800 active:bg-slate-100 dark:active:bg-gray-700 transition font-medium text-sm text-slate-700 dark:text-slate-300 disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <GoogleIcon className="h-4.5 w-4.5" />
                )}
                <span>Continue with Google</span>
              </button>

              <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-[#0f9c46] dark:text-[#13ec5b] hover:underline"
                >
                  Create one
                </Link>
              </p>
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              STEP: FORGOT (enter email)
              ═══════════════════════════════════════════════════ */}
          {step === STEP.FORGOT && (
            <>
              <div className="mb-6">
                <button
                  onClick={resetForgotFlow}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Reset password
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
                  Enter your email and we'll send you a 6-digit code.
                </p>
              </div>

              <FlowAlert />

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                      className={inputCls}
                      disabled={isForgotLoading}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className={primaryBtnCls}
                >
                  {isForgotLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Send reset code"
                  )}
                </button>
              </form>
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              STEP: OTP (verify code before showing password form)
              ═══════════════════════════════════════════════════ */}
          {step === STEP.OTP && (
            <>
              <div className="mb-6">
                <button
                  onClick={() => {
                    setStep(STEP.FORGOT);
                    setFlowMessage({ text: "", type: "" });
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change email
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-6 w-6 text-[#13ec5b]" />
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Verify your code
                  </h1>
                </div>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {resetEmail}
                  </span>
                  .
                </p>
              </div>

              <FlowAlert />

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    className="w-full text-center text-2xl sm:text-3xl font-bold tracking-[0.6em] py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 focus:border-[#13ec5b] transition"
                    disabled={isVerifyOtpLoading}
                  />
                  <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Didn't get it?{" "}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isForgotLoading}
                      className="font-semibold text-[#0f9c46] dark:text-[#13ec5b] hover:underline disabled:opacity-50"
                    >
                      {isForgotLoading ? "Sending..." : "Resend code"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyOtpLoading || otp.length !== 6}
                  className={primaryBtnCls}
                >
                  {isVerifyOtpLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Verify code"
                  )}
                </button>
              </form>
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              STEP: RESET (new password — OTP already verified)
              ═══════════════════════════════════════════════════ */}
          {step === STEP.RESET && (
            <>
              <div className="mb-6">
                <button
                  onClick={() => {
                    setStep(STEP.OTP);
                    setFlowMessage({ text: "", type: "" });
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to code
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-6 w-6 text-[#13ec5b]" />
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Choose a new password
                  </h1>
                </div>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
                  Your code was verified. Set a new password for{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {resetEmail}
                  </span>
                  .
                </p>
              </div>

              <FlowAlert />

              <form onSubmit={handleResetSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-12 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 focus:border-[#13ec5b] transition"
                      disabled={isResetLoading}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
                      aria-label={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>
                  {newPassword && (
                    <p
                      className={`text-xs mt-1.5 ${
                        passwordOk
                          ? "text-green-600 dark:text-green-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {passwordOk
                        ? "✓ Strong enough"
                        : "Must be at least 8 characters"}
                    </p>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 focus:border-[#13ec5b] transition"
                      disabled={isResetLoading}
                    />
                  </div>
                  {confirmPassword && (
                    <p
                      className={`text-xs mt-1.5 ${
                        passwordsMatch
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {passwordsMatch
                        ? "✓ Passwords match"
                        : "Passwords don't match"}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isResetLoading || !passwordOk || !passwordsMatch}
                  className={primaryBtnCls}
                >
                  {isResetLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Reset password"
                  )}
                </button>
              </form>
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              STEP: DONE
              ═══════════════════════════════════════════════════ */}
          {step === STEP.DONE && (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-5">
                <CheckCircle2 className="h-9 w-9 text-[#0f9c46] dark:text-[#13ec5b]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                Password updated
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mb-6">
                You can now sign in with your new password.
              </p>
              <button onClick={resetForgotFlow} className={primaryBtnCls}>
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;