// src/pages/refill/RefillApplicationForm.jsx
//
// Standalone Apply-to-become-a-refill-station wizard.
// Desktop: Split layout with sticky vertical progress on the left.
// Mobile: Single column with horizontal progress at the top.
// Includes a custom modal to intercept unsaved changes before leaving.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useBlocker } from "react-router";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Store,
  MapPin,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  Send,
  Navigation,
  Shield,
  Flame,
  FileCheck2,
  Users,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useGetProfileQuery } from "../../features/userApiSlice";
import {
  useGetMyRefillApplicationQuery,
  useApplyAsRefillStationMutation,
} from "../../features/refillApiSlice";

// ─── Leaflet icon fix ─────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Constants ────────────────────────────────────────────
const CYLINDER_SIZES = ["3kg", "6kg", "12kg", "25kg", "50kg"];
const MAX_SHOP_PHOTOS = 10;
const MAX_CYLINDER_PHOTOS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const IMAGE_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const LICENSE_MIMES = [...IMAGE_MIMES, "application/pdf"];
const FALLBACK_COORDS = { lat: 6.5244, lng: 3.3792 };

const STEPS = [
  { id: 1, label: "Business", desc: "Name & location", icon: Store },
  { id: 2, label: "Cylinders", desc: "Sizes & pricing", icon: Flame },
  { id: 3, label: "Documents", desc: "Verify your shop", icon: FileCheck2 },
  { id: 4, label: "Review", desc: "Final check", icon: Send },
];

