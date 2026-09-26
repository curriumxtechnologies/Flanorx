// pages/Welcome.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  Fuel,
  Zap,
  Tag,
  MapPin,
  CreditCard,
  Truck,
  Flame,
  ShieldCheck,
  ArrowRight,
  FileText,
  Shield,
  X,
} from "lucide-react";
import { useGetTermsQuery } from "../features/userApiSlice";

// ─── Role-based redirect helper ────────────────────────────
const getRedirectPath = (role) => {
  if (role === "admin") return "/superuser/dashboard";
  if (role === "rider") return "/rider/dashboard";
  return "/dashboard";
};

const HERO_IMAGE =
  "/flanorx-people.jfif";

// ═══════════════════════════════════════════════════════════
//  Public Terms / Privacy Preview Modal
// ═══════════════════════════════════════════════════════════
const PublicTermsModal = ({ isOpen, onClose, document }) => {
  if (!isOpen || !document) return null;
  const Icon = document.type === "terms" ? FileText : Shield;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b] flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">
              {document.title}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Version {document.version}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {document.content}
          </p>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium text-sm transition"
          >
            Done reading
          </button>
        </div>
      </div>
    </div>
  );
};

const Welcome = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);

  const { userInfo } = useSelector((state) => state.auth);

  // Live policy documents from the backend
  const { data: termsData } = useGetTermsQuery();
  const [previewDoc, setPreviewDoc] = useState(null);

  const documents = termsData?.documents || [];
  const termsDoc = documents.find((d) => d.type === "terms");
  const privacyDoc = documents.find((d) => d.type === "privacy");

  // ─── Redirect if already logged in ────────────────────────
  useEffect(() => {
    if (userInfo?.token) {
      navigate(getRedirectPath(userInfo.role), { replace: true });
      return;
    }

    const raw =
      localStorage.getItem("userInfo") || localStorage.getItem("flanorx_auth");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.token) {
        navigate(getRedirectPath(parsed.role), { replace: true });
      }
    } catch {
      localStorage.removeItem("userInfo");
      localStorage.removeItem("flanorx_auth");
    }
  }, [userInfo, navigate]);

  // ─── Fade-in animation ────────────────────────────────────
  useEffect(() => {
    if (heroRef.current) {
      heroRef.current.style.opacity = "0";
      heroRef.current.style.transform = "translateY(16px)";
      requestAnimationFrame(() => {
        heroRef.current.style.transition =
          "opacity 0.6s ease, transform 0.6s ease";
        heroRef.current.style.opacity = "1";
        heroRef.current.style.transform = "translateY(0)";
      });
    }
  }, []);

  const features = [
    { icon: Zap, label: "Fast delivery" },
    { icon: Tag, label: "Member pricing" },
    { icon: MapPin, label: "Live tracking" },
    { icon: ShieldCheck, label: "Secure payment" },
  ];

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          MOBILE
          ═══════════════════════════════════════════════════════ */}
      <div className="lg:hidden relative w-full min-h-screen min-h-[100svh] bg-black overflow-hidden flex flex-col">
        <img
          src={HERO_IMAGE}
          alt="Fuel and gas delivery"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />

        {/* Top bar */}
        <div
          className="relative flex items-center justify-between px-5"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
        >
          <img
            src="/flanorx.png"
            alt="Flanorx"
            className="h-7 w-auto brightness-0 invert"
          />
          <Link
            to="/login"
            className="text-xs font-semibold text-white/95 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full hover:bg-white/20 active:bg-white/25 transition"
          >
            Log in
          </Link>
        </div>

        {/* Content */}
        <div className="relative flex-1 flex flex-col justify-end px-5">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full mb-5 self-start">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#13ec5b] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#13ec5b]" />
            </span>
            <span className="text-[11px] font-semibold text-white tracking-wide">
              Now delivering
            </span>
          </div>

          <h1 className="text-[2rem] leading-[1.08] font-extrabold text-white tracking-tight">
            Fuel &amp; gas,
            <br />
            <span className="text-[#13ec5b]">at your doorstep</span>
          </h1>

          <p className="mt-3 text-[13px] text-white/70 leading-relaxed max-w-[19rem]">
            Skip the queue. We deliver premium fuel and gas in minutes — right
            where you need it.
          </p>

          <div className="mt-6 flex items-center gap-5 text-white/85">
            <div>
              <p className="text-lg font-bold leading-none">Fast</p>
              <p className="text-[10px] text-white/55 mt-1 uppercase tracking-wider">
                Delivery
              </p>
            </div>
            <div className="w-px h-7 bg-white/15" />
            <div>
              <p className="text-lg font-bold leading-none">Live</p>
              <p className="text-[10px] text-white/55 mt-1 uppercase tracking-wider">
                Tracking
              </p>
            </div>
            <div className="w-px h-7 bg-white/15" />
            <div>
              <p className="text-lg font-bold leading-none">Safe</p>
              <p className="text-[10px] text-white/55 mt-1 uppercase tracking-wider">
                Payments
              </p>
            </div>
          </div>
        </div>

        {/* Bottom action sheet */}
        <div
          className="relative px-5"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
            paddingTop: "24px",
          }}
        >
          <div className="space-y-2.5">
            <Link
              to="/register"
              className="group flex items-center justify-center gap-2 w-full py-4 bg-[#13ec5b] active:bg-[#0fbe47] text-gray-900 font-bold rounded-2xl shadow-lg text-[15px] transition"
            >
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-active:translate-x-0.5" />
            </Link>
            <Link
              to="/login"
              className="flex items-center justify-center w-full py-3.5 bg-white/10 backdrop-blur-md border border-white/20 text-white active:bg-white/20 font-semibold rounded-2xl text-[15px] transition"
            >
              I already have an account
            </Link>
          </div>

          {/* ─── Legal links (mobile) ─── */}
          <div className="mt-4 flex items-center justify-center gap-3 text-[10px] text-white/55">
            <button
              type="button"
              onClick={() => termsDoc && setPreviewDoc(termsDoc)}
              disabled={!termsDoc}
              className="hover:text-white/80 transition disabled:opacity-50"
            >
              Terms of Service
            </button>
            <span className="w-px h-3 bg-white/20" />
            <button
              type="button"
              onClick={() => privacyDoc && setPreviewDoc(privacyDoc)}
              disabled={!privacyDoc}
              className="hover:text-white/80 transition disabled:opacity-50"
            >
              Privacy Policy
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] text-white/45 tracking-wide">
            © {new Date().getFullYear()} Flanorx · All rights reserved
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          DESKTOP
          ═══════════════════════════════════════════════════════ */}
      <div className="hidden lg:grid h-screen overflow-hidden grid-rows-[auto_1fr_auto] bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 font-sans">
        {/* Header */}
        <header className="flex items-center justify-between px-8 xl:px-12 py-5 max-w-[1400px] mx-auto w-full">
          <img src="/flanorx.png" alt="Flanorx" className="h-8 w-auto" />
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-[#13ec5b] dark:hover:text-[#13ec5b] transition px-3 py-2"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-[#13ec5b] text-gray-900 px-5 py-2 rounded-lg hover:bg-[#10d04e] transition shadow-sm"
            >
              Get started
            </Link>
          </div>
        </header>

        {/* Main */}
        <main className="min-h-0 w-full max-w-[1400px] mx-auto px-8 xl:px-12 py-4">
          <div
            ref={heroRef}
            className="h-full min-h-0 grid grid-cols-2 gap-10 xl:gap-14 items-stretch opacity-0"
          >
            {/* Image side */}
            <div className="relative h-full min-h-0 rounded-3xl overflow-hidden shadow-xl ring-1 ring-black/5 dark:ring-white/5">
              <img
                src={HERO_IMAGE}
                alt="Fuel and gas delivery"
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

              <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#13ec5b] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#13ec5b]" />
                </span>
                <span className="text-[11px] font-semibold text-gray-900 dark:text-white">
                  Now delivering
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#13ec5b]/15 flex items-center justify-center flex-shrink-0">
                      <Truck className="h-5 w-5 text-[#0f9c46] dark:text-[#13ec5b]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                        Fast delivery
                      </p>
                      <p className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                        Right to your door
                      </p>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#13ec5b]/15 flex items-center justify-center flex-shrink-0">
                      <Fuel className="h-5 w-5 text-[#0f9c46] dark:text-[#13ec5b]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                        Live tracking
                      </p>
                      <p className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                        Follow every order
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content side */}
            <div className="flex flex-col justify-center min-h-0 py-2">
              <h1 className="text-[2.5rem] xl:text-[3rem] 2xl:text-[3.5rem] font-extrabold text-slate-900 dark:text-white leading-[1.08] tracking-tight">
                Fuel &amp; gas,{" "}
                <span className="text-[#0f9c46] dark:text-[#13ec5b]">
                  at your doorstep
                </span>
              </h1>

              <p className="mt-4 xl:mt-5 text-base xl:text-lg text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                Skip the queue. We deliver premium fuel and gas straight to
                your home, office, or wherever you need it — fast, reliable,
                and hassle‑free.
              </p>

              <div className="mt-6 xl:mt-8 flex items-center gap-3">
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 font-bold rounded-xl transition shadow-md hover:shadow-lg text-base"
                >
                  Get started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-7 py-3.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-gray-900 font-medium rounded-xl transition text-base"
                >
                  I already have an account
                </Link>
              </div>

              <div className="mt-6 xl:mt-8 flex flex-wrap gap-2.5 xl:gap-3">
                {features.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    <Icon className="h-4 w-4 text-[#0f9c46] dark:text-[#13ec5b] flex-shrink-0" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="max-w-[1400px] mx-auto px-8 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-400 dark:text-slate-600">
              © {new Date().getFullYear()} Flanorx. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => termsDoc && setPreviewDoc(termsDoc)}
                disabled={!termsDoc}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#0f9c46] dark:hover:text-[#13ec5b] transition disabled:opacity-50"
              >
                Terms of Service
              </button>
              <span className="w-px h-3 bg-slate-300 dark:bg-slate-700" />
              <button
                type="button"
                onClick={() => privacyDoc && setPreviewDoc(privacyDoc)}
                disabled={!privacyDoc}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#0f9c46] dark:hover:text-[#13ec5b] transition disabled:opacity-50"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* ═══ Terms / Privacy Preview Modal ═══ */}
      <PublicTermsModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </>
  );
};

export default Welcome;