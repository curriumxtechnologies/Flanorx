// src/pages/admin/Waitlist.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Users,
  MapPin,
  Briefcase,
  Package,
  Search,
  X,
  ChevronRight,
  AlertCircle,
  Download,
  Flame,
  Truck,
  Home,
  Building2,
  RefreshCw,
  Clock,
  Mail,
  Phone,
  Filter,
  Send,
  Paperclip,
  CheckCircle2,
  Circle,
  CheckCheck,
  FileText,
} from "lucide-react";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminBottombar from "../../components/admin/Bottombar";
import {
  useGetWaitlistEntriesQuery,
  useGetWaitlistStatsQuery,
} from "../../features/waitlistApiSlice";
import { useSendMessageMutation } from "../../features/messageApiSlice";

const Waitlist = () => {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // ─── Selection state (for bulk messaging) ─────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showMessageModal, setShowMessageModal] = useState(false);

  // ─── Long‑press refs ──────────────────────────────────────
  const longPressTimer = useRef(null);
  const suppressClick = useRef(false);

  // ─── Message form state ───────────────────────────────────
  const [messageForm, setMessageForm] = useState({
    subject: "",
    body: "",
    attachments: [],
  });

  // ─── Queries ──────────────────────────────────────────────
  const {
    data: entries = [],
    isLoading: entriesLoading,
    error: entriesError,
    refetch: refetchEntries,
    isFetching: entriesFetching,
  } = useGetWaitlistEntriesQuery();

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useGetWaitlistStatsQuery();

  const [sendMessage, { isLoading: sendingMessage }] =
    useSendMessageMutation();

  const isLoading = entriesLoading || statsLoading;
  const error = entriesError || statsError;

  // ─── Derived data ─────────────────────────────────────────
  const cities = useMemo(() => {
    if (!entries.length) return [];
    const set = new Set(entries.map((e) => e.city).filter(Boolean));
    return Array.from(set).sort();
  }, [entries]);

  const userTypes = useMemo(() => {
    if (!entries.length) return [];
    const set = new Set(entries.map((e) => e.userType).filter(Boolean));
    return Array.from(set).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (cityFilter !== "all" && entry.city !== cityFilter) return false;
      if (userTypeFilter !== "all" && entry.userType !== userTypeFilter)
        return false;
      if (!q) return true;
      return (
        entry.fullName?.toLowerCase().includes(q) ||
        entry.email?.toLowerCase().includes(q) ||
        entry.phone?.toLowerCase().includes(q) ||
        entry.city?.toLowerCase().includes(q)
      );
    });
  }, [entries, search, cityFilter, userTypeFilter]);

  const hasActiveFilters =
    search.trim() !== "" || cityFilter !== "all" || userTypeFilter !== "all";

  const activeFilterCount =
    (cityFilter !== "all" ? 1 : 0) + (userTypeFilter !== "all" ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setCityFilter("all");
    setUserTypeFilter("all");
  };

  const topCity = stats?.cityBreakdown?.[0]?._id || "—";
  const topUserType = stats?.userTypeBreakdown?.[0]?._id || "—";

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
  const enterSelectionMode = (entryId) => {
    setSelectionMode(true);
    setSelectedIds(new Set([entryId]));
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelection = (entryId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredEntries.map((e) => e._id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const allSelected =
    filteredEntries.length > 0 && selectedIds.size === filteredEntries.length;

  const toggleSelectAll = () => {
    if (allSelected) deselectAll();
    else selectAll();
  };

  // ─── Row interactions ─────────────────────────────────────
  const handleRowClick = (entry) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (selectionMode) {
      toggleSelection(entry._id);
    } else {
      setSelectedEntry(entry);
    }
  };

  const handleContextMenu = (e, entry) => {
    e.preventDefault();
    if (!selectionMode) {
      enterSelectionMode(entry._id);
    } else {
      toggleSelection(entry._id);
    }
  };

  const handleTouchStart = (entryId) => {
    suppressClick.current = false;
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      suppressClick.current = true;
      if (!selectionMode) enterSelectionMode(entryId);
      else toggleSelection(entryId);
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

  // ─── CSV Export ───────────────────────────────────────────
  const handleExportCsv = () => {
    const rows = [
      [
        "Full Name",
        "Email",
        "Phone",
        "City",
        "Other City",
        "User Type",
        "Needs",
        "Joined",
      ],
      ...filteredEntries.map((e) => [
        e.fullName || "",
        e.email || "",
        e.phone || "",
        e.city || "",
        e.otherCity || "",
        e.userType || "",
        (e.needs || []).join("; "),
        e.createdAt ? new Date(e.createdAt).toLocaleString() : "",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `waitlist-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // ─── Helpers ──────────────────────────────────────────────
  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString() : "—";

  const getCityLabel = (entry) => {
    if (!entry) return "—";
    if (entry.city === "other" && entry.otherCity) return entry.otherCity;
    return entry.city || "—";
  };

  const getUserTypeLabel = (type) => {
    if (!type) return "—";
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getUserTypeBadge = (type) => {
    switch (type) {
      case "household":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "business":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "rider":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "vendor":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getUserTypeIcon = (type) => {
    switch (type) {
      case "household":
        return <Home className="h-3.5 w-3.5" />;
      case "business":
        return <Building2 className="h-3.5 w-3.5" />;
      case "rider":
        return <Truck className="h-3.5 w-3.5" />;
      case "vendor":
        return <Briefcase className="h-3.5 w-3.5" />;
      default:
        return <Users className="h-3.5 w-3.5" />;
    }
  };

  const getNeedLabel = (need) => {
    if (!need) return "";
    return need.charAt(0).toUpperCase() + need.slice(1);
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
      fd.append("waitlistIds", JSON.stringify(Array.from(selectedIds)));
      fd.append("subject", messageForm.subject.trim());

      const plainText = messageForm.body.trim();
      const htmlBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111;">${plainText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>")}</div>`;

      fd.append("text", plainText);
      fd.append("html", htmlBody);

      messageForm.attachments.forEach((file) =>
        fd.append("attachments", file)
      );

      const result = await sendMessage(fd).unwrap();
      toast.success(result?.message || "Message sent successfully");
      setShowMessageModal(false);
      setMessageForm({ subject: "", body: "", attachments: [] });
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

  // ─── Error state ──────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
              Waitlist
            </h1>
          </header>
          <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400">
                Failed to load waitlist data
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {error?.data?.message || error?.message || "Please try again"}
              </p>
            </div>
          </div>
        </div>
        <AdminBottombar />
      </div>
    );
  }

  // ─── Mobile Hero Card ────────────────────────────────────
  const renderHeroCard = () => {
    if (isLoading) {
      return (
        <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-2.5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
          </div>

          <div className="flex items-end justify-between mb-3 gap-2">
            <div className="min-w-0 space-y-2">
              <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="text-right min-w-0 space-y-2">
              <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
              <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 gap-2">
            <div className="flex items-center gap-5 min-w-0">
              <div className="space-y-1.5">
                <div className="h-2.5 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3.5 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2.5 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3.5 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex-shrink-0" />
          </div>
        </div>
      );
    }

    return (
      <div className="lg:hidden relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Waitlist
            </span>
            <h1 className="text-lg font-bold leading-tight truncate text-gray-900 dark:text-white">
              Launch Interest
            </h1>
          </div>
          <button
            onClick={() => refetchEntries()}
            disabled={entriesFetching}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex-shrink-0 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${entriesFetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <div className="flex items-end justify-between mb-3 gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Total Entries
            </span>
            <p className="text-3xl font-bold text-gray-900 dark:text-white truncate">
              {stats?.totalEntries || 0}
            </p>
          </div>
          <div className="text-right min-w-0">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Cities
            </span>
            <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {stats?.cityBreakdown?.length || 0}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 gap-2">
          <div className="flex items-center gap-5 min-w-0">
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Top City
              </span>
              <p
                className="text-sm font-bold text-gray-900 dark:text-white truncate capitalize max-w-[80px]"
                title={topCity}
              >
                {topCity}
              </p>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Top Type
              </span>
              <p
                className="text-sm font-bold text-gray-900 dark:text-white truncate capitalize max-w-[80px]"
                title={topUserType}
              >
                {topUserType}
              </p>
            </div>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={filteredEntries.length === 0}
            className="flex items-center gap-1 text-xs font-medium text-white bg-[#13ec5b] hover:bg-[#10d04e] px-3 py-1.5 rounded-lg border border-[#13ec5b] transition shadow-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3 w-3" />
            Export
          </button>
        </div>
      </div>
    );
  };

  // ─── Mobile Search Bar ───────────────────────────────────
  const renderMobileSearchBar = () => (
    <div className="lg:hidden relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 flex-shrink-0" />
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search waitlist..."
        autoComplete="off"
        className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none shadow-sm"
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
        >
          <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
        </button>
      )}
    </div>
  );

  // ─── Mobile Filter Sheet ─────────────────────────────────
  const renderFilterSheet = () => (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setShowFilterSheet(false)}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-full p-6 rounded-t-2xl max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Filter Waitlist
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
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              City
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCityFilter("all")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  cityFilter === "all"
                    ? "bg-[#13ec5b] text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                All
              </button>
              {cities.map((c) => (
                <button
                  key={c}
                  onClick={() => setCityFilter(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition capitalize ${
                    cityFilter === c
                      ? "bg-[#13ec5b] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              User Type
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setUserTypeFilter("all")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  userTypeFilter === "all"
                    ? "bg-[#13ec5b] text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                All
              </button>
              {userTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setUserTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition capitalize ${
                    userTypeFilter === t
                      ? "bg-[#13ec5b] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
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

  // ─── Mobile Slim Entry Row ────────────────────────────────
  const renderSlimEntry = (entry) => {
    const name = entry.fullName || "Unknown";
    const cityLabel = getCityLabel(entry);
    const dateLabel = formatDate(entry.createdAt);
    const isSelected = selectedIds.has(entry._id);

    return (
      <div
        key={entry._id}
        onClick={() => handleRowClick(entry)}
        onContextMenu={(e) => handleContextMenu(e, entry)}
        onTouchStart={() => handleTouchStart(entry._id)}
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
              title={name}
            >
              {name}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${getUserTypeBadge(
                entry.userType
              )}`}
            >
              {getUserTypeIcon(entry.userType)}
              <span className="capitalize">{entry.userType || "—"}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400 min-w-0">
            <span
              className="flex items-center gap-1 truncate max-w-[140px]"
              title={cityLabel}
            >
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{cityLabel}</span>
            </span>
            <span className="flex-shrink-0">·</span>
            <span className="truncate max-w-[140px]" title={entry.email}>
              {entry.email}
            </span>
          </div>
        </div>

        {!selectionMode && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">
              {dateLabel}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        )}
      </div>
    );
  };

  // ─── Detail Modal ────────────────────────────────────────
  const renderDetailModal = () => {
    if (!selectedEntry) return null;
    const entry = selectedEntry;

    const openSingleMessage = () => {
      setSelectedIds(new Set([entry._id]));
      setSelectionMode(true);
      setShowMessageModal(true);
      setSelectedEntry(null);
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => setSelectedEntry(null)}
      >
        <div
          className="bg-white dark:bg-gray-900 w-full max-w-full p-6 max-h-[85vh] overflow-y-auto lg:max-w-lg lg:rounded-2xl lg:mb-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3
              className="text-lg font-bold text-gray-900 dark:text-white truncate"
              title={entry.fullName}
            >
              {entry.fullName || "Unknown"}
            </h3>
            <button
              onClick={() => setSelectedEntry(null)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Email</p>
              <p className="text-gray-900 dark:text-white flex items-center gap-1.5 min-w-0">
                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                <span className="truncate" title={entry.email}>
                  {entry.email || "—"}
                </span>
              </p>
            </div>

            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Phone</p>
              <p className="text-gray-900 dark:text-white flex items-center gap-1.5 min-w-0">
                <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                <span className="truncate">{entry.phone || "—"}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className="text-gray-500 dark:text-gray-400 text-xs">City</p>
                <p className="text-gray-900 dark:text-white flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  <span className="truncate" title={getCityLabel(entry)}>
                    {getCityLabel(entry)}
                  </span>
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  User Type
                </p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getUserTypeBadge(
                    entry.userType
                  )}`}
                >
                  {getUserTypeIcon(entry.userType)}
                  <span className="capitalize">
                    {getUserTypeLabel(entry.userType)}
                  </span>
                </span>
              </div>
            </div>

            {entry.needs && entry.needs.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">
                  Needs
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {entry.needs.map((need, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#13ec5b]/10 text-[#0f9c46] dark:text-[#13ec5b] border border-[#13ec5b]/20"
                    >
                      <Flame className="h-3 w-3" />
                      {getNeedLabel(need)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex items-center justify-between gap-2">
              <span className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" /> Joined
              </span>
              <span className="text-gray-900 dark:text-white text-xs">
                {entry.createdAt
                  ? new Date(entry.createdAt).toLocaleString()
                  : "—"}
              </span>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <button
                onClick={openSingleMessage}
                className="w-full py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Send Message
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
              {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "recipient" : "recipients"}
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
              placeholder="e.g. Flanorx is launching soon!"
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
              rows={6}
              disabled={sendingMessage}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none resize-none disabled:opacity-60"
            />
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
            onClick={() => setShowMessageModal(true)}
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

  const anyModalOpen = !!selectedEntry || showFilterSheet || showMessageModal;

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
            {selectionMode ? `${selectedIds.size} selected` : "Waitlist"}
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
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  disabled={isLoading || filteredEntries.length === 0}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export filtered results as CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => refetchEntries()}
                  disabled={entriesFetching}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw
                    className={`h-4 w-4 text-gray-500 dark:text-gray-400 ${
                      entriesFetching ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="w-full px-1 sm:px-4 lg:px-6 py-4">
          {/* Mobile Hero Card */}
          {renderHeroCard()}

          {/* Mobile Search Bar */}
          {renderMobileSearchBar()}

          {/* Desktop Stats Cards */}
          <div className="hidden lg:grid grid-cols-4 gap-4 mb-6">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                        Total Entries
                      </p>
                      <p
                        className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate"
                        title={String(stats?.totalEntries || 0)}
                      >
                        {stats?.totalEntries || 0}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b] flex-shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                        Cities
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">
                        {stats?.cityBreakdown?.length || 0}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b] flex-shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                        Top City
                      </p>
                      <p
                        className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate capitalize"
                        title={topCity}
                      >
                        {topCity}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b] flex-shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                        Top User Type
                      </p>
                      <p
                        className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate capitalize"
                        title={topUserType}
                      >
                        {topUserType}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b] flex-shrink-0">
                      <Briefcase className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Breakdown Charts */}
          {!isLoading &&
            (stats?.cityBreakdown?.length > 0 ||
              stats?.userTypeBreakdown?.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
                {stats?.cityBreakdown?.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm min-w-0">
                    <div className="flex items-center gap-2 mb-3 min-w-0">
                      <MapPin className="h-4 w-4 text-[#13ec5b] flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                        Breakdown by City
                      </h3>
                    </div>
                    <div className="space-y-2.5">
                      {stats.cityBreakdown.slice(0, 6).map((item) => {
                        const pct =
                          stats.totalEntries > 0
                            ? (item.count / stats.totalEntries) * 100
                            : 0;
                        return (
                          <div key={item._id || "unknown"} className="min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span
                                className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize truncate"
                                title={item._id}
                              >
                                {item._id || "Unknown"}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                {item.count}
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#13ec5b] rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {stats?.userTypeBreakdown?.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm min-w-0">
                    <div className="flex items-center gap-2 mb-3 min-w-0">
                      <Users className="h-4 w-4 text-[#13ec5b] flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                        Breakdown by User Type
                      </h3>
                    </div>
                    <div className="space-y-2.5">
                      {stats.userTypeBreakdown.map((item) => {
                        const pct =
                          stats.totalEntries > 0
                            ? (item.count / stats.totalEntries) * 100
                            : 0;
                        return (
                          <div key={item._id || "unknown"} className="min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span
                                className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize truncate"
                                title={item._id}
                              >
                                {item._id || "Unknown"}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                {item.count}
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#13ec5b] rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Desktop Filters */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, phone, or city..."
                  autoComplete="off"
                  className="w-full pl-9 pr-9 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>

              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none"
              >
                <option value="all">All Cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={userTypeFilter}
                onChange={(e) => setUserTypeFilter(e.target.value)}
                className="min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] outline-none"
              >
                <option value="all">All Types</option>
                {userTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Selection hint (desktop) */}
          {!selectionMode && !isLoading && filteredEntries.length > 0 && (
            <p className="hidden lg:block text-xs text-gray-400 dark:text-gray-500 mb-2 px-1">
              Tip: right‑click an entry to start selecting multiple.
            </p>
          )}

          {/* Entries List */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                {isLoading
                  ? "Loading entries..."
                  : `${filteredEntries.length} ${
                      filteredEntries.length === 1 ? "Entry" : "Entries"
                    }`}
              </h3>
              {selectionMode ? (
                <button
                  onClick={toggleSelectAll}
                  className="text-xs font-medium text-[#0f9c46] dark:text-[#13ec5b] hover:underline flex-shrink-0"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              ) : hasActiveFilters ? (
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  filtered from {entries.length}
                </span>
              ) : null}
            </div>

            {isLoading ? (
              <>
                <div className="hidden lg:block">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-[18%]" />
                      <col className="w-[22%]" />
                      <col className="w-[14%]" />
                      <col className="w-[14%]" />
                      <col className="w-[18%]" />
                      <col className="w-[14%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Name
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Email
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Phone
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          City
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          User Type
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Joined
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(5)].map((_, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <td className="py-2.5 px-3">
                            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                        </div>
                        <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-2" />
                    </div>
                  ))}
                </div>
              </>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {hasActiveFilters
                    ? "No entries match your filters"
                    : "No waitlist entries yet"}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      {selectionMode && <col className="w-[40px]" />}
                      <col className={selectionMode ? "w-[16%]" : "w-[18%]"} />
                      <col className={selectionMode ? "w-[20%]" : "w-[22%]"} />
                      <col className={selectionMode ? "w-[12%]" : "w-[14%]"} />
                      <col className={selectionMode ? "w-[12%]" : "w-[14%]"} />
                      <col className={selectionMode ? "w-[16%]" : "w-[18%]"} />
                      <col className={selectionMode ? "w-[14%]" : "w-[14%]"} />
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
                          Phone
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          City
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          User Type
                        </th>
                        <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium">
                          Joined
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry) => {
                        const name = entry.fullName || "Unknown";
                        const emailLabel = entry.email || "—";
                        const phoneLabel = entry.phone || "—";
                        const cityLabel = getCityLabel(entry);
                        const dateLabel = formatDate(entry.createdAt);
                        const isSelected = selectedIds.has(entry._id);

                        return (
                          <tr
                            key={entry._id}
                            onClick={() => handleRowClick(entry)}
                            onContextMenu={(e) => handleContextMenu(e, entry)}
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
                              <div className="truncate" title={name}>
                                {name}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                              <div className="truncate" title={emailLabel}>
                                {emailLabel}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                              <div className="truncate" title={phoneLabel}>
                                {phoneLabel}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300 capitalize">
                              <div className="truncate" title={cityLabel}>
                                {cityLabel}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium max-w-full ${getUserTypeBadge(
                                  entry.userType
                                )}`}
                              >
                                {getUserTypeIcon(entry.userType)}
                                <span className="truncate capitalize">
                                  {entry.userType || "—"}
                                </span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">
                              <div className="truncate" title={dateLabel}>
                                {dateLabel}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Slim List */}
                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredEntries.map((entry) => renderSlimEntry(entry))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Selection bar (floating) */}
      {renderSelectionBar()}

      {/* Floating Filter Button (mobile only, hidden in selection mode) */}
      {!selectionMode && (
        <div className="lg:hidden fixed bottom-24 right-4 z-40">
          <button
            onClick={() => setShowFilterSheet(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm active:scale-95 transition-transform"
          >
            <Filter className="h-3.5 w-3.5 text-gray-700 dark:text-gray-200" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
              Filters
            </span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 min-w-[16px] h-4 px-1 bg-[#13ec5b] text-gray-900 rounded-full flex items-center justify-center text-[9px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      )}

      {!anyModalOpen && !selectionMode && <AdminBottombar />}
      {selectedEntry && renderDetailModal()}
      {showFilterSheet && renderFilterSheet()}
      {showMessageModal && renderMessageModal()}
    </div>
  );
};

export default Waitlist;