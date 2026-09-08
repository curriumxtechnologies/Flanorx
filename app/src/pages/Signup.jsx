// Signup.jsx – fixed scroll issue (no vertical centering)
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
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
import {
  useRegisterMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useGoogleAuthMutation,
} from "../features/userApiSlice";
import { setCredentials } from "../features/auth/authSlice";

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

  // Timer for resend OTP
  useEffect(() => {
    if (step === 2 && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timerRef.current);
  }, [step, timer]);

  // ---------- Step 1: Registration ----------
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
      const result = await register({
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

  // ---------- Step 2: OTP Verification ----------
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

  // ---------- Google Signup ----------
  const handleGoogleSignup = () => {
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
          setSuccess("Account created with Google!");
          setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
        } catch (err) {
          setError(err.data?.message || err.message || "Google signup failed");
        }
      },
    });
    tokenClient.requestAccessToken({ prompt: "select_account" });
  };

  const isLoading =
    isRegisterLoading || isVerifyLoading || isResendLoading || isGoogleLoading;

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

      {/* RIGHT – scrollable white form (no vertical centering – scrolls from top) */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto flex flex-col px-6 py-12 sm:px-12 lg:px-16 xl:px-20 bg-white">
        <div className="max-w-md w-full mx-auto">
          {/* Logo – only the image */}
          <div className="flex items-center justify-center md:justify-start mb-8">
            <img src="/flanorx.png" alt="Flanorx" className="h-8 w-auto" />
          </div>

          {step === 1 ? (
            // ----- SIGNUP FORM -----
            <>
              <h1 className="text-3xl font-bold text-slate-900">
                Create an account
              </h1>
              <p className="text-slate-500 mt-2">
                Join Flanorx and start saving on fuel & gas.
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

              <form onSubmit={handleRegister} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent transition"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
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
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min 8 characters"
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Username (optional)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="johndoe"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent transition"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-[#13ec5b] hover:bg-[#10d04e] text-white font-bold rounded-lg transition duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isRegisterLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Create Account"
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
                onClick={handleGoogleSignup}
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
                <span>{isGoogleLoading ? "Signing up..." : "Sign up with Google"}</span>
              </button>

              <p className="mt-8 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <a
                  href="/login"
                  className="font-medium text-[#13ec5b] hover:underline"
                >
                  Sign in
                </a>
              </p>
            </>
          ) : (
            // ----- OTP VERIFICATION STEP -----
            <>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => {
                    setStep(1);
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                    setSuccess("");
                  }}
                  className="p-1 rounded-full hover:bg-slate-100 transition"
                >
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900">
                  Verify Your Email
                </h1>
              </div>
              <p className="text-slate-500 mt-1">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-slate-700">
                  {registeredEmail}
                </span>
                . Enter it below to verify your account.
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

              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Enter OTP
                </label>
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-bold rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent transition"
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isLoading}
                className="w-full mt-6 py-3 px-4 bg-[#13ec5b] hover:bg-[#10d04e] text-white font-bold rounded-lg transition duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isVerifyLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Verify Email"
                )}
              </button>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-slate-500">
                  {timer > 0 ? (
                    `Resend code in ${timer}s`
                  ) : (
                    <button
                      onClick={handleResendOtp}
                      disabled={isResendLoading || !canResend}
                      className="text-[#13ec5b] hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResendLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      ) : (
                        "Resend OTP"
                      )}
                    </button>
                  )}
                </span>
                <button
                  onClick={() => {
                    setStep(1);
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                    setSuccess("");
                  }}
                  className="text-sm text-slate-500 hover:text-[#13ec5b] transition"
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