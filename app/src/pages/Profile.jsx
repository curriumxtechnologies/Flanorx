// pages/Profile.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Flame,
  Clock,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  Loader2,
  Camera,
  Image as ImageIcon,
  Key,
  UserCheck,
} from "lucide-react";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
} from "../features/userApiSlice";
import {
  useGetGasSubscriptionQuery,
  useRenewGasSubscriptionMutation,
  useCancelGasSubscriptionMutation,
  useUpgradeGasSubscriptionMutation,
} from "../features/gasApiSlice";
import { useGetRiderApplicationStatusQuery } from "../features/riderApiSlice";
import { pickMedia } from "../utils/mediaPicker";
import Sidebar from "../components/Sidebar";
import Bottombar from "../components/Bottombar";

// ═══════════════════════════════════════════════════════════
//  Custom Select
// ═══════════════════════════════════════════════════════════
const CustomSelect = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel =
    options.find((opt) => opt.value === value)?.label || placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 flex items-center justify-between text-sm transition"
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1 max-h-60 overflow-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                opt.value === value
                  ? "bg-[#13ec5b]/10 text-[#13ec5b]"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Address Item
// ═══════════════════════════════════════════════════════════
const AddressItem = ({ address, isDefault, onSetDefault, onDelete }) => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
          {address.label}
        </span>
        {isDefault && (
          <span className="text-[10px] font-medium text-[#13ec5b] bg-[#13ec5b]/10 px-2 py-0.5 rounded-md">
            Default
          </span>
        )}
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
        {address.address}
      </p>
    </div>
    <div className="flex items-center gap-1 flex-shrink-0">
      {!isDefault && (
        <button
          onClick={onSetDefault}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          title="Set as default"
        >
          <Check className="h-4 w-4 text-gray-400 hover:text-[#13ec5b]" />
        </button>
      )}
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
        title="Delete address"
      >
        <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
//  Media Source Modal — our own picker, not the system sheet
// ═══════════════════════════════════════════════════════════
const MediaSourceModal = ({ isOpen, onClose, onPick }) => {
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
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Update profile photo
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Options */}
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

        {/* Cancel */}
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
//  Upgrade Modal
// ═══════════════════════════════════════════════════════════
const UpgradeModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [selectedSize, setSelectedSize] = useState("6kg");
  const sizes = ["3kg", "6kg", "12kg"];
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Upgrade Cylinder
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose your new cylinder size.
        </p>
        <div className="space-y-2 mb-6">
          {sizes.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
                selectedSize === size
                  ? "border-[#13ec5b] bg-[#13ec5b]/10 text-gray-900 dark:text-white"
                  : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedSize)}
            disabled={isLoading}
            className="flex-1 py-2.5 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />} Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Cancel Modal
// ═══════════════════════════════════════════════════════════
const CancelModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Cancel Subscription
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Are you sure you want to cancel your gas subscription? This cannot be
          undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />} Yes,
            cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Profile Page
