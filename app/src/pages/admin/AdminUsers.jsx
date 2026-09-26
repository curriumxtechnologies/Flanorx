// src/pages/admin/AdminUsers.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import {
  Users,
  Filter,
  X,
  Search,
  RefreshCw,
  ChevronDown,
  Eye,
  AlertCircle,
  Trash2,
  Mail,
  Send,
  Paperclip,
  CheckCircle2,
  Circle,
  CheckCheck,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useSelector } from "react-redux";
import {
  useGetAllUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
} from "../../features/adminApiSlice";
import { useSendMessageMutation } from "../../features/messageApiSlice";
import { buildEmailHtml } from "../../utils/buildEmailHtml";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminBottombar from "../../components/admin/Bottombar";

// ═══════════════════════════════════════════════════════════
//  Top-level components (stable references — inputs keep focus)
// ═══════════════════════════════════════════════════════════

const CustomDropdown = ({
  value,
  options,
  onChange,
  placeholder,
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
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
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#13ec5b]/50 disabled:opacity-60"
      >
        <span className="truncate">{display}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
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
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition truncate ${
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

const FilterDropdown = ({ label, value, options, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
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
        <span className="truncate">{display}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
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
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition truncate ${
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
//  Message templates (prefilled — edit or just send)
// ═══════════════════════════════════════════════════════════
const CONTACT_EMAIL = "flanorx1@gmail.com";
const BASE_URL = "https://web.flanorx.com";

const USER_TEMPLATES = {
  // Regular customers — welcome + share-the-link nudge
  user: {
    subject: "Welcome to Flanorx — fuel & gas, delivered",
    body: `Hi there,

Thanks for being part of Flanorx. We're building a simpler, faster way to get fuel and gas delivered straight to your door — no queues, no stress, no wasted time.

Your account is all set. You can order fuel or gas anytime from the app, track your delivery in real time, and manage everything from one place.

Know someone who'd love Flanorx too? Feel free to share the link below — it means a lot to us.

${BASE_URL}

If you ever need help, just reply to this email or reach us at ${CONTACT_EMAIL}.

Warm regards,
The Flanorx Team`,
    ctaLabel: "Open Flanorx",
    ctaUrl: `${BASE_URL}/dashboard`,
  },

  // Riders — quick check-in, point them to their dashboard
  rider: {
    subject: "A quick update for our riders",
    body: `Hi there,

Thanks for riding with Flanorx. We wanted to check in and share a quick update.

You can view your deliveries, track your earnings, and manage your rider profile anytime from your rider dashboard.

If anything's unclear or you need help, just reply to this email or reach us at ${CONTACT_EMAIL}.

Ride safe,
The Flanorx Team`,
    ctaLabel: "Rider Dashboard",
    ctaUrl: `${BASE_URL}/rider/dashboard`,
  },

  // Admins — internal, restrained
  admin: {
    subject: "Flanorx admin update",
    body: `Hi there,

A quick update from the Flanorx team.

Everything you need to manage the platform is available from your admin dashboard.

If you need anything, just reply to this email or reach us at ${CONTACT_EMAIL}.

Best,
The Flanorx Team`,
    ctaLabel: "Admin Dashboard",
    ctaUrl: `${BASE_URL}/superuser/dashboard`,
  },
};

// ═══════════════════════════════════════════════════════════
//  Role-change notification templates
//  Fires automatically after an admin updates someone's role.
// ═══════════════════════════════════════════════════════════
const ROLE_CHANGE_TEMPLATES = {
  user: {
    subject: "Your Flanorx account has been updated",
    body: `Hi there,

Quick heads-up — your Flanorx account role has been updated to Customer.

You can continue to place orders, track deliveries, and manage everything from your dashboard.

If you have any questions, just reply to this email or reach us at ${CONTACT_EMAIL}.

Warm regards,
The Flanorx Team`,
    ctaLabel: "Open Flanorx",
    ctaUrl: `${BASE_URL}/dashboard`,
  },

  rider: {
    subject: "You're now a rider on Flanorx 🎉",
    body: `Hi there,

Great news — your Flanorx account has been upgraded to Rider.

You can now view available deliveries, track your earnings, and manage your rider profile from your rider dashboard.

If anything's unclear or you need help, just reply to this email or reach us at ${CONTACT_EMAIL}.

Ride safe,
The Flanorx Team`,
    ctaLabel: "Rider Dashboard",
    ctaUrl: `${BASE_URL}/rider/dashboard`,
  },

  admin: {
    subject: "You've been granted admin access on Flanorx",
    body: `Hi there,

Your Flanorx account has been upgraded to Admin.

You now have access to the admin dashboard where you can manage orders, users, riders, and stations.

If you need anything, just reply to this email or reach us at ${CONTACT_EMAIL}.

Best,
The Flanorx Team`,
    ctaLabel: "Admin Dashboard",
    ctaUrl: `${BASE_URL}/superuser/dashboard`,
  },
};

// Fallback for mixed-role selections
const GENERIC_TEMPLATE = {
  subject: "An update from Flanorx",
  body: `Hi there,

A quick update from all of us at Flanorx. Thanks for being part of the journey.

If you have any questions or feedback, just reply to this email or reach us at ${CONTACT_EMAIL}.

Warm regards,
The Flanorx Team`,
  ctaLabel: "Visit Flanorx",
  ctaUrl: BASE_URL,
};

// ═══════════════════════════════════════════════════════════
//  User Detail Modal
// ═══════════════════════════════════════════════════════════
const UserDetailModal = ({
  user,
  onClose,
  roleOptions,
  updateLoading,
  deleteLoading,
  onRoleUpdate,
  onSendMessage,
  onDeleteRequest,
  getRoleBadgeColor,
  getVerificationBadgeColor,
}) => {
  const [localRole, setLocalRole] = useState(user.role || "user");

  useEffect(() => {
    setLocalRole(user.role || "user");
  }, [user._id, user.role]);

  const handleRoleChange = (val) => {
    setLocalRole(val);
    onRoleUpdate(user._id, val);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full p-6 rounded-t-2xl max-h-[85vh] overflow-y-auto lg:max-w-md lg:rounded-2xl lg:mb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3
            className="text-lg font-bold text-gray-900 dark:text-white truncate"
            title={user.name}
          >
            {user.name || "User"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <p className="text-gray-500 dark:text-gray-400 text-xs">Email</p>
              <p
                className="text-gray-900 dark:text-white truncate"
                title={user.email}
              >
                {user.email || "—"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 dark:text-gray-400 text-xs">Phone</p>
              <p className="text-gray-900 dark:text-white truncate">
                {user.phone || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Role</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                  user.role
                )}`}
              >
                {user.role || "user"}
              </span>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Verified</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getVerificationBadgeColor(
                  user.isVerified
                )}`}
              >
                {user.isVerified ? "Verified" : "Unverified"}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              Update Role
            </p>
            <CustomDropdown
              value={localRole}
              options={roleOptions.filter((opt) => opt.value !== "")}
              onChange={handleRoleChange}
              placeholder="Select role"
              disabled={updateLoading}
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
            <button
              onClick={onSendMessage}
              className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Send Message
            </button>
            <button
              onClick={onDeleteRequest}
              disabled={deleteLoading}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {deleteLoading ? "Deleting..." : "Delete User"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConfirmDeleteModal = ({ user, onCancel, onConfirm, isDeleting }) => {
  if (!user) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => !isDeleting && onCancel()}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Delete this user?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {user.name || "This user"}
              </span>{" "}
              will be permanently removed. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Main component
// ═══════════════════════════════════════════════════════════

const AdminUsers = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  // ─── Filters state ─────────────────────────────────────────
  const [filters, setFilters] = useState({
    role: "",
    isVerified: "",
    search: "",
  });
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // ─── Delete confirmation state ────────────────────────────
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);

  // ─── Selection state ──────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showMessageModal, setShowMessageModal] = useState(false);

  // ─── Message context (for modal header) ──────────────────
  // "role-change" | "bulk" | "user" | null
  const [messageContext, setMessageContext] = useState(null);

  // ─── Long-press refs ──────────────────────────────────────
  const longPressTimer = useRef(null);
  const suppressClick = useRef(false);

  // ─── Message form state (includes CTA) ────────────────────
  const [messageForm, setMessageForm] = useState({
    subject: "",
    body: "",
    attachments: [],
    ctaLabel: "",
    ctaUrl: "",
  });

  // ─── Queries & Mutations ──────────────────────────────────
  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useGetAllUsersQuery({
    role: filters.role || undefined,
    isVerified:
      filters.isVerified === ""
        ? undefined
        : filters.isVerified === "verified",
    search: filters.search || undefined,
  });

  const [updateUserRole, { isLoading: updateLoading }] =
    useUpdateUserRoleMutation();
  const [deleteUser, { isLoading: deleteLoading }] = useDeleteUserMutation();
  const [sendMessage, { isLoading: sendingMessage }] =
    useSendMessageMutation();

  // ─── Escape key exits selection mode ─────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && selectionMode && !showMessageModal) {
        exitSelectionMode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionMode, showMessageModal]);

  // ─── Selection helpers ────────────────────────────────────
  const enterSelectionMode = (userId) => {
    setSelectionMode(true);
    setSelectedIds(new Set([userId]));
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setMessageContext(null);
  };

  const toggleSelection = (userId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(users.map((u) => u._id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const allSelected = users.length > 0 && selectedIds.size === users.length;

  const toggleSelectAll = () => {
    if (allSelected) deselectAll();
    else selectAll();
  };

  // ─── Row interactions ─────────────────────────────────────
  const handleRowClick = (user) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (selectionMode) {
      toggleSelection(user._id);
    } else {
      setSelectedUser(user);
    }
  };

  const handleContextMenu = (e, user) => {
    e.preventDefault();
    if (!selectionMode) {
      enterSelectionMode(user._id);
    } else {
      toggleSelection(user._id);
    }
  };

  const handleTouchStart = (userId) => {
    suppressClick.current = false;
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      suppressClick.current = true;
      if (!selectionMode) enterSelectionMode(userId);
      else toggleSelection(userId);
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const handleTouchMove = () => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  // ─── Filter options ────────────────────────────────────────
  const roleOptions = [
    { value: "", label: "All Roles" },
    { value: "user", label: "User" },
    { value: "rider", label: "Rider" },
    { value: "admin", label: "Admin" },
  ];

  const verificationOptions = [
    { value: "", label: "All" },
    { value: "verified", label: "Verified" },
    { value: "unverified", label: "Unverified" },
  ];

  // ─── Filter handlers ──────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ role: "", isVerified: "", search: "" });
  };

  // ─── Role update handler (auto-opens role-change email) ──
  const handleRoleUpdate = async (userId, newRole) => {
    // Skip if nothing actually changed (dropdown reselected same value)
    const current = users.find((u) => u._id === userId);
    if (current?.role === newRole) return;

    try {
      await updateUserRole({ id: userId, role: newRole }).unwrap();
      refetch();
      toast.success("Role updated");

      // ── Auto-open the message modal with a prefilled role-change
      //    email. Admin can edit or just hit Send. Closing the
      //    modal skips the email — role update is already done.
      setSelectedIds(new Set([userId]));
      setSelectionMode(true);
      setMessageContext("role-change");

      const template = ROLE_CHANGE_TEMPLATES[newRole] || GENERIC_TEMPLATE;
      prefillFromTemplate(template);
      setShowMessageModal(true);

      // Close the detail modal if it was open
      setSelectedUser(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update user role");
    }
  };

  // ─── Delete request / confirm ─────────────────────────────
  const requestDeleteUser = (user) => {
    setPendingDeleteUser(user);
  };

  const confirmDeleteUser = async () => {
    if (!pendingDeleteUser) return;
    try {
      await deleteUser(pendingDeleteUser._id).unwrap();
      toast.success("User deleted");
      refetch();
      setPendingDeleteUser(null);
      setSelectedUser(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete user");
    }
  };

  // ─── Template picker ──────────────────────────────────────
  const pickTemplateForSelection = () => {
    const selected = users.filter((u) => selectedIds.has(u._id));
    const roles = new Set(selected.map((u) => u.role || "user"));
    if (roles.size === 1) {
      const role = Array.from(roles)[0];
      return USER_TEMPLATES[role] || GENERIC_TEMPLATE;
    }
    return GENERIC_TEMPLATE;
  };

  const prefillFromTemplate = (template) => {
    setMessageForm({
      subject: template.subject,
      body: template.body,
      attachments: [],
      ctaLabel: template.ctaLabel || "",
      ctaUrl: template.ctaUrl || "",
    });
  };

  // Open the modal from the selection bar (bulk)
  const openMessageForSelection = () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one recipient");
      return;
    }
    setMessageContext("bulk");
    prefillFromTemplate(pickTemplateForSelection());
    setShowMessageModal(true);
  };

  // Open from a single user's detail modal
  const openMessageForUser = (user) => {
    setSelectedIds(new Set([user._id]));
    setSelectionMode(true);
    setMessageContext("user");
    const template = USER_TEMPLATES[user.role || "user"] || GENERIC_TEMPLATE;
    prefillFromTemplate(template);
    setShowMessageModal(true);
    setSelectedUser(null);
  };

  // ─── Bulk message: all users of a given role ─────────────
  const handleBulkRoleMessage = (role) => {
    const matching = users.filter((u) => (u.role || "user") === role);
    if (matching.length === 0) {
      toast.error("No users with this role");
      return;
    }
    setSelectedIds(new Set(matching.map((u) => u._id)));
    setSelectionMode(true);
    setMessageContext("bulk");
    const template = USER_TEMPLATES[role] || GENERIC_TEMPLATE;
    prefillFromTemplate(template);
    setShowMessageModal(true);
  };

  // ─── Message send handler ─────────────────────────────────
  const handleSendMessage = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one recipient");
      return;
    }
    if (!messageForm.subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!messageForm.body.trim()) {
      toast.error("Message body is required");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("userIds", JSON.stringify(Array.from(selectedIds)));
      fd.append("subject", messageForm.subject.trim());

      const plainText = messageForm.body.trim();
      const htmlBody = buildEmailHtml({
        body: plainText,
        subject: messageForm.subject.trim(),
        preheader: messageForm.subject.trim(),
        ctaLabel: messageForm.ctaLabel?.trim() || undefined,
        ctaUrl: messageForm.ctaUrl?.trim() || undefined,
      });

      fd.append("text", plainText);
      fd.append("html", htmlBody);

      messageForm.attachments.forEach((file) =>
        fd.append("attachments", file)
      );

      const result = await sendMessage(fd).unwrap();
      toast.success(result?.message || "Message sent successfully");
      setShowMessageModal(false);
      setMessageForm({
        subject: "",
        body: "",
        attachments: [],
        ctaLabel: "",
        ctaUrl: "",
      });
      exitSelectionMode();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to send message");
    }
  };

  // ─── Attachment helpers ───────────────────────────────────
  const handleAttachmentAdd = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - messageForm.attachments.length;
    if (files.length > remaining) {
      toast.error(`You can attach up to 5 files`);
    }
    const accepted = files.slice(0, remaining);
    setMessageForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...accepted],
    }));
    e.target.value = "";
  };

  const removeAttachment = (idx) => {
    setMessageForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== idx),
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ─── Status/role colors ──────────────────────────────────
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "rider":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getVerificationBadgeColor = (isVerified) =>
    isVerified
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";

  // ═══════════════════════════════════════════════════════════
  //  Render functions
  // ═══════════════════════════════════════════════════════════

  // ─── Quick message chips (bulk by role) ──────────────────
  const renderQuickMessageChips = () => {
    const chips = [
      { role: "user", label: "Users" },
      { role: "rider", label: "Riders" },
      { role: "admin", label: "Admins" },
    ]
      .map((c) => ({
        ...c,
        count: users.filter((u) => (u.role || "user") === c.role).length,
      }))
      .filter((c) => c.count > 0);

    if (chips.length === 0) return null;

    return (
      <div className="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-3">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-4 w-4 text-[#13ec5b] flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Quick message
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">
            — send to all users by role
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.role}
              onClick={() => handleBulkRoleMessage(chip.role)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-[#13ec5b] hover:text-[#0f9c46] dark:hover:text-[#13ec5b] transition"
            >
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{chip.label}</span>
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-[10px] font-bold">
                {chip.count}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderFilterSheet = () => (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setShowFilterSheet(false)}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full p-6 rounded-t-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Filter Users
          </h3>
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
              Role
            </label>
            <div className="flex flex-wrap gap-2">
              {roleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange("role", opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.role === opt.value
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
              Verification
            </label>
            <div className="flex flex-wrap gap-2">
              {verificationOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange("isVerified", opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.isVerified === opt.value
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
              autoComplete="off"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 text-sm outline-none"
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

  const renderMessageModal = () => {
    const headerTitle =
      messageContext === "role-change"
        ? "Notify user of role change"
        : messageContext === "user"
        ? "Send Message"
        : "Send Message";

    const headerSubtitle =
      messageContext === "role-change"
        ? `Role updated — ${selectedIds.size} recipient. Email is prefilled below.`
        : `${selectedIds.size} ${
            selectedIds.size === 1 ? "recipient" : "recipients"
          }`;

    return (
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => !sendingMessage && setShowMessageModal(false)}
      >
        <div
          className="bg-white dark:bg-gray-900 w-full max-w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                {headerTitle}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {headerSubtitle}
              </p>
            </div>
            <button
              onClick={() => !sendingMessage && setShowMessageModal(false)}
              disabled={sendingMessage}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 disabled:opacity-50"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={messageForm.subject}
                onChange={(e) =>
                  setMessageForm((f) => ({ ...f, subject: e.target.value }))
                }
                placeholder="e.g. Welcome to Flanorx"
                disabled={sendingMessage}
                autoComplete="off"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Message
              </label>
              <textarea
                value={messageForm.body}
                onChange={(e) =>
                  setMessageForm((f) => ({ ...f, body: e.target.value }))
                }
                placeholder="Write your message..."
                rows={11}
                disabled={sendingMessage}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none resize-none disabled:opacity-60"
              />
            </div>

            {/* CTA (prefilled, editable) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Button label
                </label>
                <input
                  type="text"
                  value={messageForm.ctaLabel}
                  onChange={(e) =>
                    setMessageForm((f) => ({ ...f, ctaLabel: e.target.value }))
                  }
                  placeholder="Optional"
                  disabled={sendingMessage}
                  autoComplete="off"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Button URL
                </label>
                <input
                  type="url"
                  value={messageForm.ctaUrl}
                  onChange={(e) =>
                    setMessageForm((f) => ({ ...f, ctaUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  disabled={sendingMessage}
                  autoComplete="off"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Attachments
                </label>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {messageForm.attachments.length}/5
                </span>
              </div>

              {messageForm.attachments.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {messageForm.attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg min-w-0"
                    >
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium text-gray-900 dark:text-white truncate"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeAttachment(idx)}
                        disabled={sendingMessage}
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {messageForm.attachments.length < 5 && (
                <label className="flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
                  <Paperclip className="h-3.5 w-3.5" />
                  Attach files
                  <input
                    type="file"
                    multiple
                    onChange={handleAttachmentAdd}
                    disabled={sendingMessage}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => !sendingMessage && setShowMessageModal(false)}
                disabled={sendingMessage}
                className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={
                  sendingMessage ||
                  !messageForm.subject.trim() ||
                  !messageForm.body.trim()
                }
                className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingMessage ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSelectionBar = () => {
    if (!selectionMode || showMessageModal) return null;

    return (
      <div className="fixed left-0 right-0 bottom-0 z-40 px-3 pb-3 pt-2 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto bg-gray-900 dark:bg-gray-800 border border-gray-800 dark:border-gray-700 rounded-2xl shadow-2xl px-3 py-2.5 flex items-center gap-2">
          <button
            onClick={exitSelectionMode}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition flex-shrink-0"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>

          <span className="text-sm font-medium text-white truncate min-w-0 flex-1">
            {selectedIds.size} selected
          </span>

          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/10 transition flex-shrink-0"
            title={allSelected ? "Deselect all" : "Select all"}
          >
            {allSelected ? (
              <>
                <Circle className="h-3.5 w-3.5" />
                <span className="hidden xs:inline sm:inline">None</span>
              </>
            ) : (
              <>
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden xs:inline sm:inline">All</span>
              </>
            )}
          </button>

          <button
            onClick={openMessageForSelection}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg text-xs font-semibold transition flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      </div>
    );
  };

  const renderSlimUserItem = (user) => {
    const isSelected = selectedIds.has(user._id);

    return (
      <div
        key={user._id}
        onClick={() => handleRowClick(user)}
        onContextMenu={(e) => handleContextMenu(e, user)}
        onTouchStart={() => handleTouchStart(user._id)}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition select-none last:border-b-0 ${
          isSelected
            ? "bg-[#13ec5b]/10 dark:bg-[#13ec5b]/10"
            : "hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-600"
        }`}
      >
        {selectionMode && (
          <div className="flex-shrink-0 mr-3">
            {isSelected ? (
              <CheckCircle2 className="h-5 w-5 text-[#13ec5b]" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="font-medium text-gray-900 dark:text-white text-sm truncate"
              title={user.name}
            >
              {user.name || "Unknown"}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${getRoleBadgeColor(
                user.role
              )}`}
            >
              {user.role || "user"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 min-w-0">
            <span
              className="text-xs text-gray-500 dark:text-gray-400 truncate min-w-0"
              title={user.email}
            >
              {user.email || ""}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${getVerificationBadgeColor(
                user.isVerified
              )}`}
            >
              {user.isVerified ? "✓" : "✗"}
            </span>
          </div>
        </div>

        {!selectionMode && (
          <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg] flex-shrink-0 ml-2" />
        )}
      </div>
    );
  };

  const anyModalOpen = !!selectedUser || showFilterSheet || showMessageModal;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />

      <div
        className={`lg:ml-64 ${
          selectionMode ? "pb-32 lg:pb-24" : "pb-20 lg:pb-8"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            {selectionMode ? `${selectedIds.size} selected` : "Users"}
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            {selectionMode ? (
              <button
                onClick={exitSelectionMode}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            ) : (
              <>
                <button
                  onClick={() => refetch()}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  title="Refresh"
                >
                  <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => setShowFilterSheet(true)}
                  className="lg:hidden flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </>
            )}
          </div>
        </header>

        <div className="w-full px-0 sm:px-4 lg:px-6 py-4">
          {/* Desktop filters */}
          <div className="hidden lg:flex flex-wrap items-center gap-3 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <FilterDropdown
              label="Role"
              value={filters.role}
              options={roleOptions}
              onSelect={(v) => handleFilterChange("role", v)}
            />
            <FilterDropdown
              label="Verification"
              value={filters.isVerified}
              options={verificationOptions}
              onSelect={(v) => handleFilterChange("isVerified", v)}
            />
            <div className="flex-1 min-w-[150px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    handleFilterChange("search", e.target.value)
                  }
                  placeholder="Search users..."
                  autoComplete="off"
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 outline-none"
                />
              </div>
            </div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
            >
              Clear
            </button>
          </div>

          {/* Quick message chips */}
          {!isLoading && !selectionMode && renderQuickMessageChips()}

          {/* Selection hint */}
          {!selectionMode && users.length > 0 && (
            <p className="hidden lg:block text-xs text-gray-400 dark:text-gray-500 mb-2 px-1">
              Tip: right-click a user to start selecting multiple.
            </p>
          )}

          {/* Users display */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                {users.length} {users.length === 1 ? "User" : "Users"} found
              </h2>
              {selectionMode && (
                <button
                  onClick={toggleSelectAll}
                  className="text-xs font-medium text-[#0f9c46] dark:text-[#13ec5b] hover:underline flex-shrink-0"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-3 animate-pulse"
                  >
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
                Failed to load users. Please try again.
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No users found
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      {selectionMode && <col className="w-[40px]" />}
                      <col className={selectionMode ? "w-[22%]" : "w-[24%]"} />
                      <col className={selectionMode ? "w-[26%]" : "w-[28%]"} />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className={selectionMode ? "w-[20%]" : "w-[24%]"} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        {selectionMode && (
                          <th className="py-2.5 px-3">
                            <button
                              onClick={toggleSelectAll}
                              className="flex items-center justify-center"
                              title={allSelected ? "Deselect all" : "Select all"}
                            >
                              {allSelected ? (
                                <CheckCircle2 className="h-4 w-4 text-[#13ec5b]" />
                              ) : (
                                <Circle className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </th>
                        )}
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Name
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Email
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Role
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Verified
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const isSelected = selectedIds.has(user._id);
                        return (
                          <tr
                            key={user._id}
                            onClick={() => handleRowClick(user)}
                            onContextMenu={(e) => handleContextMenu(e, user)}
                            className={`border-b border-gray-100 dark:border-gray-700 cursor-pointer transition last:border-b-0 ${
                              isSelected
                                ? "bg-[#13ec5b]/10 dark:bg-[#13ec5b]/10"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            }`}
                          >
                            {selectionMode && (
                              <td className="py-2.5 px-3">
                                {isSelected ? (
                                  <CheckCircle2 className="h-4 w-4 text-[#13ec5b]" />
                                ) : (
                                  <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                                )}
                              </td>
                            )}
                            <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                              <div className="truncate" title={user.name}>
                                {user.name || "Unknown"}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                              <div className="truncate" title={user.email}>
                                {user.email || "—"}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-full ${getRoleBadgeColor(
                                  user.role
                                )}`}
                              >
                                <span className="truncate">
                                  {user.role || "user"}
                                </span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-full ${getVerificationBadgeColor(
                                  user.isVerified
                                )}`}
                              >
                                <span className="truncate">
                                  {user.isVerified
                                    ? "Verified"
                                    : "Unverified"}
                                </span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {selectionMode ? (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {isSelected ? "Selected" : "Tap to select"}
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedUser(user);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                    title="View details"
                                  >
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  </button>
                                  <select
                                    value={user.role || "user"}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      handleRoleUpdate(
                                        user._id,
                                        e.target.value
                                      )
                                    }
                                    disabled={updateLoading}
                                    className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#13ec5b]/50"
                                  >
                                    {roleOptions
                                      .filter((opt) => opt.value !== "")
                                      .map((opt) => (
                                        <option
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </option>
                                      ))}
                                  </select>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      requestDeleteUser(user);
                                    }}
                                    disabled={deleteLoading}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-500"
                                    title="Delete user"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Slim List */}
                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {users.map((user) => renderSlimUserItem(user))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Selection bar */}
      {renderSelectionBar()}

      {/* Bottom bar */}
      {!anyModalOpen && !selectionMode && <AdminBottombar />}

      {/* Modals */}
      {showFilterSheet && renderFilterSheet()}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          roleOptions={roleOptions}
          updateLoading={updateLoading}
          deleteLoading={deleteLoading}
          onRoleUpdate={handleRoleUpdate}
          onSendMessage={() => openMessageForUser(selectedUser)}
          onDeleteRequest={() => {
            requestDeleteUser(selectedUser);
          }}
          getRoleBadgeColor={getRoleBadgeColor}
          getVerificationBadgeColor={getVerificationBadgeColor}
        />
      )}
      {showMessageModal && renderMessageModal()}
      {pendingDeleteUser && (
        <ConfirmDeleteModal
          user={pendingDeleteUser}
          onCancel={() => setPendingDeleteUser(null)}
          onConfirm={confirmDeleteUser}
          isDeleting={deleteLoading}
        />
      )}
    </div>
  );
};

export default AdminUsers;