const formatNaira = (n) =>
  `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

const isImage = (mime) => IMAGE_MIMES.includes(mime);
const isLicense = (mime) => LICENSE_MIMES.includes(mime);

// ═════════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════════
const RefillApplicationForm = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const { data: profile, isLoading: profileLoading } = useGetProfileQuery();
  const {
    data: applicationData,
    isLoading: appLoading,
    error: appError,
  } = useGetMyRefillApplicationQuery();

  const role = profile?.role || userInfo?.role;
  const isMainAdmin = role === "admin";
  const hasStation = !!(profile?.refillStation || userInfo?.refillStation);

  const application = applicationData?.station || null;
  const appStatus = application?.status || null;

  useEffect(() => {
    if (hasStation || appStatus === "approved") {
      navigate("/refill/station", { replace: true });
    }
  }, [hasStation, appStatus, navigate]);

  if (profileLoading || appLoading) {
    return (
      <PageShell header="Apply as Refill Station">
        <div className="flex items-center justify-center py-24 lg:col-span-12">
          <Loader2 className="h-8 w-8 text-[#13ec5b] animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (appError && appError.status !== 404) {
    return (
      <PageShell header="Apply as Refill Station">
        <div className="text-center py-16 lg:col-span-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">
            Could not load your application. Please refresh and try again.
          </p>
        </div>
      </PageShell>
    );
  }

  if (isMainAdmin) {
    return (
      <PageShell header="Apply as Refill Station">
        <div className="lg:col-span-12">
          <InfoState
            icon={Shield}
            tone="purple"
            title="Main admins cannot apply"
            body="You're logged in as the main platform admin. Refill stations are managed under /admin/refill."
            primaryAction={{
              label: "Go to Refill Admin",
              onClick: () => navigate("/admin/refill"),
            }}
          />
        </div>
      </PageShell>
    );
  }

  if (appStatus === "pending") {
    return (
      <PageShell header="Application Status">
        <div className="lg:col-span-12">
          <InfoState
            icon={Clock}
            tone="yellow"
            title="Application under review"
            body={`We're reviewing ${application?.businessName || "your application"}. You'll hear back soon — usually within 1–2 business days.`}
            details={[
              { label: "Business", value: application?.businessName },
              {
                label: "Submitted",
                value:
                  application?.createdAt &&
                  new Date(application.createdAt).toLocaleDateString(),
              },
              { label: "Status", value: "Pending review" },
            ]}
            primaryAction={{
              label: "Back to Refill Home",
              onClick: () => navigate("/refill"),
            }}
          />
        </div>
      </PageShell>
    );
  }

  if (appStatus === "banned") {
    return (
      <PageShell header="Station Suspended">
        <div className="lg:col-span-12">
          <InfoState
            icon={XCircle}
            tone="red"
            title="Your station is suspended"
            body={application?.banReason || "Please contact support to resolve this."}
            primaryAction={{
              label: "Back to Refill Home",
              onClick: () => navigate("/refill"),
            }}
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        appStatus === "rejected"
          ? "Re-apply as Refill Station"
          : "Apply as Refill Station"
      }
    >
      <ApplicationWizard
        existingApplication={appStatus === "rejected" ? application : null}
        accountEmail={profile?.email || userInfo?.email || ""}
        onCancel={() => navigate("/refill")}
      />
    </PageShell>
  );
};

// ═════════════════════════════════════════════════════════
//  PAGE SHELL
// ═════════════════════════════════════════════════════════
const PageShell = ({ header, children }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center gap-2">
      <button
        onClick={() =>
          window.history.length > 1
            ? window.history.back()
            : (window.location.href = "/refill")
        }
        className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        aria-label="Back"
      >
        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>
      <h1 className="text-base lg:text-xl font-semibold text-gray-900 dark:text-white truncate">
        {header}
      </h1>
    </header>

    <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {children}
      </div>
    </main>
  </div>
);

// ═════════════════════════════════════════════════════════
//  INFO STATE
// ═════════════════════════════════════════════════════════
const InfoState = ({ icon: Icon, tone, title, body, details, primaryAction }) => {
  const toneMap = {
    yellow: {
      bg: "bg-yellow-50 dark:bg-yellow-900/10",
      border: "border-yellow-200 dark:border-yellow-900/50",
      iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      title: "text-yellow-900 dark:text-yellow-200",
    },
    red: {
      bg: "bg-red-50 dark:bg-red-900/10",
      border: "border-red-200 dark:border-red-900/50",
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      title: "text-red-900 dark:text-red-200",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-900/10",
      border: "border-green-200 dark:border-green-900/50",
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      title: "text-green-900 dark:text-green-200",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/10",
      border: "border-purple-200 dark:border-purple-900/50",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
      title: "text-purple-900 dark:text-purple-200",
    },
  };
  const t = toneMap[tone] || toneMap.yellow;

  return (
    <div className={`border rounded-2xl p-6 sm:p-8 ${t.bg} ${t.border} max-w-2xl mx-auto`}>
      <div className="flex items-start gap-4">
        <div
          className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${t.iconBg}`}
        >
          <Icon className={`h-6 w-6 ${t.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`text-lg font-bold ${t.title}`}>{title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{body}</p>

          {details && details.length > 0 && (
            <dl className="mt-4 space-y-2">
              {details.map((d) => (
                <div key={d.label} className="flex justify-between gap-3 text-sm">
                  <dt className="text-gray-500 dark:text-gray-400">{d.label}</dt>
                  <dd className="font-medium text-gray-900 dark:text-white truncate max-w-[60%] text-right">
                    {d.value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="mt-5 text-sm font-medium text-white bg-[#13ec5b] hover:bg-[#10d04e] px-4 py-2.5 rounded-lg transition"
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════
//  UNSAVED CHANGES MODAL
// ═════════════════════════════════════════════════════════
const LeaveConfirmationModal = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Unsaved Changes
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            You have unsaved changes to your application. Are you sure you want to leave? Your progress will be lost.
          </p>
          <div className="flex w-full gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition"
            >
              Stay
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-sm"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════
//  WIZARD
// ═════════════════════════════════════════════════════════
const ApplicationWizard = ({ existingApplication, accountEmail, onCancel }) => {
  const [apply, { isLoading: submitting }] = useApplyAsRefillStationMutation();

  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [form, setForm] = useState(() => ({
    businessName: existingApplication?.businessName || "",
    contactPerson: existingApplication?.contactPerson || "",
    phone: existingApplication?.phone || "",
    email: existingApplication?.email || accountEmail || "",
    address: existingApplication?.address || "",
    operatingHours: existingApplication?.operatingHours || "",
    coordinates: existingApplication?.coordinates || null,
    supportedSizes: existingApplication?.supportedCylinderSizes || [],
    cylinderPrices: existingApplication?.cylinderPrices || {},
    businessLicense: null,
    shopPhotos: [],
    cylinderPhotos: [],
  }));

  const existingDocs = useMemo(
    () => ({
      licenseUrl: existingApplication?.licenseUrl || null,
      shopPhotos: existingApplication?.shopPhotos || [],
      cylinderPhotos: existingApplication?.cylinderPhotos || [],
    }),
    [existingApplication]
  );

  const [errors, setErrors] = useState({});

  // ─── Blocker: intercept navigation if form is dirty ───
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      !success &&
      currentLocation.pathname !== nextLocation.pathname
  );

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setIsDirty(true);
  };

  const clearError = (key) =>
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });

  const validateStep = (stepToCheck) => {
    const errs = {};

    if (stepToCheck === 1) {
      if (!form.businessName.trim()) errs.businessName = "Business name is required";
      if (!form.contactPerson.trim()) errs.contactPerson = "Contact person is required";
      if (!form.phone.trim()) errs.phone = "Phone number is required";
      if (!form.address.trim()) errs.address = "Address is required";
      if (
        !form.coordinates ||
        !Number.isFinite(Number(form.coordinates.lat)) ||
        !Number.isFinite(Number(form.coordinates.lng))
      ) {
        errs.coordinates = "Pick a location for your station";
      }
    }

    if (stepToCheck === 2) {
      if (!form.supportedSizes.length) {
        errs.supportedSizes = "Select at least one cylinder size";
      } else {
        form.supportedSizes.forEach((size) => {
          const price = Number(form.cylinderPrices[size]);
          if (!Number.isFinite(price) || price <= 0) {
            errs[`price_${size}`] = `Enter a price for ${size}`;
          }
        });
      }
    }

    if (stepToCheck === 3) {
      const hasLicense = form.businessLicense instanceof File || !!existingDocs.licenseUrl;
      if (!hasLicense) errs.businessLicense = "Business license is required";

      const shopCount = form.shopPhotos.length || existingDocs.shopPhotos.length;
      if (!shopCount) errs.shopPhotos = "At least one shop photo is required";

      const cylCount = form.cylinderPhotos.length || existingDocs.cylinderPhotos.length;
      if (!cylCount) errs.cylinderPhotos = "At least one cylinder photo is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) {
      setServerError("");
      setStep((s) => Math.min(s + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    setErrors({});
    setServerError("");
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    for (let i = 1; i <= 3; i++) {
      if (!validateStep(i)) {
        setStep(i);
        return;
      }
    }
    setServerError("");

    const fd = new FormData();
    fd.append("businessName", form.businessName.trim());
    fd.append("contactPerson", form.contactPerson.trim());
    fd.append("phone", form.phone.trim());
    fd.append("email", form.email.trim());
    fd.append("address", form.address.trim());
    if (form.operatingHours) fd.append("operatingHours", form.operatingHours.trim());
    fd.append("coordinates", JSON.stringify(form.coordinates));
    fd.append("supportedCylinderSizes", JSON.stringify(form.supportedSizes));
    fd.append("cylinderPrices", JSON.stringify(form.cylinderPrices));

    if (form.businessLicense) fd.append("businessLicense", form.businessLicense);
    form.shopPhotos.forEach((f) => fd.append("shopPhotos", f));
    form.cylinderPhotos.forEach((f) => fd.append("cylinderPhotos", f));

    try {
      await apply(fd).unwrap();
      setSuccess(true);
      setIsDirty(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.error ||
        "Failed to submit application. Please try again.";
      setServerError(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (success) {
    return (
      <div className="lg:col-span-12 max-w-3xl mx-auto w-full">
        <InfoState
          icon={CheckCircle2}
          tone="green"
          title="Application submitted!"
          body="Thanks for applying. Our team will review your documents and get back to you within 1–2 business days. You'll be notified by email and push."
          primaryAction={{
            label: "Back to Refill Home",
            onClick: () => window.location.assign("/refill"),
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/* ─── LEFT COLUMN: Sticky Progress & Info (Desktop Only) ─── */}
      <aside className="hidden lg:block lg:col-span-4 relative">
        <div className="sticky top-28 space-y-8">
          {/* Vertical Stepper */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">
              Application Progress
            </h3>
            <div className="space-y-6">
              {STEPS.map((s, idx) => {
                const isActive = s.id === step;
                const isDone = s.id < step;
                return (
                  <div key={s.id} className="relative flex gap-4">
                    {/* Connecting Line */}
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`absolute left-5 top-10 bottom-[-24px] w-0.5 ${
                          isDone ? "bg-[#13ec5b]" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    )}
                    
                    {/* Circle */}
                    <div className="relative z-10 flex-shrink-0">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                          isDone
                            ? "bg-[#13ec5b] border-[#13ec5b] text-white"
                            : isActive
                            ? "bg-[#13ec5b]/10 border-[#13ec5b] text-[#13ec5b]"
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400"
                        }`}
                      >
                        {isDone ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                      </div>
                    </div>

                    {/* Text */}
                    <div className="pt-1">
                      <p
                        className={`text-sm font-semibold transition-colors ${
                          isActive
                            ? "text-gray-900 dark:text-white"
                            : isDone
                            ? "text-gray-700 dark:text-gray-300"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {s.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Marketing / Info Card */}
          <div className="bg-gradient-to-br from-[#13ec5b]/10 to-[#13ec5b]/5 dark:from-[#13ec5b]/5 dark:to-transparent rounded-2xl p-6 border border-[#13ec5b]/20">
            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-[#13ec5b]" />
              Why partner with Flanorx?
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Users className="h-5 w-5 text-[#13ec5b] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Reach more customers</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Get discovered by thousands of users needing gas refills near you.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Store className="h-5 w-5 text-[#13ec5b] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Manage easily</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Accept orders, assign riders, and track sales from one dashboard.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-[#13ec5b] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Secure payments</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Payments are processed upfront and settled directly to your account.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* ─── RIGHT COLUMN: Form & Controls ─── */}
      <div className="lg:col-span-8 flex flex-col min-h-[70vh]">
        {/* Mobile Progress Bar (Hidden on Desktop) */}
        <div className="lg:hidden mb-6">
          <div className="flex items-center justify-between gap-1">
            {STEPS.map((s, idx) => {
              const isActive = s.id === step;
              const isDone = s.id < step;
              return (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center gap-1.5 min-w-0 flex-shrink-0">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                        isDone
                          ? "bg-[#13ec5b] border-[#13ec5b] text-white"
                          : isActive
                          ? "bg-[#13ec5b]/10 border-[#13ec5b] text-[#13ec5b]"
                          : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
                      }`}
                    >
                      {isDone ? <Check className="h-4 w-4" /> : s.id}
                    </div>
                    <span className={`text-[10px] font-medium ${isActive ? "text-[#13ec5b]" : "text-gray-400"}`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded ${isDone ? "bg-[#13ec5b]" : "bg-gray-200 dark:bg-gray-700"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Server Error */}
        {serverError && (
          <div className="mb-6 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">{serverError}</p>
          </div>
        )}

        {/* Form Card */}
        <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-10 shadow-sm">
          {step === 1 && (
            <StepBusiness form={form} errors={errors} update={update} clearError={clearError} />
          )}
          {step === 2 && (
            <StepCylinders form={form} errors={errors} update={update} clearError={clearError} />
          )}
          {step === 3 && (
            <StepDocuments
              form={form}
              errors={errors}
              existingDocs={existingDocs}
              update={update}
              clearError={clearError}
            />
          )}
          {step === 4 && <StepReview form={form} existingDocs={existingDocs} />}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={step === 1 ? onCancel : goBack}
            disabled={submitting}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-3 rounded-xl transition disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < STEPS.length ? (
            <button
              onClick={goNext}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-[#13ec5b] hover:bg-[#10d04e] px-6 py-3 rounded-xl transition shadow-sm"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-[#13ec5b] hover:bg-[#10d04e] px-6 py-3 rounded-xl transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit application
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Block Navigation Modal */}
      {blocker.state === "blocked" && (
        <LeaveConfirmationModal
          onConfirm={() => {
            setIsDirty(false);
            blocker.proceed();
          }}
          onCancel={blocker.reset}
        />
      )}
    </>
  );
};

// ═════════════════════════════════════════════════════════
//  FIELD PRIMITIVES
// ═════════════════════════════════════════════════════════
const Field = ({ label, required, error, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && (
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>
    )}
    {error && (
      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
);

const TextInput = React.forwardRef(({ error, className = "", ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    className={`w-full px-4 py-3 text-sm rounded-xl border bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 ${
      error
        ? "border-red-300 dark:border-red-900/60"
        : "border-gray-200 dark:border-gray-700 focus:border-[#13ec5b] focus:bg-white dark:focus:bg-gray-800"
    } ${className}`}
  />
));

// ═════════════════════════════════════════════════════════
//  STEP 1 — BUSINESS INFO
// ═════════════════════════════════════════════════════════
const StepBusiness = ({ form, errors, update, clearError }) => {
  const [geoLoading, setGeoLoading] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update({
          coordinates: {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          },
        });
        clearError("coordinates");
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Business details
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tell us about your refill business and where you're located.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Business name" required error={errors.businessName}>
          <TextInput
            value={form.businessName}
            onChange={(e) => {
              update({ businessName: e.target.value });
              clearError("businessName");
            }}
            placeholder="e.g. A1 Gas Refill Centre"
            error={!!errors.businessName}
            maxLength={120}
          />
        </Field>

        <Field label="Contact person" required error={errors.contactPerson}>
          <TextInput
            value={form.contactPerson}
            onChange={(e) => {
              update({ contactPerson: e.target.value });
              clearError("contactPerson");
            }}
            placeholder="Full name"
            error={!!errors.contactPerson}
            maxLength={120}
          />
        </Field>

        <Field label="Phone number" required error={errors.phone}>
          <TextInput
            type="tel"
            value={form.phone}
            onChange={(e) => {
              update({ phone: e.target.value });
              clearError("phone");
            }}
            placeholder="080 1234 5678"
            error={!!errors.phone}
            maxLength={40}
          />
        </Field>

        <Field label="Email" hint="Optional — used for notifications">
          <TextInput
            type="email"
            value={form.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="you@business.com"
            maxLength={200}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Station address" required error={errors.address}>
            <TextInput
              value={form.address}
              onChange={(e) => {
                update({ address: e.target.value });
                clearError("address");
              }}
              placeholder="Street, area, city"
              error={!!errors.address}
              maxLength={400}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Operating hours" hint="e.g. Mon–Sat 8am–7pm">
            <TextInput
              value={form.operatingHours}
              onChange={(e) => update({ operatingHours: e.target.value })}
              placeholder="Mon–Sat 8am–7pm"
              maxLength={200}
            />
          </Field>
        </div>
      </div>

      <CoordinatesPicker
        coords={form.coordinates}
        onChange={(c) => {
          update({ coordinates: c });
          clearError("coordinates");
        }}
        error={errors.coordinates}
        onUseMyLocation={useMyLocation}
        geoLoading={geoLoading}
      />
    </div>
  );
};

// ═════════════════════════════════════════════════════════
//  COORDINATE PICKER
// ═════════════════════════════════════════════════════════
const CoordinatesPicker = ({ coords, onChange, error, onUseMyLocation, geoLoading }) => {
  const [latInput, setLatInput] = useState(coords?.lat ?? "");
  const [lngInput, setLngInput] = useState(coords?.lng ?? "");

  useEffect(() => {
    setLatInput(coords?.lat ?? "");
    setLngInput(coords?.lng ?? "");
  }, [coords?.lat, coords?.lng]);

  const applyManual = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      onChange({ lat, lng });
    }
  };

  const center = coords
    ? [coords.lat, coords.lng]
    : [FALLBACK_COORDS.lat, FALLBACK_COORDS.lng];

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between gap-2 mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Location on map
          <span className="text-red-500 ml-0.5">*</span>
        </label>
        <button
          type="button"
          onClick={onUseMyLocation}
          disabled={geoLoading}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#13ec5b] bg-[#13ec5b]/10 px-3 py-1.5 rounded-lg hover:bg-[#13ec5b]/20 transition disabled:opacity-50"
        >
          <Navigation className={`h-3.5 w-3.5 ${geoLoading ? "animate-pulse" : ""}`} />
          Use my location
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 h-64 relative isolate z-0">
        <MapContainer
          center={center}
          zoom={coords ? 15 : 11}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          scrollWheelZoom={true}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {coords && (
            <Marker
              position={[coords.lat, coords.lng]}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  onChange({
                    lat: Number(lat.toFixed(6)),
                    lng: Number(lng.toFixed(6)),
                  });
                },
              }}
            />
          )}
        </MapContainer>

        {!coords && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10">
            <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4 shadow-xl text-center max-w-xs mx-4">
              <MapPin className="h-7 w-7 text-[#13ec5b] mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tap “Use my location” or enter coordinates below
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Field label="Latitude">
          <TextInput
            type="number"
            step="any"
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            onBlur={applyManual}
            placeholder="6.5244"
          />
        </Field>
        <Field label="Longitude">
          <TextInput
            type="number"
            step="any"
            value={lngInput}
            onChange={(e) => setLngInput(e.target.value)}
            onBlur={applyManual}
            placeholder="3.3792"
          />
        </Field>
      </div>

      {coords && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-1">
          📍 {Number(coords.lat).toFixed(5)}, {Number(coords.lng).toFixed(5)}
          <span className="text-gray-400 dark:text-gray-500 ml-1">(drag the pin to adjust)</span>
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════
//  STEP 2 — CYLINDER CATALOGUE
// ═════════════════════════════════════════════════════════
const StepCylinders = ({ form, errors, update, clearError }) => {
  const toggleSize = (size) => {
    const has = form.supportedSizes.includes(size);
    const nextSizes = has
      ? form.supportedSizes.filter((s) => s !== size)
      : [...form.supportedSizes, size];
    const nextPrices = { ...form.cylinderPrices };
    if (has) {
      delete nextPrices[size];
    } else if (!nextPrices[size]) {
      nextPrices[size] = "";
    }
    update({ supportedSizes: nextSizes, cylinderPrices: nextPrices });
    clearError("supportedSizes");
    clearError(`price_${size}`);
  };

  const setPrice = (size, value) => {
    update({
      cylinderPrices: { ...form.cylinderPrices, [size]: value },
    });
    clearError(`price_${size}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Cylinders & pricing
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Select the cylinder sizes you support and set your refill price per cylinder.
        </p>
      </div>

      <div className="space-y-4">
        {CYLINDER_SIZES.map((size) => {
          const checked = form.supportedSizes.includes(size);
          return (
            <div
              key={size}
              className={`rounded-xl border p-4 transition-all ${
                checked
                  ? "border-[#13ec5b] bg-[#13ec5b]/5 dark:bg-[#13ec5b]/10 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSize(size)}
                  aria-label={`Toggle ${size}`}
                  className={`h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0 transition ${
                    checked
                      ? "bg-[#13ec5b] border-[#13ec5b]"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  }`}
                >
                  {checked && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSize(size)}
                  className="text-base font-semibold text-gray-900 dark:text-white flex-1 text-left"
                >
                  {size} cylinder
                </button>

                {checked && (
                  <div className="flex items-center gap-1.5 flex-shrink-0 w-36">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      ₦
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={form.cylinderPrices[size] || ""}
                      onChange={(e) => setPrice(size, e.target.value)}
                      placeholder="0"
                      className={`w-full px-3 py-2 text-sm text-right font-medium rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/40 ${
                        errors[`price_${size}`]
                          ? "border-red-300 dark:border-red-900/60"
                          : "border-gray-200 dark:border-gray-700 focus:border-[#13ec5b]"
                      }`}
                    />
                  </div>
                )}
              </div>
              {checked && form.cylinderPrices[size] > 0 && (
                <p className="text-xs font-medium text-[#13ec5b] mt-2 ml-8 bg-[#13ec5b]/10 inline-block px-2 py-1 rounded">
                  Customers will pay {formatNaira(form.cylinderPrices[size])}
                </p>
              )}
              {errors[`price_${size}`] && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2 ml-8 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors[`price_${size}`]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {errors.supportedSizes && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errors.supportedSizes}
        </p>
      )}

      <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong className="font-semibold">Tip:</strong> Prices are visible to customers browsing nearby stations. Keep them competitive — you can edit them anytime from your station profile after approval.
        </p>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════
//  STEP 3 — DOCUMENTS
// ═════════════════════════════════════════════════════════
const StepDocuments = ({ form, errors, existingDocs, update, clearError }) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Verification documents
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          We need a few photos so our team can verify your business. All documents are stored securely.
        </p>
      </div>

      <div className="space-y-6">
        <FileField
          label="Business license"
          hint="Image (JPG, PNG, WEBP) or PDF · max 10MB"
          accept={LICENSE_MIMES.join(",")}
          file={form.businessLicense}
          existingUrl={existingDocs.licenseUrl}
          existingLabel="Business license on file"
          error={errors.businessLicense}
          onSelect={(file) => {
            update({ businessLicense: file });
            clearError("businessLicense");
          }}
          onRemove={() => {
            update({ businessLicense: null });
          }}
        />

        <MultiFileField
          label="Shop photos"
          hint={`Up to ${MAX_SHOP_PHOTOS} images · showing your storefront and interior`}
          accept={IMAGE_MIMES.join(",")}
          max={MAX_SHOP_PHOTOS}
          files={form.shopPhotos}
          existingUrls={existingDocs.shopPhotos}
          error={errors.shopPhotos}
          onChange={(files) => {
            update({ shopPhotos: files });
            clearError("shopPhotos");
          }}
        />

        <MultiFileField
          label="Cylinder photos"
          hint={`Up to ${MAX_CYLINDER_PHOTOS} images · showing the condition and quality of your cylinders`}
          accept={IMAGE_MIMES.join(",")}
          max={MAX_CYLINDER_PHOTOS}
          files={form.cylinderPhotos}
          existingUrls={existingDocs.cylinderPhotos}
          error={errors.cylinderPhotos}
          onChange={(files) => {
            update({ cylinderPhotos: files });
            clearError("cylinderPhotos");
          }}
        />
      </div>

      <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 p-4">
        <p className="text-xs text-yellow-800 dark:text-yellow-300 leading-relaxed">
          <strong className="font-semibold">Why we ask:</strong> Our team reviews these to keep customers safe and verify the quality of every cylinder on the platform. Photos of dirty, damaged, or non-certified cylinders may delay approval.
        </p>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════
//  FILE FIELD (single)
// ═════════════════════════════════════════════════════════
const FileField = ({
  label,
  hint,
  accept,
  file,
  existingUrl,
  existingLabel,
  error,
  onSelect,
  onRemove,
}) => {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState("");

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!isLicense(f.type)) {
      setLocalError("Please upload an image or PDF");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setLocalError("File is larger than 10MB");
      return;
    }
    setLocalError("");
    onSelect(f);
    e.target.value = "";
  };

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isPdf = file?.type === "application/pdf";
  const inputId = `file-${label.replace(/\s+/g, "-")}`;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        <span className="text-red-500 ml-0.5">*</span>
      </label>

      {!file && existingUrl && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 mb-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              {existingLabel}
            </p>
            <p className="text-xs text-green-700 dark:text-green-400">
              Your previous document is still valid. Upload a new one only if it needs replacing.
            </p>
          </div>
          <a
            href={existingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-green-700 dark:text-green-300 hover:underline flex-shrink-0"
          >
            View
          </a>
        </div>
      )}

      {file ? (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="h-14 w-14 rounded-lg bg-[#13ec5b]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {isPdf ? (
              <FileText className="h-7 w-7 text-[#13ec5b]" />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt={label}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-7 w-7 text-[#13ec5b]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {file.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onRemove();
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex-shrink-0 transition"
            aria-label="Remove"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            id={inputId}
          />
          <label
            htmlFor={inputId}
            className={`flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
              localError || error
                ? "border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-900/10"
                : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-[#13ec5b] hover:bg-[#13ec5b]/5"
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
              <Upload className="h-5 w-5 text-[#13ec5b]" />
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-[#13ec5b]">Click to upload</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 block sm:inline"> or drag and drop</span>
            </div>
          </label>
        </>
      )}

      {hint && !localError && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{hint}</p>
      )}
      {(localError || error) && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {localError || error}
        </p>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════
//  MULTI FILE FIELD
// ═════════════════════════════════════════════════════════
const MultiFileField = ({
  label,
  hint,
  accept,
  max,
  files,
  existingUrls,
  error,
  onChange,
}) => {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState("");

  const handleChange = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    const bad = picked.find(
      (f) => !isImage(f.type) || f.size > MAX_FILE_SIZE
    );
    if (bad) {
      setLocalError(
        !isImage(bad.type)
          ? "Only image files are allowed"
          : "Each image must be under 10MB"
      );
      e.target.value = "";
      return;
    }

    const next = [...files, ...picked].slice(0, max);
    setLocalError("");
    onChange(next);
    e.target.value = "";
  };

  const removeFile = (idx) => {
    const next = files.filter((_, i) => i !== idx);
    onChange(next);
  };

  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files]
  );
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  const remaining = max - files.length;
  const inputId = `multi-${label.replace(/\s+/g, "-")}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          <span className="text-red-500 ml-0.5">*</span>
        </label>
        <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 flex-shrink-0">
          {files.length + existingUrls.length} / {max}
        </span>
      </div>

      {existingUrls.length > 0 && files.length === 0 && (
        <div className="mb-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-3">
            {existingUrls.length} existing photo
            {existingUrls.length === 1 ? "" : "s"} on file (kept unless replaced)
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {existingUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative group"
              >
                <img
                  src={url}
                  alt={`existing-${i}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-3">
          {files.map((f, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative group shadow-sm"
            >
              <img
                src={previews[i]}
                alt={f.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="h-7 w-7 rounded-full bg-white text-red-600 flex items-center justify-center shadow-md transform scale-90 group-hover:scale-100 transition-transform"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            onChange={handleChange}
            className="hidden"
            id={inputId}
          />
          <label
            htmlFor={inputId}
            className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
              localError || error
                ? "border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-900/10"
                : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-[#13ec5b] hover:bg-[#13ec5b]/5"
            }`}
          >
            <Upload className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Add photo{remaining > 1 ? "s" : ""} ({remaining} remaining)
            </span>
          </label>
        </>
      )}

      {hint && !localError && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{hint}</p>
      )}
      {(localError || error) && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {localError || error}
        </p>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════
//  STEP 4 — REVIEW
// ═════════════════════════════════════════════════════════
const StepReview = ({ form, existingDocs }) => {
  const totalDocCount = useMemo(() => {
    const license = form.businessLicense instanceof File ? 1 : existingDocs.licenseUrl ? 1 : 0;
    const shop = form.shopPhotos.length || existingDocs.shopPhotos.length;
    const cyl = form.cylinderPhotos.length || existingDocs.cylinderPhotos.length;
    return license + shop + cyl;
  }, [form, existingDocs]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Review your application
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          One last look — please ensure everything is correct before submitting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReviewCard title="Business details">
          <ReviewRow label="Name" value={form.businessName} />
          <ReviewRow label="Contact" value={form.contactPerson} />
          <ReviewRow label="Phone" value={form.phone} />
          {form.email && <ReviewRow label="Email" value={form.email} />}
          <ReviewRow label="Address" value={form.address} />
          {form.operatingHours && (
            <ReviewRow label="Hours" value={form.operatingHours} />
          )}
          {form.coordinates && (
            <ReviewRow
              label="Location"
              value={`${Number(form.coordinates.lat).toFixed(5)}, ${Number(form.coordinates.lng).toFixed(5)}`}
            />
          )}
        </ReviewCard>

        <div className="space-y-6">
          <ReviewCard title="Cylinders & pricing">
            {form.supportedSizes.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">None selected</p>
            ) : (
              <div className="space-y-3">
                {form.supportedSizes.map((size) => (
                  <div
                    key={size}
                    className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <Flame className="h-4 w-4 text-gray-400" /> {size} refill
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatNaira(form.cylinderPrices[size])}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ReviewCard>

          <ReviewCard title="Documents">
            <ReviewRow 
              label="Total attached" 
              value={`${totalDocCount} file${totalDocCount === 1 ? "" : "s"}`} 
              highlight
            />
            <ReviewRow 
              label="Business license" 
              value={
                form.businessLicense instanceof File
                  ? "New file ready"
                  : existingDocs.licenseUrl
                  ? "Existing on file"
                  : "Missing"
              }
              isSuccess={form.businessLicense instanceof File || !!existingDocs.licenseUrl}
            />
            <ReviewRow label="Shop photos" value={form.shopPhotos.length || existingDocs.shopPhotos.length} />
            <ReviewRow label="Cylinder photos" value={form.cylinderPhotos.length || existingDocs.cylinderPhotos.length} />
          </ReviewCard>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          By submitting this application you confirm the information is accurate, that you own or operate the business described, and that you agree to Flanorx's refill-partner terms including the standard commission structure. 
        </p>
      </div>
    </div>
  );
};

const ReviewCard = ({ title, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
    <div className="bg-gray-50 dark:bg-gray-900/50 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
    </div>
    <div className="p-5 space-y-3">
      {children}
    </div>
  </div>
);

const ReviewRow = ({ label, value, highlight, isSuccess }) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
      {label}
    </span>
    <span 
      className={`font-medium text-right break-words min-w-0 max-w-[65%] ${
        isSuccess ? "text-green-600 dark:text-green-400" :
        highlight ? "text-gray-900 dark:text-white font-bold" :
        "text-gray-900 dark:text-white"
      }`}
    >
      {value || "—"}
    </span>
  </div>
);

export default RefillApplicationForm;