// ═══════════════════════════════════════════════════════════
const Profile = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  // ─── Queries ──────────────────────────────────────────────
  const {
    data: user,
    isLoading: userLoading,
    refetch: refetchUser,
  } = useGetProfileQuery();
  const [updateProfile, { isLoading: updateLoading }] =
    useUpdateProfileMutation();

  const { data: subscriptionData, refetch: refetchSubscription } =
    useGetGasSubscriptionQuery();
  const [renewGas, { isLoading: renewLoading }] =
    useRenewGasSubscriptionMutation();
  const [cancelGas, { isLoading: cancelLoading }] =
    useCancelGasSubscriptionMutation();
  const [upgradeGas, { isLoading: upgradeLoading }] =
    useUpgradeGasSubscriptionMutation();

  // ─── Rider application status ──────────────────────────────
  const {
    data: riderStatusData,
    isLoading: riderStatusLoading,
    refetch: refetchRiderStatus,
  } = useGetRiderApplicationStatusQuery();

  // ─── State ─────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "HOME", address: "" });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);

  // ─── Init ──────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditPhone(user.phone || "");
    }
  }, [user]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleUpdateProfile = async () => {
    try {
      await updateProfile({ name: editName, phone: editPhone }).unwrap();
      toast.success("Profile updated");
      setIsEditing(false);
      refetchUser();
    } catch (err) {
      toast.error(err.data?.message || "Failed to update profile");
    }
  };

  // ─── Media pick (camera / gallery) ────────────────────────
  const handleMediaPick = async (source) => {
    setShowMediaModal(false);
    try {
      const result = await pickMedia({ source });
      if (!result?.dataUrl) return; // user cancelled

      setIsUploading(true);
      await updateProfile({ profilePhoto: result.dataUrl }).unwrap();
      toast.success("Photo updated");
      refetchUser();
    } catch (err) {
      toast.error(
        err.data?.message || err.message || "Failed to upload photo"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRenew = async () => {
    try {
      const result = await renewGas().unwrap();
      if (result.authorization_url) {
        toast.success("Redirecting to payment...");
        window.location.href = result.authorization_url;
      }
    } catch (err) {
      toast.error(err.data?.message || "Failed to renew");
    }
  };

  const handleCancelConfirm = async () => {
    try {
      await cancelGas().unwrap();
      toast.success("Subscription cancelled");
      refetchSubscription();
      setShowCancelModal(false);
    } catch (err) {
      toast.error(err.data?.message || "Failed to cancel");
    }
  };

  const handleUpgradeConfirm = async (newSize) => {
    try {
      const result = await upgradeGas({ newCylinderSize: newSize }).unwrap();
      if (result.authorization_url) {
        toast.success("Redirecting to payment...");
        window.location.href = result.authorization_url;
      }
      setShowUpgradeModal(false);
    } catch (err) {
      toast.error(err.data?.message || "Failed to upgrade");
    }
  };

  const handleAddAddress = () => {
    toast.info("Address management coming soon!");
    setShowAddressForm(false);
  };

  const handleDeleteAddress = () => toast.info("Delete address coming soon!");
  const handleSetDefaultAddress = () => toast.info("Set default coming soon!");

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    toast.success("Password changed (stub)");
    setShowPasswordForm(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const isLoading = userLoading || updateLoading || isUploading;
  const subscription = subscriptionData?.subscription || null;
  const isActive = subscriptionData?.isActive || false;
  const daysRemaining = subscriptionData?.daysRemaining || 0;

  // ─── Rider status ──────────────────────────────────────────
  const riderStatus = riderStatusData?.verificationStatus;
  const riderRole = user?.role === "rider";

  const renderRiderButton = () => {
    if (riderRole) {
      return (
        <button
          onClick={() => navigate("/rider/dashboard")}
          className="px-4 py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition flex items-center gap-2 text-sm"
        >
          <UserCheck className="h-4 w-4" />
          Rider Dashboard
        </button>
      );
    }
    if (riderStatus === "pending") {
      return (
        <button
          disabled
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg opacity-70 cursor-not-allowed flex items-center gap-2 text-sm"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Application pending
        </button>
      );
    }
    if (riderStatus === "rejected") {
      return (
        <button
          onClick={() => navigate("/rider/apply")}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2 text-sm"
        >
          <UserCheck className="h-4 w-4" />
          Re-apply
        </button>
      );
    }
    return (
      <button
        onClick={() => navigate("/rider/apply")}
        className="px-4 py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition flex items-center gap-2 text-sm"
      >
        <UserCheck className="h-4 w-4" />
        Become a Rider
      </button>
    );
  };

  const isAdmin = user?.role === "admin" || userInfo?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Profile
          </h1>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {isAdmin && (
              <button
                onClick={() => navigate("/superuser/dashboard")}
                className="text-xs sm:text-sm font-medium bg-[#13ec5b] text-white px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-[#10d04e] transition"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => navigate("/settings")}
              className="text-xs sm:text-sm text-[#13ec5b] hover:underline"
            >
              Settings
            </button>
          </div>
        </header>

        <div className="w-full px-0 sm:px-4 lg:px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* ─── Profile Card ─────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
              <div className="p-5">
                {/* Mobile: photo RIGHT, info LEFT, vertically centred */}
                {/* Desktop: photo LEFT, info middle, role badge RIGHT */}
                <div className="flex flex-row-reverse items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#13ec5b]/10 flex items-center justify-center overflow-hidden border-2 border-[#13ec5b]/30">
                      {user?.profilePhoto ? (
                        <img
                          src={user.profilePhoto}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-10 w-10 sm:h-12 sm:w-12 text-[#13ec5b]" />
                      )}
                    </div>
                    <button
                      onClick={() => setShowMediaModal(true)}
                      disabled={isUploading}
                      aria-label="Change profile photo"
                      className="absolute bottom-0 right-0 p-1.5 bg-[#13ec5b] text-white rounded-full shadow-md hover:bg-[#10d04e] transition disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-transparent text-sm"
                          />
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={handleUpdateProfile}
                            disabled={isLoading}
                            className="px-4 py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition flex items-center gap-2 disabled:opacity-50 text-sm"
                          >
                            <Save className="h-4 w-4" /> Save
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                            {user?.name || "User"}
                          </h2>
                          {riderRole && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[#13ec5b]/10 text-[#13ec5b] border border-[#13ec5b]/20">
                              Rider
                            </span>
                          )}
                          {user?.role === "admin" && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              Admin
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1 min-w-0">
                            <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{user?.email}</span>
                          </span>
                          {user?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="truncate">{user.phone}</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => setIsEditing(true)}
                          className="mt-2 text-xs sm:text-sm text-[#13ec5b] hover:underline flex items-center gap-1"
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Edit
                          Profile
                        </button>
                      </>
                    )}
                  </div>

                  {/* Role badge — desktop only */}
                  <div className="hidden sm:block flex-shrink-0 self-center">
                    {user?.role && (
                      <span className="text-xs font-medium px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">
                        {user.role}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Rider Status Card ───────────────────────── */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
              <div className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <UserCheck className="h-5 w-5 text-[#13ec5b] flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Rider Status
                    </span>
                    {riderRole ? (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        Approved
                      </span>
                    ) : riderStatus === "pending" ? (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                        Pending
                      </span>
                    ) : riderStatus === "rejected" ? (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        Rejected
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        Not applied
                      </span>
                    )}
                  </div>
                  {renderRiderButton()}
                </div>
                {riderStatus === "pending" && (
                  <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                    Your application is being reviewed by admin.
                  </div>
                )}
                {riderStatus === "rejected" &&
                  riderStatusData?.rejectionReason && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      Rejection reason: {riderStatusData.rejectionReason}
                    </div>
                  )}
              </div>
            </div>

            {/* ─── Addresses ───────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#13ec5b]" /> Saved Addresses
                </h3>
                <button
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="text-sm text-[#13ec5b] hover:underline flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
              <div className="p-4 space-y-3">
                {user?.addresses?.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No saved addresses yet.
                  </p>
                )}
                {user?.addresses?.map((addr, idx) => (
                  <AddressItem
                    key={idx}
                    address={addr}
                    isDefault={addr.isDefault}
                    onSetDefault={() => handleSetDefaultAddress(addr._id)}
                    onDelete={() => handleDeleteAddress(addr._id)}
                  />
                ))}

                {showAddressForm && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Add New Address
                      </h4>
                      <button
                        onClick={() => setShowAddressForm(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Label
                        </label>
                        <CustomSelect
                          value={newAddress.label}
                          onChange={(val) =>
                            setNewAddress({ ...newAddress, label: val })
                          }
                          options={[
                            { value: "HOME", label: "Home" },
                            { value: "WORK", label: "Work" },
                            { value: "OTHER", label: "Other" },
                          ]}
                          placeholder="Select label"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          value={newAddress.address}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              address: e.target.value,
                            })
                          }
                          placeholder="Street, city, state"
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50"
                        />
                      </div>
                      <button
                        onClick={handleAddAddress}
                        className="w-full py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition"
                      >
                        Save Address
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Gas Subscription ─────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Flame className="h-5 w-5 text-[#13ec5b]" /> Gas Subscription
                </h3>
              </div>
              <div className="p-4">
                {isActive ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Cylinder
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {subscription?.cylinderSize}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Status
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                        Active · {daysRemaining}d left
                      </span>
                    </div>
                    {subscription?.nextBillingDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Renewal
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(
                            subscription.nextBillingDate
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={handleRenew}
                        disabled={renewLoading}
                        className="px-4 py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition disabled:opacity-50 flex items-center gap-2 text-sm"
                      >
                        {renewLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}{" "}
                        Renew
                      </button>
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        disabled={upgradeLoading}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 flex items-center gap-2 text-sm"
                      >
                        {upgradeLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Package className="h-4 w-4" />
                        )}{" "}
                        Upgrade
                      </button>
                      <button
                        onClick={() => setShowCancelModal(true)}
                        disabled={cancelLoading}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No active gas subscription.
                    </p>
                    <button
                      onClick={() => navigate("/order/gas")}
                      className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
                    >
                      Get a subscription
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Change Password ──────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
              >
                <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Key className="h-5 w-5 text-[#13ec5b]" /> Change Password
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    showPasswordForm ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showPasswordForm && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 text-sm"
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    className="w-full py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition text-sm"
                  >
                    Update Password
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modals ───────────────────────────────────────── */}
      <MediaSourceModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onPick={handleMediaPick}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onConfirm={handleUpgradeConfirm}
        isLoading={upgradeLoading}
      />

      <CancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelConfirm}
        isLoading={cancelLoading}
      />

      <Bottombar />
    </div>
  );
};

export default Profile;