// src/pages/Settings.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Bell,
  BellOff,
  BellRing,
  Sun,
  Moon,
  Monitor,
  Shield,
  Lock,
  LogOut,
  ChevronRight,
  Loader2,
  CheckCircle,
  Info,
  Send,
  Smartphone,
  Globe,
  Mail,
  AlertCircle,
  KeyRound,
  UserCircle,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Bottombar from "../components/Bottombar";
import { useTheme } from "../context/ThemeContext";
import usePushNotifications from "../hooks/usePushNotifications";
import LogoutButton from "../utils/logoutBtn";

const Settings = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const { theme, toggleTheme, setSystemTheme } = useTheme();

  // Push notifications
  const {
    permission,
    registered,
    busy: pushBusy,
    register: registerPush,
    unregister: unregisterPush,
    platform,
  } = usePushNotifications();

  const [sendingTest, setSendingTest] = useState(false);

  const isDenied = permission === "denied";

  // ─── Push handlers ────────────────────────────────────────
  const handleTogglePush = async () => {
    if (registered) {
      await unregisterPush();
      toast.success("Notifications disabled");
    } else {
      const ok = await registerPush();
      if (ok) {
        // no toast — register() already shows one
      }
    }
  };

  const handleSendTestPush = async () => {
    if (sendingTest) return;
    setSendingTest(true);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to send test push");
      }
      toast.success(data?.message || "Test push sent");
    } catch (err) {
      toast.error(err.message || "Couldn't send test push");
    } finally {
      setSendingTest(false);
    }
  };

  // ─── Push status pill ─────────────────────────────────────
  const renderPushStatus = () => {
    if (isDenied) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          <BellOff className="h-3 w-3" />
          Blocked
        </span>
      );
    }
    if (registered) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
          <BellRing className="h-3 w-3" />
          Enabled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        <Bell className="h-3 w-3" />
        Off
      </span>
    );
  };

  // ─── Platform label ───────────────────────────────────────
  const platformLabel =
    platform === "ios"
      ? "iOS app"
      : platform === "android"
      ? "Android app"
      : "This browser";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Settings
          </h1>
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* ─── Profile summary ─────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-3 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-xl p-2 -m-2 transition"
              >
                <div className="w-12 h-12 rounded-full bg-[#13ec5b]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {userInfo?.profilePhoto ? (
                    <img
                      src={userInfo.profilePhoto}
                      alt={userInfo.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle className="h-6 w-6 text-[#13ec5b]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {userInfo?.name || "Your account"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userInfo?.email || ""}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </button>
            </div>

            {/* ─── Notifications ───────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#13ec5b]" />
                  Notifications
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Get updates about your orders on {platformLabel}
                </p>
              </div>

              <div className="p-4 space-y-3">
                {/* Push toggle */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Push notifications
                      </p>
                      {renderPushStatus()}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isDenied
                        ? "Blocked in your browser or device settings. Enable them there first."
                        : registered
                        ? "You'll receive order updates as push notifications."
                        : "Turn on to receive real-time order updates."}
                    </p>
                  </div>

                  {/* Toggle switch */}
                  <button
                    type="button"
                    onClick={handleTogglePush}
                    disabled={pushBusy || isDenied}
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                      registered
                        ? "bg-[#13ec5b]"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    aria-label="Toggle push notifications"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform flex items-center justify-center ${
                        registered ? "translate-x-5" : "translate-x-0"
                      }`}
                    >
                      {pushBusy && (
                        <Loader2 className="h-3 w-3 text-gray-500 animate-spin" />
                      )}
                    </span>
                  </button>
                </div>

                {/* Test push (only when enabled) */}
                {registered && (
                  <>
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                      <button
                        onClick={handleSendTestPush}
                        disabled={sendingTest}
                        className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition disabled:opacity-60"
                      >
                        {sendingTest ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {sendingTest ? "Sending..." : "Send a test notification"}
                      </button>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-2">
                        A test push will arrive on all your registered devices.
                      </p>
                    </div>
                  </>
                )}

                {/* Denied help */}
                {isDenied && (
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                          Notifications are blocked
                        </p>
                        <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                          {platform === "web"
                            ? "Open your browser's site settings (the lock icon in the address bar) and allow notifications for this site."
                            : "Open your device settings → Apps → Flanorx → Notifications and allow them."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Appearance ──────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sun className="h-4 w-4 text-[#13ec5b]" />
                  Appearance
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Choose how Flanorx looks on your device
                </p>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      if (theme !== "light") toggleTheme();
                    }}
                    className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition ${
                      theme === "light"
                        ? "border-[#13ec5b] bg-[#13ec5b]/5"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <Sun
                      className={`h-5 w-5 ${
                        theme === "light"
                          ? "text-[#0f9c46] dark:text-[#13ec5b]"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        theme === "light"
                          ? "text-[#0f9c46] dark:text-[#13ec5b]"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      Light
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      if (theme !== "dark") toggleTheme();
                    }}
                    className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition ${
                      theme === "dark"
                        ? "border-[#13ec5b] bg-[#13ec5b]/5"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <Moon
                      className={`h-5 w-5 ${
                        theme === "dark"
                          ? "text-[#0f9c46] dark:text-[#13ec5b]"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        theme === "dark"
                          ? "text-[#0f9c46] dark:text-[#13ec5b]"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      Dark
                    </span>
                  </button>

                  <button
                    onClick={setSystemTheme}
                    className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600`}
                  >
                    <Monitor className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      System
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Account & Security ──────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#13ec5b]" />
                  Account &amp; Security
                </h2>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition text-left"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <UserCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Profile
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Update your name, photo, and addresses
                      </p>
                    </div>
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>

                <button
                  onClick={() =>
                    toast(
                      "Open your profile page to change your password.",
                      { icon: "🔒" }
                    )
                  }
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition text-left"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <KeyRound className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Change password
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Manage your account credentials
                      </p>
                    </div>
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
              </div>
            </div>

            {/* ─── About ───────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Info className="h-4 w-4 text-[#13ec5b]" />
                  About
                </h2>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <a
                  href="mailto:flanorx1@gmail.com"
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition text-left"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Contact support
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        flanorx1@gmail.com
                      </p>
                    </div>
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </a>

                <a
                  href="https://flanorx.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition text-left"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Visit Flanorx
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        flanorx.com
                      </p>
                    </div>
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </a>

                <div className="w-full flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      App version
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      v1.0.0
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Logout ──────────────────────────────────── */}
            <LogoutButton
              className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 text-red-600 rounded-2xl font-medium shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-60"
              showSpinner
            />
          </div>
        </div>
      </div>

      <Bottombar />
    </div>
  );
};

export default Settings;