import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Truck,
  Filter,
  X,
  Search,
  RefreshCw,
  ChevronDown,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck,
  UserX,
  Shield,
  FileText,
  Image,
  AlertTriangle,
} from "lucide-react";
import {
  useGetRiderApplicationsQuery,
  useApproveRiderMutation,
  useRejectRiderMutation,
  useUpdateUserRoleMutation,
} from "../../features/adminApiSlice";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminBottombar from "../../components/admin/Bottombar";

// ─── Confirm Modal ──────────────────────────────────────────
const ConfirmModal = ({ isOpen, onClose, onConfirm, message, loading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-500" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Action</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Clock className="h-4 w-4 animate-spin" /> : null}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reject Modal ──────────────────────────────────────────
const RejectModal = ({ isOpen, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!reason.trim()) {
      alert("Rejection reason is required");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reject Application</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Please provide a reason for rejection.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows="3"
          placeholder="Enter rejection reason..."
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 resize-none text-sm"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Clock className="h-4 w-4 animate-spin" /> : null}
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────
const AdminRiders = () => {
  const navigate = useNavigate();

  // ─── Filters state ─────────────────────────────────────────
  const [filters, setFilters] = useState({
    status: "",
    search: "",
  });
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);

  // ─── Modal states ──────────────────────────────────────────
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectUserId, setRejectUserId] = useState(null);

  // ─── Queries & Mutations ──────────────────────────────────
  const {
    data: riders = [],
    isLoading,
    error,
    refetch,
  } = useGetRiderApplicationsQuery({
    status: filters.status || undefined,
  });

  const [approveRider, { isLoading: approveLoading }] = useApproveRiderMutation();
  const [rejectRider, { isLoading: rejectLoading }] = useRejectRiderMutation();
  const [updateUserRole, { isLoading: roleUpdateLoading }] = useUpdateUserRoleMutation();

  // ─── Filter options ────────────────────────────────────────
  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  // ─── Filter handlers ──────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      search: "",
    });
  };

  // ─── Actions ──────────────────────────────────────────────
  const handleApprove = (userId) => {
    setConfirmMessage("Approve this rider application?");
    setConfirmAction(() => async () => {
      try {
        await approveRider(userId).unwrap();
        refetch();
        if (selectedRider && selectedRider._id === userId) {
          const updated = riders.find((r) => r._id === userId);
          if (updated) setSelectedRider(updated);
        }
        setShowConfirmModal(false);
      } catch (err) {
        alert(err.data?.message || "Failed to approve rider");
      }
    });
    setShowConfirmModal(true);
  };

  const handleRejectClick = (userId) => {
    setRejectUserId(userId);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async (reason) => {
    try {
      await rejectRider({ userId: rejectUserId, reason }).unwrap();
      refetch();
      if (selectedRider && selectedRider._id === rejectUserId) {
        const updated = riders.find((r) => r._id === rejectUserId);
        if (updated) setSelectedRider(updated);
      }
      setShowRejectModal(false);
      setRejectUserId(null);
    } catch (err) {
      alert(err.data?.message || "Failed to reject rider");
    }
  };

  const handleRemoveRider = (userId) => {
    setConfirmMessage("Remove this user from rider role? They will become a regular user.");
    setConfirmAction(() => async () => {
      try {
        await updateUserRole({ id: userId, role: "user" }).unwrap();
        refetch();
        setSelectedRider(null);
        setShowConfirmModal(false);
      } catch (err) {
        alert(err.data?.message || "Failed to update role");
      }
    });
    setShowConfirmModal(true);
  };

  // ─── Status colors ──────────────────────────────────────
  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "rejected":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // ─── Filtered riders ──────────────────────────────────────
  const filteredRiders = useMemo(() => {
    let result = riders;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name?.toLowerCase().includes(searchLower) ||
          r.email?.toLowerCase().includes(searchLower)
      );
    }
    return result;
  }, [riders, filters.search]);

  // ─── Custom Dropdown ─────────────────────────────────────
  const CustomDropdown = ({ value, options, onChange, placeholder, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = React.useRef(null);

    React.useEffect(() => {
      const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selected = options.find((opt) => opt.value === value);
    const display = selected ? selected.label : placeholder;

    return (
      <div className={`relative ${className}`} ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#13ec5b]/50"
        >
          <span>{display}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-60 overflow-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
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

  // ─── Desktop FilterDropdown ──────────────────────────────
  const FilterDropdown = ({ label, value, options, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = React.useRef(null);

    React.useEffect(() => {
      const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selected = options.find((opt) => opt.value === value);
    const display = selected ? selected.label : label;

    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition min-w-[140px] justify-between"
        >
          <span>{display}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-60 overflow-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onSelect(opt.value);
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

  // ─── Filter Sheet (mobile) ──────────────────────────────
  const FilterSheet = () => (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setShowFilterSheet(false)}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filter Riders</h3>
          <button
            onClick={() => setShowFilterSheet(false)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange("status", opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.status === opt.value
                      ? "bg-[#13ec5b] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="Name or email..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                clearFilters();
                setShowFilterSheet(false);
              }}
              className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowFilterSheet(false)}
              className="flex-1 py-2.5 bg-[#13ec5b] text-white rounded-lg font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Detail Modal ────────────────────────────────────────
  const DetailModal = () => {
    if (!selectedRider) return null;

    const rider = selectedRider;
    const isPending = rider.verificationStatus === "pending";
    const isApproved = rider.verificationStatus === "approved";

    const documents = [
      { label: "Profile Picture", url: rider.profilePicture, icon: Image },
      { label: "NIN Picture", url: rider.ninPicture, icon: Image },
      { label: "Proof of Address", url: rider.proofOfAddress, icon: FileText },
    ];

    return (
      <>
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedRider(null)}
        />
        <div
          className="fixed z-50 bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto transition-transform duration-300 ease-in-out
            bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl
            lg:bottom-auto lg:top-0 lg:right-0 lg:left-auto lg:w-full lg:max-w-lg lg:rounded-none lg:h-full lg:max-h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {rider.name || "Rider"}
            </h3>
            <button
              onClick={() => setSelectedRider(null)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-4 space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Email</p>
                <p className="text-gray-900 dark:text-white break-all">{rider.email || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Phone</p>
                <p className="text-gray-900 dark:text-white">{rider.phone || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Status</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                    rider.verificationStatus
                  )}`}
                >
                  {getStatusIcon(rider.verificationStatus)}
                  {rider.verificationStatus || "pending"}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Role</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {rider.role || "user"}
                </span>
              </div>
            </div>

            {rider.fuelingStation && (
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Fueling Station</p>
                <p className="text-sm text-gray-900 dark:text-white">{rider.fuelingStation}</p>
              </div>
            )}
            {rider.bankName && rider.bankAccountNumber && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Bank</p>
                  <p className="text-gray-900 dark:text-white">{rider.bankName}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Account</p>
                  <p className="text-gray-900 dark:text-white">{rider.bankAccountNumber}</p>
                </div>
              </div>
            )}
            {rider.accountName && (
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Account Name</p>
                <p className="text-sm text-gray-900 dark:text-white">{rider.accountName}</p>
              </div>
            )}
            {rider.nin && (
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">NIN</p>
                <p className="text-sm font-mono text-gray-900 dark:text-white">{rider.nin}</p>
              </div>
            )}

            {rider.verificationStatus === "rejected" && rider.rejectionReason && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Rejection Reason</p>
                <p className="text-red-600 dark:text-red-400 text-sm">{rider.rejectionReason}</p>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Application Documents
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {documents.map((doc) => (
                  <div key={doc.label} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                    <div className="flex justify-center mb-1">
                      <doc.icon className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{doc.label}</p>
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#13ec5b] hover:underline break-all"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">Not provided</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex flex-col gap-2">
              {isPending && (
                <>
                  <button
                    onClick={() => handleApprove(rider._id)}
                    disabled={approveLoading}
                    className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {approveLoading ? "Approving..." : "Approve Application"}
                  </button>
                  <button
                    onClick={() => handleRejectClick(rider._id)}
                    disabled={rejectLoading}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    {rejectLoading ? "Rejecting..." : "Reject Application"}
                  </button>
                </>
              )}

              {isApproved && (
                <button
                  onClick={() => handleRemoveRider(rider._id)}
                  disabled={roleUpdateLoading}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UserX className="h-4 w-4" />
                  {roleUpdateLoading ? "Removing..." : "Remove Rider Role"}
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  // ─── Mobile Slim List Item ──────────────────────────────
  const SlimRiderItem = ({ rider }) => (
    <div
      onClick={() => setSelectedRider(rider)}
      className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer transition"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {rider.name || "Unknown"}
          </span>
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(
              rider.verificationStatus
            )}`}
          >
            {getStatusIcon(rider.verificationStatus)}
            {rider.verificationStatus || "pending"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {rider.email || ""}
          </span>
        </div>
      </div>
      <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg] flex-shrink-0 ml-2" />
    </div>
  );

  // ─── Main render ──────────────────────────────────────────
  const isModalOpen = !!selectedRider || showFilterSheet || showConfirmModal || showRejectModal;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">Riders</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setShowFilterSheet(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
            >
              <Filter className="h-4 w-4" /> Filters
            </button>
          </div>
        </header>

        <div className="w-full px-0 sm:px-4 lg:px-6 py-4">
          {/* Desktop filters */}
          <div className="hidden lg:flex flex-wrap items-center gap-3 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <FilterDropdown label="Status" value={filters.status} options={statusOptions} onSelect={(v) => handleFilterChange("status", v)} />
            <div className="flex-1 min-w-[150px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="Search riders..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50"
                />
              </div>
            </div>
            <button onClick={clearFilters} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium">
              Clear
            </button>
          </div>

          {/* Riders display */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {filteredRiders.length} {filteredRiders.length === 1 ? "Rider" : "Riders"} found
              </h2>
            </div>

            {isLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                Failed to load riders. Please try again.
              </div>
            ) : filteredRiders.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No riders found</p>
              </div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Name</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Email</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRiders.map((rider) => (
                        <tr key={rider._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{rider.name || "Unknown"}</td>
                          <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">{rider.email || "—"}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(rider.verificationStatus)}`}>
                              {getStatusIcon(rider.verificationStatus)}
                              {rider.verificationStatus || "pending"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => setSelectedRider(rider)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" title="View details">
                                <Eye className="h-4 w-4 text-gray-400" />
                              </button>
                              {rider.verificationStatus === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleApprove(rider._id)}
                                    disabled={approveLoading}
                                    className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition text-green-600"
                                    title="Approve"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectClick(rider._id)}
                                    disabled={rejectLoading}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-600"
                                    title="Reject"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {rider.verificationStatus === "approved" && (
                                <button
                                  onClick={() => handleRemoveRider(rider._id)}
                                  disabled={roleUpdateLoading}
                                  className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition text-orange-600"
                                  title="Remove rider role"
                                >
                                  <UserX className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredRiders.map((rider) => (
                    <SlimRiderItem key={rider._id} rider={rider} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {!isModalOpen && <AdminBottombar />}

      {showFilterSheet && <FilterSheet />}
      {selectedRider && <DetailModal />}

      {/* Custom Modals */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmAction}
        message={confirmMessage}
        loading={approveLoading || roleUpdateLoading}
      />
      <RejectModal
        isOpen={showRejectModal}
        onClose={() => { setShowRejectModal(false); setRejectUserId(null); }}
        onConfirm={handleRejectConfirm}
        loading={rejectLoading}
      />
    </div>
  );
};

export default AdminRiders;