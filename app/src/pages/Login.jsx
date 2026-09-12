// Login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import {
  useLoginMutation,
  useGoogleAuthMutation,
  useForgotPasswordMutation,
} from "../features/userApiSlice";
import { setCredentials } from "../features/auth/authSlice";

// ─── Brand icons ────────────────────────────────────────────
const AppleIcon = ({ className }) => (
  <svg
    viewBox="0 0 384 512"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76-19.7C63.3 141 0 184.8 0 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-57.7-90-57.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const FacebookIcon = ({ className }) => (
  <svg
    viewBox="0 0 320 512"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
  </svg>
);

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

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [googleAuth, { isLoading: isGoogleLoading }] = useGoogleAuthMutation();
  const [forgotPassword, { isLoading: isForgotLoading }] =
    useForgotPasswordMutation();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState({ text: "", type: "" });

  // ─── Redirect if already logged in ────────────────────────
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
      const result = await login({ email, password }).unwrap();
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
      setSuccess("Login successful! Redirecting...");
      setTimeout(() => {
        navigate(getRedirectPath(result.role), { replace: true });
      }, 1000);
    } catch (err) {
      setError(err.data?.message || err.message || "Login failed");
    }
  };

  const handleGoogleLogin = () => {
    setError("");
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: async (resp) => {
        try {
          if (!resp?.access_token) throw new Error("No access token");
          const result = await googleAuth({
            token: resp.access_token,
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
          setSuccess("Google login successful!");
          setTimeout(() => {
            navigate(getRedirectPath(result.role), { replace: true });
          }, 1000);
        } catch (err) {
          setError(err.data?.message || err.message || "Google login failed");
        }
      },
    });
    tokenClient.requestAccessToken({ prompt: "select_account" });
  };

  const handleSocialUnavailable = (provider) => {
    toast(`${provider} sign-in isn't available for now`);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotMessage({ text: "", type: "" });
    if (!forgotEmail) {
      setForgotMessage({ text: "Please enter your email", type: "error" });
      return;
    }
    try {
      await forgotPassword({ email: forgotEmail }).unwrap();
      setForgotMessage({
        text: "If that email exists, an OTP has been sent.",
        type: "success",
      });
      setForgotEmail("");
      setTimeout(() => {
        setIsForgotMode(false);
        setForgotMessage({ text: "", type: "" });
      }, 5000);
    } catch (err) {
      setForgotMessage({
        text: err.data?.message || "Failed to send reset email",
        type: "error",
      });
    }
  };

  const isLoading = isLoginLoading || isGoogleLoading;

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
        <div className="w-full max-w-md mx-auto px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
          {/* Logo */}
          <div className="flex justify-center lg:justify-start mb-8 lg:mb-10">
            <img src="/flanorx.png" alt="Flanorx" className="h-7 sm:h-8 w-auto" />
          </div>

          {!isForgotMode ? (
            <>
              {/* Heading */}
              <div className="text-center lg:text-left mb-7 lg:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Welcome back
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
                  Sign in to continue saving on fuel &amp; gas.
                </p>
              </div>

              {/* Alerts */}
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

              {/* ═══ Form ═══ */}
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
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 focus:border-[#13ec5b] transition"
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
                      onClick={() => setIsForgotMode(true)}
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
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#13ec5b] focus:ring-[#13ec5b]/50"
                  />
                  <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Keep me signed in
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-[#13ec5b] hover:bg-[#10d04e] active:bg-[#0fbe47] text-gray-900 font-bold rounded-xl transition duration-150 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
                >
                  {isLoginLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              {/* ═══ Divider ═══ */}
              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-[11px] sm:text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  or continue with
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* ═══ Social buttons ═══ */}
              <div className="space-y-2.5">
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

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSocialUnavailable("Apple")}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-gray-900 hover:bg-slate-50 dark:hover:bg-gray-800 active:bg-slate-100 dark:active:bg-gray-700 transition font-medium text-sm text-slate-700 dark:text-slate-300 disabled:opacity-60"
                  >
                    <AppleIcon className="h-4 w-4" />
                    <span>Apple</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialUnavailable("Facebook")}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-gray-900 hover:bg-slate-50 dark:hover:bg-gray-800 active:bg-slate-100 dark:active:bg-gray-700 transition font-medium text-sm text-slate-700 dark:text-slate-300 disabled:opacity-60"
                  >
                    <FacebookIcon className="h-4 w-4 text-[#1877F2]" />
                    <span>Facebook</span>
                  </button>
                </div>
              </div>

              {/* ═══ Sign up link ═══ */}
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
          ) : (
            <>
              {/* ═══ Forgot password mode ═══ */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    setIsForgotMode(false);
                    setForgotMessage({ text: "", type: "" });
                    setForgotEmail("");
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Reset password
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
                  Enter your email and we'll send you an OTP.
                </p>
              </div>

              {forgotMessage.text && (
                <div
                  className={`mb-5 p-3 rounded-lg text-sm border ${
                    forgotMessage.type === "error"
                      ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                      : "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                  }`}
                >
                  {forgotMessage.text}
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 focus:border-[#13ec5b] transition"
                      disabled={isForgotLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full py-3.5 px-4 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 font-bold rounded-xl transition duration-150 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
                >
                  {isForgotLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Send reset OTP"
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Remember your password?{" "}
                <button
                  onClick={() => {
                    setIsForgotMode(false);
                    setForgotMessage({ text: "", type: "" });
                    setForgotEmail("");
                  }}
                  className="font-semibold text-[#0f9c46] dark:text-[#13ec5b] hover:underline"
                >
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;