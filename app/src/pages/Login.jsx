// Login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
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

  // ---------- Login handlers ----------
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

  // ---------- Google OAuth ----------
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

  // ---------- Forgot password ----------
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
    <div className="h-screen overflow-hidden flex bg-white font-sans">
      {/* LEFT – fixed image */}
      <div className="hidden lg:flex lg:w-1/2 h-full relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1605810230434-7631ac76ec81?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
          alt="Fuel and Gas delivery"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#13ec5b]/20 to-transparent"></div>
        <div className="absolute bottom-10 left-10 text-white">
          <h2 className="text-3xl font-bold drop-shadow-lg">
            Fuel & Gas at your doorstep
          </h2>
          <p className="text-lg opacity-90">Skip the line, we deliver.</p>
        </div>
      </div>

      {/* RIGHT – scrollable white form */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20 bg-white">
        <div className="max-w-md w-full mx-auto">
          {/* Logo – only the image, no text */}
          <div className="flex items-center justify-center md:justify-start mb-8">
            <img src="/flanorx.png" alt="Flanorx" className="h-8 w-auto" />
          </div>

          {!isForgotMode ? (
            // ----- LOGIN FORM -----
            <>
              <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
              <p className="text-slate-500 mt-2">
                Sign in to your account to continue saving on fuel & gas.
              </p>

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent transition"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent transition"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      className="h-4 w-4 rounded border-slate-300 text-[#13ec5b] focus:ring-[#13ec5b]/50"
                    />
                    <label
                      htmlFor="remember"
                      className="ml-2 text-sm text-slate-600"
                    >
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
                  {isLoginLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500">OR</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition font-medium text-slate-700 disabled:opacity-60 shadow-sm hover:shadow"
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfhYBtTt4_oqUaZlerep04zeaTzKfHSfvUjYyJIyPag-eqSTQWl_iOIGSZOX5sdJc2YRy7GZsmsajFBaoNokP35to5thiSG-iviTPX8j9xBrKcbyWUMF8vZPIxlMp8stu_p5nA852zS_BpMJiuHLLjQdme8S6407HA3J4VOZgMPI7X1dS20CUg7oA5bqApD2E1vfOy70QaYlmS5qqx3O7FunsRHfULBWh4FZGf6IQc46J3wfGSxZ7jiyAwdEiGAjwnoe0F-lL0CPc"
                    alt="Google"
                    className="h-5 w-5"
                  />
                )}
                <span>{isGoogleLoading ? "Signing in..." : "Continue with Google"}</span>
              </button>

              <p className="mt-8 text-center text-sm text-slate-500">
                Don't have an account?{" "}
                <a
                  href="/register"
                  className="font-medium text-[#13ec5b] hover:underline"
                >
                  Create one now
                </a>
              </p>
            </>
          ) : (
            // ----- FORGOT PASSWORD FORM -----
            <>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => {
                    setIsForgotMode(false);
                    setForgotMessage({ text: "", type: "" });
                    setForgotEmail("");
                  }}
                  className="p-1 rounded-full hover:bg-slate-100 transition"
                >
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900">
                  Reset Password
                </h1>
              </div>
              <p className="text-slate-500 mt-1">
                Enter your email and we'll send you an OTP to reset your
                password.
              </p>

              {forgotMessage.text && (
                <div
                  className={`mt-4 p-3 rounded-lg text-sm border ${
                    forgotMessage.type === "error"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-green-50 text-green-700 border-green-200"
                  }`}
                >
                  {forgotMessage.text}
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent transition"
                      disabled={isForgotLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full py-3 px-4 bg-[#13ec5b] hover:bg-[#10d04e] text-white font-bold rounded-lg transition duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isForgotLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Send Reset OTP"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
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