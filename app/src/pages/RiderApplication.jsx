// pages/RiderApplication.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  UserCheck,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Camera,
  Image as ImageIcon,
  Upload,
  X,
  ChevronDown,
} from "lucide-react";
import {
  useApplyForRiderMutation,
  useUpdateRiderApplicationMutation,
  useGetRiderApplicationStatusQuery,
  useResolveBankMutation,
  useGetBanksQuery,
} from "../features/riderApiSlice";
import { pickMedia, dataUrlToFile } from "../utils/mediaPicker";
import Sidebar from "../components/Sidebar";
import Bottombar from "../components/Bottombar";

// ═══════════════════════════════════════════════════════════
//  Media Source Modal — custom picker (camera / gallery)
//  Reused for all three document uploads.
// ═══════════════════════════════════════════════════════════
const MediaSourceModal = ({ isOpen, onClose, onPick, title }) => {
  if (!isOpen) return null;

  const options = [
    {
      key: "camera",
      label: "Take a photo",
      description: "Use your camera",
      icon: Camera,
    },
    {
      key: "gallery",
      label: "Choose from gallery",
      description: "Pick an existing image",
      icon: ImageIcon,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {title || "Upload image"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => onPick(opt.key)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40 active:bg-gray-100 dark:active:bg-gray-600 transition text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[#13ec5b]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-[#13ec5b]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-2 pt-0 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-xl transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Document Upload Field
//  Handles: preview, remove, "current file" link, error text.
// ═══════════════════════════════════════════════════════════
const DocumentField = ({
  label,
  required,
  fieldKey,
  preview,
  existingUrl,
  error,
  disabled,
  onPick,
  onRemove,
  isRound = false,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        className="cursor-pointer flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Upload className="h-4 w-4 flex-shrink-0" />
        <span>Choose file</span>
      </button>

      {preview && (
        <div
          className={`relative w-12 h-12 overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0 ${
            isRound ? "rounded-full" : "rounded"
          }`}
        >
          <img
            src={preview}
            alt={`${label} preview`}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
            aria-label={`Remove ${label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {existingUrl && !preview && (
        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Current:{" "}
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#13ec5b] underline"
          >
            View
          </a>
        </div>
      )}
    </div>
    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
  </div>
);

const RiderApplication = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  // ─── Queries & Mutations ──────────────────────────────────
  const {
    data: statusData,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useGetRiderApplicationStatusQuery();

  const {
    data: banksData = [],
    isLoading: banksLoading,
    error: banksError,
    refetch: refetchBanks,
  } = useGetBanksQuery();

  const [applyForRider, { isLoading: applyLoading }] = useApplyForRiderMutation();
  const [updateRiderApplication, { isLoading: updateLoading }] =
    useUpdateRiderApplicationMutation();
  const [resolveBank, { isLoading: resolvingBank }] = useResolveBankMutation();

  // ─── Local state ──────────────────────────────────────────
  const [formData, setFormData] = useState({
    nin: "",
    fuelingStation: "",
    bankAccountNumber: "",
    bankName: "",
    bankCode: "",
    accountName: "",
    phone: "",
  });

  const [files, setFiles] = useState({
    profilePicture: null,
    ninPicture: null,
    proofOfAddress: null,
  });

  const [filePreviews, setFilePreviews] = useState({
    profilePicture: null,
    ninPicture: null,
    proofOfAddress: null,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Bank lookup state ────────────────────────────────────
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [accountNameFetched, setAccountNameFetched] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  // ─── Media picker modal state ─────────────────────────────
  // Tracks which field is being picked: "profilePicture" | "ninPicture" | "proofOfAddress" | null
  const [mediaField, setMediaField] = useState(null);

  // ─── Determine application status ─────────────────────────
  const verificationStatus = statusData?.verificationStatus;
  const existingData = statusData?.data || {};
  const rejectionReason = statusData?.rejectionReason || null;

  // ─── Pre-fill form with existing data ─────────────────────
  useEffect(() => {
    if (existingData && verificationStatus !== "none") {
      setFormData({
        nin: existingData.nin || "",
        fuelingStation: existingData.fuelingStation || "",
        bankAccountNumber: existingData.bankAccountNumber || "",
        bankName: existingData.bankName || "",
        bankCode: existingData.bankCode || "",
        accountName: existingData.accountName || "",
        phone: existingData.phone || "",
      });
      if (existingData.accountName) {
        setAccountNameFetched(existingData.accountName);
      }
    }
  }, [existingData, verificationStatus]);

  // ─── Handle account number change ─────────────────────────
  const handleAccountNumberChange = (value) => {
    const cleaned = value.replace(/\s+/g, "");
    setFormData((prev) => ({
      ...prev,
      bankAccountNumber: cleaned,
      accountName: "",
    }));
    setAccountNameFetched("");
    setErrors((prev) => ({ ...prev, bankAccountNumber: "", accountName: "" }));

    if (cleaned.length === 10 && !banksLoading && banksData.length > 0) {
      setShowBankDropdown(true);
    } else {
      setShowBankDropdown(false);
    }
  };

  // ─── Handle bank selection ────────────────────────────────
  const handleBankSelect = async (bank) => {
    setFormData((prev) => ({
      ...prev,
      bankName: bank.name,
      bankCode: bank.code,
    }));
    setShowBankDropdown(false);

    const accountNumber = formData.bankAccountNumber;
    if (accountNumber.length === 10) {
      setIsResolving(true);
      try {
        const result = await resolveBank({
          accountNumber,
          bankCode: bank.code,
        }).unwrap();

        if (result.success && result.account_name) {
          setAccountNameFetched(result.account_name);
          setFormData((prev) => ({
            ...prev,
            accountName: result.account_name,
          }));
          toast.success("Account verified successfully");
          setErrors((prev) => ({ ...prev, accountName: "" }));
        } else {
          toast.warning("Account not found – please check the number");
          setErrors((prev) => ({ ...prev, accountName: "Account not found" }));
        }
      } catch (err) {
        const msg = err.data?.message || "Bank verification failed";
        toast.error(msg);
        setErrors((prev) => ({ ...prev, accountName: msg }));
      } finally {
        setIsResolving(false);
      }
    }
  };

  // ─── Manual verify ────────────────────────────────────────
  const handleManualVerify = async () => {
    if (!formData.bankCode || formData.bankAccountNumber.length !== 10) {
      toast.warning(
        "Please enter a valid 10-digit account number and select a bank"
      );
      return;
    }

    setIsResolving(true);
    try {
      const result = await resolveBank({
        accountNumber: formData.bankAccountNumber,
        bankCode: formData.bankCode,
      }).unwrap();

      if (result.success && result.account_name) {
        setAccountNameFetched(result.account_name);
        setFormData((prev) => ({
          ...prev,
          accountName: result.account_name,
        }));
        toast.success("Account verified successfully");
        setErrors((prev) => ({ ...prev, accountName: "" }));
      } else {
        toast.warning("Account not found – please check the number");
        setErrors((prev) => ({ ...prev, accountName: "Account not found" }));
      }
    } catch (err) {
      const msg = err.data?.message || "Bank verification failed";
      toast.error(msg);
      setErrors((prev) => ({ ...prev, accountName: msg }));
    } finally {
      setIsResolving(false);
    }
  };

  // ─── Form change handler ──────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "bankAccountNumber") {
      handleAccountNumberChange(value);
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ═══════════════════════════════════════════════════════════
  //  Media picking — Capacitor + web via pickMedia()
  // ═══════════════════════════════════════════════════════════
  const openMediaPicker = (field) => setMediaField(field);

  const handleMediaPick = async (source) => {
    const field = mediaField;
    setMediaField(null);
    if (!field) return;

    try {
      const result = await pickMedia({ source });
      if (!result?.dataUrl) return; // user cancelled

      // Convert data URL → File so we can attach it to FormData
      const ext = (result.file?.type || "image/jpeg").split("/")[1] || "jpeg";
      const file =
        result.file || dataUrlToFile(result.dataUrl, ext);

      setFiles((prev) => ({ ...prev, [field]: file }));
      setFilePreviews((prev) => ({ ...prev, [field]: result.dataUrl }));

      // Clear any prior error for this field
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    } catch (err) {
      toast.error(err?.message || "Failed to pick image");
    }
  };

  const removeFile = (field) => {
    setFiles((prev) => ({ ...prev, [field]: null }));
    setFilePreviews((prev) => ({ ...prev, [field]: null }));
  };

  // ─── Validation ───────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    const cleanedNin = formData.nin.replace(/\s+/g, "");
    if (!cleanedNin || !/^\d{11}$/.test(cleanedNin)) {
      newErrors.nin = "NIN must be 11 digits";
    }
    if (!formData.fuelingStation.trim()) {
      newErrors.fuelingStation = "Fueling station is required";
    }
    if (
      !formData.bankAccountNumber.trim() ||
      formData.bankAccountNumber.length !== 10
    ) {
      newErrors.bankAccountNumber = "Valid 10-digit account number is required";
    }
    if (!formData.bankName.trim() || !formData.bankCode) {
      newErrors.bankName = "Please select a bank";
    }
    if (!formData.accountName.trim()) {
      newErrors.accountName =
        "Account name is required – please verify the account";
    }
    if (!files.proofOfAddress) {
      newErrors.proofOfAddress = "Proof of address is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) submitData.append(key, value);
    });
    if (files.profilePicture)
      submitData.append("profilePicture", files.profilePicture);
    if (files.ninPicture) submitData.append("ninPicture", files.ninPicture);
    if (files.proofOfAddress)
      submitData.append("proofOfAddress", files.proofOfAddress);

    setIsSubmitting(true);
    try {
      if (verificationStatus === "rejected") {
        await updateRiderApplication(submitData).unwrap();
        toast.success("Application updated. Awaiting admin review.");
      } else {
        await applyForRider(submitData).unwrap();
        toast.success("Application submitted successfully.");
      }
      refetchStatus();
      setIsSubmitting(false);
      setTimeout(() => navigate("/profile"), 2000);
    } catch (err) {
      const msg = err.data?.message || "Failed to submit application";
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  const isLoading =
    statusLoading || applyLoading || updateLoading || isSubmitting;

  // ─── Status message ───────────────────────────────────────
  const renderStatusMessage = () => {
    if (verificationStatus === "pending") {
      return (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-yellow-700 dark:text-yellow-300">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 animate-spin flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Application pending</p>
              <p className="text-sm mt-1">
                Your application is being reviewed by the admin. You will be
                notified once it's approved or rejected.
              </p>
            </div>
          </div>
        </div>
      );
    }
    if (verificationStatus === "approved") {
      return (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-700 dark:text-green-300">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Application approved!</p>
              <p className="text-sm mt-1">
                You are now a registered rider. You can access the rider
                dashboard.
              </p>
              <button
                onClick={() => navigate("/rider/dashboard")}
                className="mt-2 px-4 py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition text-sm"
              >
                Go to Rider Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (verificationStatus === "rejected") {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Application rejected</p>
              {rejectionReason && (
                <p className="text-sm mt-1">
                  <span className="font-medium">Reason:</span>{" "}
                  {rejectionReason}
                </p>
              )}
              <p className="text-sm mt-1">
                You can update your details and re‑apply using the form below.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // ─── Form ─────────────────────────────────────────────────
  const renderForm = () => {
    if (verificationStatus === "pending" || verificationStatus === "approved") {
      return null;
    }
    return (
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* NIN */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            NIN (11 digits) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="nin"
            value={formData.nin}
            onChange={handleChange}
            placeholder="e.g. 12345678901"
            inputMode="numeric"
            className={`w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent ${
              errors.nin
                ? "border-red-500"
                : "border-gray-200 dark:border-gray-600"
            }`}
            disabled={isLoading}
          />
          {errors.nin && (
            <p className="mt-1 text-xs sm:text-sm text-red-500">{errors.nin}</p>
          )}
        </div>

        {/* Fueling Station */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fueling Station <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="fuelingStation"
            value={formData.fuelingStation}
            onChange={handleChange}
            placeholder="e.g. TotalEnergies, Ikeja"
            className={`w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent ${
              errors.fuelingStation
                ? "border-red-500"
                : "border-gray-200 dark:border-gray-600"
            }`}
            disabled={isLoading}
          />
          {errors.fuelingStation && (
            <p className="mt-1 text-xs sm:text-sm text-red-500">
              {errors.fuelingStation}
            </p>
          )}
        </div>

        {/* Account Number */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Account Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              name="bankAccountNumber"
              value={formData.bankAccountNumber}
              onChange={handleChange}
              placeholder="Enter 10-digit account number"
              inputMode="numeric"
              className={`w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent ${
                errors.bankAccountNumber
                  ? "border-red-500"
                  : "border-gray-200 dark:border-gray-600"
              }`}
              disabled={isLoading || isResolving}
            />
            {(isResolving || resolvingBank) && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-5 w-5 animate-spin text-[#13ec5b]" />
              </div>
            )}
          </div>
          {errors.bankAccountNumber && (
            <p className="mt-1 text-xs sm:text-sm text-red-500">
              {errors.bankAccountNumber}
            </p>
          )}
        </div>

        {/* Bank Selection */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Select Bank <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (
                  formData.bankAccountNumber.length === 10 &&
                  banksData.length > 0
                ) {
                  setShowBankDropdown(!showBankDropdown);
                } else if (banksLoading) {
                  toast.info("Loading banks...");
                } else if (banksError) {
                  toast.error("Failed to load banks. Please refresh.");
                } else if (formData.bankAccountNumber.length !== 10) {
                  toast.warning(
                    "Please enter a valid 10-digit account number first"
                  );
                }
              }}
              className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent ${
                errors.bankName
                  ? "border-red-500"
                  : "border-gray-200 dark:border-gray-600"
              } ${
                formData.bankAccountNumber.length !== 10 || banksLoading
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
              disabled={
                isLoading ||
                isResolving ||
                formData.bankAccountNumber.length !== 10 ||
                banksLoading
              }
            >
              <span className="truncate">
                {banksLoading
                  ? "Loading banks..."
                  : formData.bankName || "Select bank"}
              </span>
              {!banksLoading && (
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${
                    showBankDropdown ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {showBankDropdown && banksData.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-60 overflow-auto py-1">
                <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  {banksData.length} banks found
                </div>
                {banksData.map((bank) => (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => handleBankSelect(bank)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                      formData.bankCode === bank.code
                        ? "bg-[#13ec5b]/10 text-[#13ec5b]"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {bank.name}
                    <span className="text-xs text-gray-400 ml-2">
                      ({bank.code})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {errors.bankName && (
            <p className="mt-1 text-xs sm:text-sm text-red-500">
              {errors.bankName}
            </p>
          )}
          {banksError && (
            <p className="mt-1 text-xs text-red-500">
              Could not load banks.{" "}
              <button
                type="button"
                onClick={refetchBanks}
                className="text-[#13ec5b] hover:underline"
              >
                Retry
              </button>
            </p>
          )}
        </div>

        {/* Account Name */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Account Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              name="accountName"
              value={formData.accountName}
              onChange={handleChange}
              placeholder={
                isResolving || resolvingBank
                  ? "Verifying..."
                  : "Auto-fills after bank selection"
              }
              className={`w-full px-3 sm:px-4 py-2.5 bg-gray-100 dark:bg-gray-600 border rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent ${
                errors.accountName
                  ? "border-red-500"
                  : "border-gray-200 dark:border-gray-600"
              } ${isResolving || resolvingBank ? "opacity-70" : ""}`}
              disabled={true}
            />
            {formData.accountName && accountNameFetched && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            )}
          </div>
          {errors.accountName && (
            <p className="mt-1 text-xs sm:text-sm text-red-500">
              {errors.accountName}
            </p>
          )}
          {formData.bankCode &&
            formData.bankAccountNumber.length === 10 &&
            !formData.accountName &&
            !isResolving &&
            !resolvingBank && (
              <button
                type="button"
                onClick={handleManualVerify}
                className="mt-1 text-xs text-[#13ec5b] hover:underline flex items-center gap-1"
              >
                <Loader2 className="h-3 w-3" />
                Verify account now
              </button>
            )}
          {formData.accountName && accountNameFetched && (
            <p className="mt-1 text-xs text-green-500">✓ Verified from bank</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="e.g. 08012345678"
            inputMode="tel"
            className="w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* ─── File Uploads (Capacitor-aware) ─────────────── */}
        <div className="space-y-4">
          <DocumentField
            label="Profile Picture"
            fieldKey="profilePicture"
            preview={filePreviews.profilePicture}
            existingUrl={existingData.profilePicture}
            error={errors.profilePicture}
            disabled={isLoading}
            isRound
            onPick={() => openMediaPicker("profilePicture")}
            onRemove={() => removeFile("profilePicture")}
          />

          <DocumentField
            label="NIN Picture"
            fieldKey="ninPicture"
            preview={filePreviews.ninPicture}
            existingUrl={existingData.ninPicture}
            error={errors.ninPicture}
            disabled={isLoading}
            onPick={() => openMediaPicker("ninPicture")}
            onRemove={() => removeFile("ninPicture")}
          />

          <DocumentField
            label="Proof of Address"
            required
            fieldKey="proofOfAddress"
            preview={filePreviews.proofOfAddress}
            existingUrl={existingData.proofOfAddress}
            error={errors.proofOfAddress}
            disabled={isLoading}
            onPick={() => openMediaPicker("proofOfAddress")}
            onRemove={() => removeFile("proofOfAddress")}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || isResolving || resolvingBank}
          className="w-full py-3 bg-[#13ec5b] hover:bg-[#10d04e] text-white font-bold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60 text-sm sm:text-base"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : isResolving || resolvingBank ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Verifying account...
            </>
          ) : verificationStatus === "rejected" ? (
            "Re‑apply"
          ) : (
            "Submit Application"
          )}
        </button>
      </form>
    );
  };

  // ─── Main render ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Become a Rider
          </h1>
          <button
            onClick={() => navigate("/profile")}
            className="text-xs sm:text-sm text-[#13ec5b] hover:underline flex-shrink-0"
          >
            Profile
          </button>
        </header>

        <div className="w-full px-0 sm:px-4 lg:px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-[#13ec5b] flex-shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                    Rider Application
                  </h2>
                </div>

                {statusLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#13ec5b]" />
                  </div>
                ) : statusError ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm">
                    <AlertCircle className="h-5 w-5 inline-block mr-2" />
                    Failed to load application status. Please try again.
                  </div>
                ) : (
                  <>
                    {renderStatusMessage()}
                    {renderForm()}
                  </>
                )}
              </div>
            </div>

            <div className="mt-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
              <div className="p-4 sm:p-5 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  What happens next?
                </p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Your application will be reviewed by an admin.</li>
                  <li>
                    You'll receive a notification once your status changes.
                  </li>
                  <li>
                    If approved, you'll get access to the Rider Dashboard.
                  </li>
                  <li>
                    You can update your details if your application is
                    rejected.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Media picker modal ─────────────────────────── */}
      <MediaSourceModal
        isOpen={!!mediaField}
        onClose={() => setMediaField(null)}
        onPick={handleMediaPick}
        title={
          mediaField === "profilePicture"
            ? "Profile picture"
            : mediaField === "ninPicture"
            ? "NIN picture"
            : mediaField === "proofOfAddress"
            ? "Proof of address"
            : "Upload image"
        }
      />

      <Bottombar />
    </div>
  );
};

export default RiderApplication;