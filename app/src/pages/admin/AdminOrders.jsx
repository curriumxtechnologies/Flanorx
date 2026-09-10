// src/pages/admin/AdminOrders.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import {
  Package,
  Flame,
  ChevronDown,
  Filter,
  X,
  Eye,
  Search,
  RefreshCw,
  AlertCircle,
  Mail,
  Send,
  Paperclip,
  CheckCircle2,
  Circle,
  CheckCheck,
  FileText,
} from "lucide-react";
import {
  useGetAllOrdersQuery,
  useUpdateOrderStatusMutation,
} from "../../features/adminApiSlice";
import { useSendMessageMutation } from "../../features/messageApiSlice";
import { buildEmailHtml } from "../../utils/buildEmailHtml";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminBottombar from "../../components/admin/Bottombar";

// ═══════════════════════════════════════════════════════════
//  Top-level dropdown components (stable references)
// ═══════════════════════════════════════════════════════════
const CustomDropdown = ({ value, options, onChange, placeholder, className = "" }) => {
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
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#13ec5b]/50"
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
//  Message templates per status
//  (includes prefilled button label + URL)
// ═══════════════════════════════════════════════════════════
const CONTACT_EMAIL = "flanorx1@gmail.com";
const BASE_URL = "https://web.flanorx.com";

const STATUS_TEMPLATES = {
  pending: {
    subject: "Complete your Flanorx order",
    body: `Hi there,

We noticed you have a pending order on Flanorx. If you'd like to continue with your purchase, you can complete your payment anytime from your orders page.

If you ran into any issues or changed your mind, no worries — just reply to this email or reach us at ${CONTACT_EMAIL}.

Thanks for choosing Flanorx!`,
    ctaLabel: "Complete Your Order",
    ctaUrl: `${BASE_URL}/orders`,
  },
  processing: {
    subject: "Your Flanorx order is being processed",
    body: `Hi there,

Great news — your Flanorx order is currently being processed. We'll keep you updated as it progresses.

You can follow its progress anytime from your tracking page.

If you have any questions, just reply to this email or reach us at ${CONTACT_EMAIL}.

Thanks for choosing Flanorx!`,
    ctaLabel: "Track Your Order",
    ctaUrl: `${BASE_URL}/tracking`,
  },
  completed: {
    subject: "Thank you for your Flanorx order",
    body: `Hi there,

Thank you for completing your order with Flanorx! We hope everything went smoothly.

If you have any feedback or need assistance, just reply to this email or reach us at ${CONTACT_EMAIL}.

We look forward to serving you again!`,
    ctaLabel: "Order Again",
    ctaUrl: `${BASE_URL}/orders`,
  },
  cancelled: {
    subject: "About your cancelled Flanorx order",
    body: `Hi there,

We noticed your Flanorx order was cancelled. If this was a mistake or you'd like to place a new order, feel free to try again anytime.

If there was an issue, we'd love to hear about it — just reply to this email or reach us at ${CONTACT_EMAIL}.

Thanks for considering Flanorx!`,
    ctaLabel: "Place New Order",
    ctaUrl: `${BASE_URL}/orders`,
  },
  failed: {
    subject: "There was a problem with your Flanorx payment",
    body: `Hi there,

It looks like your Flanorx payment didn't go through. This can happen for a number of reasons — nothing to worry about.

You can try again from your orders page, or if you keep running into issues, just reply to this email or reach us at ${CONTACT_EMAIL} and we'll help you out.

Thanks for choosing Flanorx!`,
    ctaLabel: "Try Again",
    ctaUrl: `${BASE_URL}/orders`,
  },
};

const GENERIC_TEMPLATE = {
  subject: "An update from Flanorx",
  body: `Hi there,

`,
  ctaLabel: "Visit Flanorx",
  ctaUrl: BASE_URL,
};

// ═══════════════════════════════════════════════════════════
//  Order Detail Modal (top-level so it doesn't remount)
// ═══════════════════════════════════════════════════════════
const OrderDetailModal = ({ order, onClose, onNavigate, onStatusUpdate, statusOptions, deliveryOptions, getOrderStatusColor, getStatusColor }) => {
  const [localOrderStatus, setLocalOrderStatus] = useState(order.status || "pending");
  const [localDeliveryStatus, setLocalDeliveryStatus] = useState(order.deliveryStatus || "pending");

  useEffect(() => {
    setLocalOrderStatus(order.status || "pending");
    setLocalDeliveryStatus(order.deliveryStatus || "pending");
  }, [order._id, order.status, order.deliveryStatus]);

  const handleOrderChange = (val) => {
    setLocalOrderStatus(val);
    onStatusUpdate(order._id, val, undefined);
  };

  const handleDeliveryChange = (val) => {
    setLocalDeliveryStatus(val);
    onStatusUpdate(order._id, undefined, val);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full p-6 rounded-t-2xl max-h-[85vh] overflow-y-auto lg:max-w-lg lg:rounded-2xl lg:mb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            Order #{order.orderId || order._id.slice(-6)}
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
              <p className="text-gray-500 dark:text-gray-400 text-xs">Customer</p>
              <p className="text-gray-900 dark:text-white font-medium truncate">
                {order.user?.name || "Unknown"}
              </p>
              <p
                className="text-xs text-gray-500 dark:text-gray-400 truncate"
                title={order.user?.email || ""}
              >
                {order.user?.email || ""}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 dark:text-gray-400 text-xs">Date</p>
              <p className="text-gray-900 dark:text-white truncate">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 dark:text-gray-400 text-xs">Type</p>
              <span className="flex items-center gap-1 capitalize">
                {order.orderType === "fuel" ? (
                  <Flame className="h-4 w-4 text-[#13ec5b] flex-shrink-0" />
                ) : (
                  <Package className="h-4 w-4 text-[#13ec5b] flex-shrink-0" />
                )}
                <span className="truncate">{order.orderType}</span>
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 dark:text-gray-400 text-xs">Total</p>
              <p className="font-bold text-gray-900 dark:text-white truncate">
                ₦{order.totalAmount?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              Order Status
            </p>
            <CustomDropdown
              value={localOrderStatus}
              options={statusOptions}
              onChange={handleOrderChange}
              placeholder="Select status"
            />
          </div>

          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              Delivery Status
            </p>
            <CustomDropdown
              value={localDeliveryStatus}
              options={deliveryOptions}
              onChange={handleDeliveryChange}
              placeholder="Select delivery"
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <p className="text-gray-500 dark:text-gray-400 text-xs">Items</p>
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1 gap-3">
                <span className="truncate">{item.name || `Item ${idx + 1}`}</span>
                <span className="flex-shrink-0">
                  ₦{item.price?.toFixed(2) || "0.00"} x {item.quantity || 1}
                </span>
              </div>
            ))}
            {!order.items?.length && (
              <p className="text-gray-400 dark:text-gray-500 text-xs">
                No items listed
              </p>
            )}
          </div>

          <button
            onClick={() => onNavigate(`/superuser/orders/${order._id}`)}
            className="w-full py-2.5 bg-[#13ec5b] text-white rounded-lg font-medium hover:bg-[#0fc44e] transition"
          >
            View Full Details
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Main component
// ═══════════════════════════════════════════════════════════
const AdminOrders = () => {
  const navigate = useNavigate();

  // ─── Filters state ─────────────────────────────────────────
  const [filters, setFilters] = useState({
    orderType: "",
    status: "",
    deliveryStatus: "",
    month: "",
    year: "",
    search: "",
  });

  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ─── Selection state ──────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState(() => new Set());
  const [showMessageModal, setShowMessageModal] = useState(false);

  // ─── Message form state (now includes CTA) ────────────────
  const [messageForm, setMessageForm] = useState({
    subject: "",
    body: "",
    attachments: [],
    ctaLabel: "",
    ctaUrl: "",
  });

  // ─── Long‑press refs ──────────────────────────────────────
  const longPressTimer = useRef(null);
  const suppressClick = useRef(false);

  // ─── Queries & Mutations ──────────────────────────────────
  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
  } = useGetAllOrdersQuery({
    orderType: filters.orderType || undefined,
    status: filters.status || undefined,
    deliveryStatus: filters.deliveryStatus || undefined,
    month: filters.month || undefined,
    year: filters.year || undefined,
  });

  const [updateOrderStatus, { isLoading: updateLoading }] =
    useUpdateOrderStatusMutation();
  const [sendMessage, { isLoading: sendingMessage }] = useSendMessageMutation();

  // ─── Derived data ──────────────────────────────────────────
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  // ─── Filter options ────────────────────────────────────────
  const orderTypes = [
    { value: "", label: "All Types" },
    { value: "fuel", label: "Fuel" },
    { value: "gas", label: "Gas" },
  ];

  const orderStatuses = [
    { value: "", label: "All Order Status" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "failed", label: "Failed" },
  ];

  const deliveryStatuses = [
    { value: "", label: "All Delivery" },
    { value: "pending", label: "Pending" },
    { value: "accepted", label: "Accepted" },
    { value: "picked_up", label: "Picked Up" },
    { value: "in_transit", label: "In Transit" },
    { value: "delivered", label: "Delivered" },
    { value: "confirmed", label: "Confirmed" },
  ];

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const years = [];
  for (let y = currentYear; y >= currentYear - 4; y--) years.push(y);

  // ─── Filtered orders ───────────────────────────────────────
  const filteredOrders = useMemo(() => {
    if (!filters.search) return orders;
    const searchLower = filters.search.toLowerCase();
    return orders.filter(
      (order) =>
        order.orderId?.toLowerCase().includes(searchLower) ||
        order.user?.name?.toLowerCase().includes(searchLower) ||
        order.user?.email?.toLowerCase().includes(searchLower)
    );
  }, [orders, filters.search]);

  // ─── Escape key exits selection mode ──────────────────────
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
  const enterSelectionMode = (orderId) => {
    setSelectionMode(true);
    setSelectedOrderIds(new Set([orderId]));
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedOrderIds(new Set());
  };

  const toggleSelection = (orderId) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedOrderIds(new Set(filteredOrders.map((o) => o._id)));
  };

  const deselectAll = () => {
    setSelectedOrderIds(new Set());
  };

  const allSelected =
    filteredOrders.length > 0 &&
    selectedOrderIds.size === filteredOrders.length;

  const toggleSelectAll = () => {
    if (allSelected) deselectAll();
    else selectAll();
  };

  // ─── Row interactions ─────────────────────────────────────
  const handleRowClick = (order) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (selectionMode) {
      toggleSelection(order._id);
    } else {
      setSelectedOrder(order);
    }
  };

  const handleContextMenu = (e, order) => {
    e.preventDefault();
    if (!selectionMode) {
      enterSelectionMode(order._id);
    } else {
      toggleSelection(order._id);
    }
  };

  const handleTouchStart = (orderId) => {
    suppressClick.current = false;
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      suppressClick.current = true;
      if (!selectionMode) enterSelectionMode(orderId);
      else toggleSelection(orderId);
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

  // ─── Filter handlers ──────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      orderType: "",
      status: "",
      deliveryStatus: "",
      month: "",
      year: "",
      search: "",
    });
  };

  // ─── Status update handler ─────────────────────────────────
  const handleStatusUpdate = async (orderId, newStatus, deliveryStatus) => {
    try {
      await updateOrderStatus({ id: orderId, status: newStatus, deliveryStatus }).unwrap();
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update order status");
    }
  };

  // ─── Extract unique emails from selected orders ───────────
  const getRecipientEmails = () => {
    const emails = new Set();
    selectedOrderIds.forEach((orderId) => {
      const order = orders.find((o) => o._id === orderId);
      const email = order?.user?.email;
      if (email) emails.add(email.toLowerCase().trim());
    });
    return Array.from(emails);
  };

  // ─── Bulk status message handler ──────────────────────────
  const handleBulkStatusMessage = (status) => {
    const matching = filteredOrders.filter((o) => o.status === status);
    if (matching.length === 0) {
      toast.error("No orders with this status");
      return;
    }
    const ids = new Set(matching.map((o) => o._id));
    setSelectedOrderIds(ids);
    setSelectionMode(true);
    const template = STATUS_TEMPLATES[status] || GENERIC_TEMPLATE;
    setMessageForm({
      subject: template.subject,
      body: template.body,
      attachments: [],
      ctaLabel: template.ctaLabel || "",
      ctaUrl: template.ctaUrl || "",
    });
    setShowMessageModal(true);
  };

  // ─── Manual selection → pick template by status ───────────
  const openMessageForSelection = () => {
    if (selectedOrderIds.size === 0) {
      toast.error("Select at least one order");
      return;
    }
    // If every selected order has the same status, use that template
    const selectedOrders = filteredOrders.filter((o) =>
      selectedOrderIds.has(o._id)
    );
    const uniqueStatuses = new Set(selectedOrders.map((o) => o.status));
    const template =
      uniqueStatuses.size === 1
        ? STATUS_TEMPLATES[Array.from(uniqueStatuses)[0]] || GENERIC_TEMPLATE
        : GENERIC_TEMPLATE;

    setMessageForm({
      subject: template.subject,
      body: template.body,
      attachments: [],
      ctaLabel: template.ctaLabel || "",
      ctaUrl: template.ctaUrl || "",
    });
    setShowMessageModal(true);
  };

  // ─── Send message handler ─────────────────────────────────
  const handleSendMessage = async () => {
    const emails = getRecipientEmails();
    if (emails.length === 0) {
      toast.error("No recipients found for the selected orders");
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
      fd.append("emails", JSON.stringify(emails));
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

      messageForm.attachments.forEach((file) => fd.append("attachments", file));

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

  // ─── Status colors ────────────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "accepted": return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "picked_up": return "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20";
      case "in_transit": return "text-purple-600 bg-purple-50 dark:bg-purple-900/20";
      case "delivered": return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "confirmed": return "text-green-700 bg-green-100 dark:bg-green-900/30";
      case "completed": return "text-green-700 bg-green-100 dark:bg-green-900/30";
      case "cancelled": return "text-red-600 bg-red-50 dark:bg-red-900/20";
      case "failed": return "text-red-700 bg-red-100 dark:bg-red-900/30";
      default: return "text-gray-600 bg-gray-50 dark:bg-gray-800";
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case "pending": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "processing": return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "completed": return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "cancelled": return "text-red-600 bg-red-50 dark:bg-red-900/20";
      case "failed": return "text-red-700 bg-red-100 dark:bg-red-900/30";
      default: return "text-gray-600 bg-gray-50 dark:bg-gray-800";
    }
  };

  const statusOptions = [
    { label: "Pending", value: "pending" },
    { label: "Processing", value: "processing" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Failed", value: "failed" },
  ];

  const deliveryOptions = [
    { label: "Pending", value: "pending" },
    { label: "Accepted", value: "accepted" },
    { label: "Picked Up", value: "picked_up" },
    { label: "In Transit", value: "in_transit" },
    { label: "Delivered", value: "delivered" },
    { label: "Confirmed", value: "confirmed" },
  ];

  // ═══════════════════════════════════════════════════════════
  //  Render helpers
  // ═══════════════════════════════════════════════════════════

  // ─── Quick message chips (bulk by status) ─────────────────
  const renderQuickMessageChips = () => {
    const chips = orderStatuses
      .filter((opt) => opt.value)
      .map((opt) => ({
        status: opt.value,
        label: opt.label,
        count: filteredOrders.filter((o) => o.status === opt.value).length,
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
            — send to all orders by status
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.status}
              onClick={() => handleBulkStatusMessage(chip.status)}
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

  // ─── Filter Sheet (mobile) ────────────────────────────────
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
            Filter Orders
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
              Order Type
            </label>
            <div className="flex flex-wrap gap-2">
              {orderTypes.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange("orderType", opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.orderType === opt.value
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
              Order Status
            </label>
            <div className="flex flex-wrap gap-2">
              {orderStatuses.map((opt) => (
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
              Delivery Status
            </label>
            <div className="flex flex-wrap gap-2">
              {deliveryStatuses.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange("deliveryStatus", opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.deliveryStatus === opt.value
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
              Month
            </label>
            <div className="flex flex-wrap gap-2">
              {months.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFilterChange("month", idx + 1)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.month === idx + 1
                      ? "bg-[#13ec5b] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Year
            </label>
            <div className="flex flex-wrap gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => handleFilterChange("year", y)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.year === y
                      ? "bg-[#13ec5b] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {y}
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
              placeholder="Order ID or customer name..."
              autoComplete="off"
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

  // ─── Message Modal ────────────────────────────────────────
  const renderMessageModal = () => (
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
              Send Message
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {selectedOrderIds.size}{" "}
              {selectedOrderIds.size === 1 ? "order" : "orders"} ·{" "}
              {getRecipientEmails().length}{" "}
              {getRecipientEmails().length === 1 ? "recipient" : "recipients"}
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
              placeholder="e.g. Complete your Flanorx order"
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
              rows={9}
              disabled={sendingMessage}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none resize-none disabled:opacity-60"
            />
          </div>

          {/* CTA (optional) */}
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

  // ─── Selection Bar (floating) ─────────────────────────────
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
            {selectedOrderIds.size} selected
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
            disabled={selectedOrderIds.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#13ec5b] hover:bg-[#10d04e] text-gray-900 rounded-lg text-xs font-semibold transition flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      </div>
    );
  };

  // ─── Mobile Slim List Item ────────────────────────────────
  const SlimOrderItem = ({ order }) => {
    const isSelected = selectedOrderIds.has(order._id);

    return (
      <div
        onClick={() => handleRowClick(order)}
        onContextMenu={(e) => handleContextMenu(e, order)}
        onTouchStart={() => handleTouchStart(order._id)}
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
              title={`#${order.orderId || order._id.slice(-6)}`}
            >
              #{order.orderId || order._id.slice(-6)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {order.user?.name || "Unknown"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 min-w-0">
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              ₦{order.totalAmount?.toFixed(2) || "0.00"}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${getOrderStatusColor(
                order.status
              )}`}
            >
              {order.status || "pending"}
            </span>
          </div>
        </div>

        {!selectionMode && (
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(
                order.deliveryStatus || "pending"
              )}`}
            >
              {order.deliveryStatus || "pending"}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg]" />
          </div>
        )}
      </div>
    );
  };

  const anyModalOpen = !!selectedOrder || showFilterSheet || showMessageModal;

  // ═══════════════════════════════════════════════════════════
  //  Render
  // ═══════════════════════════════════════════════════════════
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
            {selectionMode
              ? `${selectedOrderIds.size} selected`
              : "Orders"}
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
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
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

        <div className="w-full px-1 sm:px-4 lg:px-6 py-4">
          {/* Desktop filters */}
          <div className="hidden lg:flex flex-wrap items-center gap-3 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <FilterDropdown
              label="Order Type"
              value={filters.orderType}
              options={orderTypes}
              onSelect={(v) => handleFilterChange("orderType", v)}
            />
            <FilterDropdown
              label="Order Status"
              value={filters.status}
              options={orderStatuses}
              onSelect={(v) => handleFilterChange("status", v)}
            />
            <FilterDropdown
              label="Delivery Status"
              value={filters.deliveryStatus}
              options={deliveryStatuses}
              onSelect={(v) => handleFilterChange("deliveryStatus", v)}
            />
            <FilterDropdown
              label="Month"
              value={filters.month}
              options={months.map((m, idx) => ({ value: idx + 1, label: m }))}
              onSelect={(v) => handleFilterChange("month", v)}
            />
            <FilterDropdown
              label="Year"
              value={filters.year}
              options={years.map((y) => ({ value: y, label: y }))}
              onSelect={(v) => handleFilterChange("year", v)}
            />
            <div className="flex-1 min-w-[150px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="Search orders..."
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

          {/* Selection hint (desktop) */}
          {!selectionMode && !isLoading && filteredOrders.length > 0 && (
            <p className="hidden lg:block text-xs text-gray-400 dark:text-gray-500 mb-2 px-1">
              Tip: right‑click an order to start selecting multiple.
            </p>
          )}

          {/* Orders container */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1 ? "Order" : "Orders"} found
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
                    <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                    </div>
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                Failed to load orders. Please try again.
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No orders found</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      {selectionMode && <col className="w-[40px]" />}
                      <col className={selectionMode ? "w-[15%]" : "w-[17%]"} />
                      <col className={selectionMode ? "w-[20%]" : "w-[22%]"} />
                      <col className={selectionMode ? "w-[9%]" : "w-[10%]"} />
                      <col className={selectionMode ? "w-[11%]" : "w-[12%]"} />
                      <col className={selectionMode ? "w-[13%]" : "w-[14%]"} />
                      <col className={selectionMode ? "w-[13%]" : "w-[14%]"} />
                      <col className={selectionMode ? "w-[19%]" : "w-[21%]"} />
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
                          Order
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Customer
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Type
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Amount
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Order Status
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Delivery
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => {
                        const isSelected = selectedOrderIds.has(order._id);
                        return (
                          <tr
                            key={order._id}
                            onClick={() => handleRowClick(order)}
                            onContextMenu={(e) => handleContextMenu(e, order)}
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
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-gray-900 dark:text-white truncate block">
                                #{order.orderId || order._id.slice(-6)}
                              </span>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="py-2.5 px-3">
                              <p className="text-gray-900 dark:text-white truncate">
                                {order.user?.name || "Unknown"}
                              </p>
                              <p
                                className="text-xs text-gray-500 dark:text-gray-400 truncate"
                                title={order.user?.email || ""}
                              >
                                {order.user?.email || ""}
                              </p>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="flex items-center gap-1 capitalize">
                                {order.orderType === "fuel" ? (
                                  <Flame className="h-4 w-4 text-[#13ec5b] flex-shrink-0" />
                                ) : (
                                  <Package className="h-4 w-4 text-[#13ec5b] flex-shrink-0" />
                                )}
                                <span className="truncate">{order.orderType}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                              <div className="truncate">
                                ₦{order.totalAmount?.toFixed(2) || "0.00"}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium max-w-full ${getOrderStatusColor(
                                  order.status
                                )}`}
                              >
                                <span className="truncate">
                                  {order.status || "pending"}
                                </span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium max-w-full ${getStatusColor(
                                  order.deliveryStatus || "pending"
                                )}`}
                              >
                                <span className="truncate">
                                  {order.deliveryStatus || "pending"}
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
                                      navigate(`/superuser/orders/${order._id}`);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                                    title="View details"
                                  >
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  </button>
                                  <select
                                    value={order.status || "pending"}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      handleStatusUpdate(
                                        order._id,
                                        e.target.value,
                                        undefined
                                      )
                                    }
                                    disabled={updateLoading}
                                    className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#13ec5b]/50"
                                  >
                                    {statusOptions.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile slim list */}
                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredOrders.map((order) => (
                    <SlimOrderItem key={order._id} order={order} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Selection bar (floating) */}
      {renderSelectionBar()}

      {/* Bottombar — hidden when modal or selection mode active */}
      {!anyModalOpen && !selectionMode && <AdminBottombar />}

      {/* Modals */}
      {showFilterSheet && renderFilterSheet()}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onNavigate={navigate}
          onStatusUpdate={handleStatusUpdate}
          statusOptions={statusOptions}
          deliveryOptions={deliveryOptions}
          getOrderStatusColor={getOrderStatusColor}
          getStatusColor={getStatusColor}
        />
      )}
      {showMessageModal && renderMessageModal()}
    </div>
  );
};

export default AdminOrders;