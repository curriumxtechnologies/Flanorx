// Login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  Mail,
  Lock,
  Fuel,
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

const AppleIcon = ({ className }) => (
  <svg viewBox="0 0 384 512" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76-19.7C63.3 141 0 184.8 0 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-57.7-90-57.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const FacebookIcon = ({ className }) => (
  <svg viewBox="0 0 320 512" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
  </svg>
);

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
          profile: result.profile,
          authMethod: result.authMethod,
          userType: "customer",
          loggedInAt: Date.now(),
        })
      );
      setSuccess("Login successful! Redirecting...");
      setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
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
          const result = await googleAuth({ token: resp.access_token }).unwrap();
          dispatch(setCredentials(result));
          localStorage.setItem(
            "flanorx_auth",
            JSON.stringify({
              token: result.token,
              _id: result._id,
              name: result.name,
              email: result.email,
              profile: result.profile,
              authMethod: result.authMethod,
              userType: "customer",
              loggedInAt: Date.now(),
            })
          );
          setSuccess("Google login successful!");
          setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
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
    <div className="min-h-screen flex bg-white dark:bg-gray-950 font-sans">
      {/* LEFT – fixed image (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen sticky top-0 h-screen overflow-hidden">
        <img
          src="https://i.pinimg.com/1200x/ce/1c/4f/ce1c4f2e9b5bc5f27cdc3a92289d3b25.jpg"
          alt="Fuel and Gas delivery"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#13ec5b]/20 to-transparent"></div>
        <div className="absolute bottom-10 left-10 text-white dark:text-white">
          <h2 className="text-3xl font-bold drop-shadow-lg">
            Fuel & Gas at your doorstep
          </h2>
          <p className="text-lg opacity-90">Skip the line, we deliver.</p>
        </div>
      </div>

      {/* RIGHT – form panel (scrollable) */}
      <div className="w-full lg:w-1/2 min-h-screen overflow-y-auto flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20 bg-white dark:bg-gray-950">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center lg:justify-start mb-8">
            <img src="/flanorx.png" alt="Flanorx" className="h-8 w-auto" />
          </div>

          {!isForgotMode ? (
            <>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white text-center lg:text-left">
                Welcome back
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-center lg:text-left">
                Sign in to your account to continue saving on fuel & gas.
              </p>

              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm border border-green-200 dark:border-green-800">
                  {success}
                </div>
              )}

              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => handleSocialUnavailable("Apple")}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 transition font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:shadow"
                >
                  <AppleIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 transition font-medium text-slate-700 dark:text-slate-300 disabled:opacity-60 shadow-sm hover:shadow"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <svg viewBox="0 0 48 48" className="h-5 w-5">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      <path fill="none" d="M0 0h48v48H0z"/>
                    </svg>
                  )}
                  <span>Google</span>
                </button>
                <button
                  onClick={() => handleSocialUnavailable("Facebook")}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 transition font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:shadow"
                >
                  <FacebookIcon className="h-5 w-5 text-[#1877F2]" />
                </button>
              </div>
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3 mb-6">
                Or sign in with
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent transition"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent transition"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#13ec5b] focus:ring-[#13ec5b]/50"
                    />
                    <label htmlFor="remember" className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                      Remember me
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(true)}
                    className="text-sm font-medium text-[#13ec5b] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-[#13ec5b] hover:bg-[#10d04e] text-white font-bold rounded-lg transition duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoginLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-medium text-[#13ec5b] hover:underline"
                >
                  Create one now
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => {
                    setIsForgotMode(false);
                    setForgotMessage({ text: "", type: "" });
                    setForgotEmail("");
                  }}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset Password</h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Enter your email and we'll send you an OTP to reset your password.
              </p>

              {forgotMessage.text && (
                <div
                  className={`mt-4 p-3 rounded-lg text-sm border ${
                    forgotMessage.type === "error"
                      ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                      : "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                  }`}
                >
                  {forgotMessage.text}
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent transition"
                      disabled={isForgotLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full py-3 px-4 bg-[#13ec5b] hover:bg-[#10d04e] text-white font-bold rounded-lg transition duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isForgotLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Reset OTP"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Remember your password?{" "}
                <button
                  onClick={() => {
                    setIsForgotMode(false);
                    setForgotMessage({ text: "", type: "" });
                    setForgotEmail("");
                  }}
                  className="font-medium text-[#13ec5b] hover:underline"
                >
                  Back to Sign In
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