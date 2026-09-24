// Signup.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router";
import { useDispatch } from "react-redux";
import {
  Mail,
  Lock,
  User,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import {
  useRegisterMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useGoogleAuthMutation,
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

// ─── OAuth bridge ──────────────────────────────────────────
// Google's Web client ONLY accepts http(s) redirect URIs.
// Native apps bounce through a hosted HTTPS page that forwards
// the OAuth params into a custom scheme, which the app's
// appUrlOpen listener then picks up.
const NATIVE_REDIRECT_URI = "https://flanorx.com/oauth/mobile-callback.html";

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();
  const [verifyOtp, { isLoading: isVerifyLoading }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResendLoading }] = useResendOtpMutation();
  const [googleAuth, { isLoading: isGoogleLoading }] = useGoogleAuthMutation();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    username: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef(null);
  const appUrlListenerRef = useRef(null);

  // Redirect if already logged in
  useEffect(() => {
    const authData = localStorage.getItem("flanorx_auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed?.token) {
          navigate("/dashboard", { replace: true });
        }
      } catch {
        localStorage.removeItem("flanorx_auth");
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (step === 2 && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timerRef.current);
  }, [step, timer]);

  // ─── Deep link listener (native only) ───
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removed = false;

    const setupListener = async () => {
      const listener = await App.addListener("appUrlOpen", async (event) => {
        try {
          const url = new URL(event.url);

          // Match our OAuth callback
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

          // Close the in-app browser sheet
          try {
            await Browser.close();
          } catch {
            // ignore if already closed
          }

          if (authError) {
            setError("Google signup was cancelled or failed");
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
        // Component unmounted before we could store the ref — clean up now
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { name, email, password } = formData;
    if (!name || !email || !password) {
      setError("Please fill in all required fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      await register({
        name,
        email,
        password,
        username: formData.username || undefined,
      }).unwrap();

      setRegisteredEmail(email);
      setSuccess("Account created! Please verify your email with the OTP.");
      setStep(2);
      setTimer(60);
      setCanResend(false);
    } catch (err) {
      setError(err.data?.message || err.message || "Registration failed");
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      if (next) next.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      if (prev) prev.focus();
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    try {
      const result = await verifyOtp({
        email: registeredEmail,
        otp: otpString,
      }).unwrap();

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

      setSuccess("Email verified! Redirecting...");
      setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
    } catch (err) {
      setError(err.data?.message || err.message || "Verification failed");
    }
  };

  const handleResendOtp = async () => {
    setError("");
    try {
      await resendOtp({ email: registeredEmail }).unwrap();
      setTimer(60);
      setCanResend(false);
      setSuccess("New OTP sent to your email");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.data?.message || err.message || "Failed to resend OTP");
    }
  };

  // ─── Shared: exchange Google token with backend ───
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

      setSuccess("Account created with Google!");
      setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
    } catch (err) {
      setError(err.data?.message || err.message || "Google signup failed");
    }
  };

  // ─── Platform-aware Google signup ───
  const handleGoogleSignup = () => {
    setError("");

    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (Capacitor.isNativePlatform()) {
      // ─── NATIVE: Google → HTTPS bridge → app scheme ───
      // Web client IDs reject custom schemes, so we redirect to a hosted
      // page that forwards the OAuth params into com.flanorx.app://…
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
        presentationStyle: "popover", // iOS presentation style
      });
      return;
    }

    // ─── WEB: use Google Identity Services popup ───
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: async (resp) => {
        try {
          if (!resp?.access_token) throw new Error("No access token");
          await handleGoogleTokenExchange(resp.access_token);
        } catch (err) {
          setError(err.data?.message || err.message || "Google signup failed");
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

  const isLoading =
    isRegisterLoading || isVerifyLoading || isResendLoading || isGoogleLoading;

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

          {step === 1 ? (
            // ═══ SIGNUP FORM ═══
            <>
              <div className="text-center lg:text-left mb-7 lg:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Create your account
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
                  Join Flanorx and start saving on fuel &amp; gas.
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

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Full name{" "}
                    <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      autoComplete="name"
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 focus:border-[#13ec5b] transition"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email{" "}
                    <span className="text-red-500 dark:text-red-400">*</span>
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
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 focus:border-[#13ec5b] transition"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Password{" "}
                    <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Username{" "}
                    <span className="text-slate-400 dark:text-slate-500 font-normal">
                      (optional)
                    </span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="johndoe"
                      autoComplete="username"
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 focus:border-[#13ec5b] transition"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-[#13ec5b] hover:bg-[#10d04e] active:bg-[#0fbe47] text-gray-900 font-bold rounded-xl transition duration-150 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
                >
                  {isRegisterLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Create account"
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
                onClick={handleGoogleSignup}
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
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-[#0f9c46] dark:text-[#13ec5b] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            // ═══ OTP VERIFICATION ═══
            <>
              <div className="mb-6">
                <button
                  onClick={() => {
                    setStep(1);
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                    setSuccess("");
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Verify your email
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300 break-all">
                    {registeredEmail}
                  </span>
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

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Enter the 6-digit code
                </label>
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength="1"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-full aspect-square text-center text-lg sm:text-xl font-bold rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 focus:border-[#13ec5b] transition"
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-[#13ec5b] hover:bg-[#10d04e] active:bg-[#0fbe47] text-gray-900 font-bold rounded-xl transition duration-150 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
              >
                {isVerifyLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Verify email"
                )}
              </button>

              <div className="mt-5 flex items-center justify-between gap-2 text-sm">
                {timer > 0 ? (
                  <span className="text-slate-500 dark:text-slate-400">
                    Resend in{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {timer}s
                    </span>
                  </span>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    disabled={isResendLoading || !canResend}
                    className="text-[#0f9c46] dark:text-[#13ec5b] hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    {isResendLoading && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Resend code
                  </button>
                )}
                <button
                  onClick={() => {
                    setStep(1);
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                    setSuccess("");
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition text-sm"
                >
                  Change email
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;