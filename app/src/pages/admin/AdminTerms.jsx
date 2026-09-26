// pages/admin/AdminTerms.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Shield,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Pencil,
  History,
  X,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { useGetTermsQuery } from "../../features/userApiSlice";
import {
  usePublishTermsMutation,
  useGetTermsHistoryQuery,
} from "../../features/adminApiSlice";
import AdminSidebar from "../../components/admin/Sidebar";
import AdminBottombar from "../../components/admin/Bottombar";

// ─── Tabs config ─────────────────────────────────────────────
const TABS = [
  { key: "terms", label: "Terms of Service", icon: FileText },
  { key: "privacy", label: "Privacy Policy", icon: Shield },
];

// ─── Confirm Modal (same pattern as AdminRiders) ─────────────
const ConfirmModal = ({ isOpen, onClose, onConfirm, message, loading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-500" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Publish New Version?
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          {message}
        </p>
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
            Publish
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Preview Modal ───────────────────────────────────────────
const PreviewModal = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-3xl max-h-[90vh] lg:max-h-[85vh] overflow-y-auto rounded-t-2xl lg:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#13ec5b]" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Preview — {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div
          className="p-5 prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: content || "<em>No content</em>" }}
        />
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────
const AdminTerms = () => {
  const [activeTab, setActiveTab] = useState("terms");

  // ── Form state ─────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "",
    content: "",
    updateNotice: "",
  });
  const [isDirty, setIsDirty] = useState(false);

  // ── Modal state ────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // ── Queries ────────────────────────────────────────────────
  const {
    data: termsData,
    isLoading,
    refetch: refetchTerms,
  } = useGetTermsQuery();

  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useGetTermsHistoryQuery(activeTab);

  const [publishTerms, { isLoading: publishing }] = usePublishTermsMutation();

  // Find the live document for the active tab
  const liveDoc = useMemo(() => {
    return termsData?.documents?.find((d) => d.type === activeTab);
  }, [termsData, activeTab]);

  const gracePeriodDays = termsData?.gracePeriodDays || 10;

  // ── Sync form when the live doc loads or tab changes ──────
  useEffect(() => {
    if (liveDoc) {
      setForm({
        title: liveDoc.title || "",
        content: liveDoc.content || "",
        updateNotice: liveDoc.updateNotice || "",
      });
      setIsDirty(false);
    } else if (!isLoading) {
      // Doc doesn't exist yet — blank form
      setForm({
        title: activeTab === "terms" ? "Terms of Service" : "Privacy Policy",
        content: "",
        updateNotice: "",
      });
      setIsDirty(false);
    }
  }, [liveDoc, activeTab, isLoading]);

  // ── Handlers ──────────────────────────────────────────────
  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleTabChange = (key) => {
    if (isDirty) {
      const ok = window.confirm(
        "You have unsaved changes. Discard and switch tabs?"
      );
      if (!ok) return;
    }
    setActiveTab(key);
    setIsDirty(false);
  };

  const handleReset = () => {
    if (!liveDoc) return;
    setForm({
      title: liveDoc.title || "",
      content: liveDoc.content || "",
      updateNotice: liveDoc.updateNotice || "",
    });
    setIsDirty(false);
  };

  const handlePublishClick = () => {
    if (!form.content.trim()) {
      alert("Content cannot be empty.");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmPublish = async () => {
    try {
      await publishTerms({
        type: activeTab,
        title: form.title,
        content: form.content,
        updateNotice: form.updateNotice,
      }).unwrap();

      setSuccessMsg(
        `${liveDoc?.title || "Document"} published. All users must re-accept within ${gracePeriodDays} days.`
      );
      setTimeout(() => setSuccessMsg(""), 5000);

      setIsDirty(false);
      setShowConfirm(false);
      refetchTerms();
      refetchHistory();
    } catch (err) {
      alert(err?.data?.message || "Failed to publish. Please try again.");
      setShowConfirm(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────
  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  const history = historyData?.history || [];

  // ── Main render ───────────────────────────────────────────
  const isModalOpen = showConfirm || showPreview;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
            Terms & Privacy
          </h1>
          <div className="flex items-center gap-3">
            {successMsg && (
              <span className="hidden sm:flex text-xs text-green-600 dark:text-green-400 items-center gap-1 max-w-xs truncate">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{successMsg}</span>
              </span>
            )}
            <button
              onClick={() => {
                refetchTerms();
                refetchHistory();
              }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </header>

        <div className="w-full px-0 sm:px-4 lg:px-6 py-4 space-y-4">
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 border-y lg:border border-gray-200 dark:border-gray-700 lg:rounded-2xl overflow-hidden">
            <div className="flex">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2 ${
                      active
                        ? "text-[#13ec5b] border-[#13ec5b] bg-[#13ec5b]/5"
                        : "text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warning banner */}
          <div className="mx-0 sm:mx-0 bg-amber-50 dark:bg-amber-900/20 border-y lg:border border-amber-200 dark:border-amber-800/50 lg:rounded-2xl px-4 py-3 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-semibold">Publishing affects every user</p>
              <p className="text-xs mt-0.5 opacity-90">
                Saving a new version will reset <strong>all users</strong> to{" "}
                <em>not accepted</em>, re-trigger the acceptance modal, and give
                them a <strong>{gracePeriodDays}-day</strong> grace window to
                review. After that, acceptance is mandatory.
              </p>
            </div>
          </div>

          {/* Loading */}
          {isLoading ? (
            <div className="bg-white dark:bg-gray-800 border-y lg:border border-gray-200 dark:border-gray-700 lg:rounded-2xl p-6 space-y-4 animate-pulse">
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ) : (
            <>
              {/* Live doc info strip */}
              <div className="bg-white dark:bg-gray-800 border-y lg:border border-gray-200 dark:border-gray-700 lg:rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Current version
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#13ec5b]/10 text-[#13ec5b]">
                    v{liveDoc?.version || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Last updated
                  </span>
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {formatDate(liveDoc?.effectiveFrom || liveDoc?.updatedAt)}
                  </span>
                </div>
                {isDirty && (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Unsaved changes
                  </span>
                )}
              </div>

              {/* Editor card */}
              <div className="bg-white dark:bg-gray-800 border-y lg:border border-gray-200 dark:border-gray-700 lg:rounded-2xl p-4 lg:p-6 space-y-5">
                {/* Title + Notice */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      placeholder="Terms of Service"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Update Notice <span className="opacity-60">(shown to users)</span>
                    </label>
                    <input
                      type="text"
                      value={form.updateNotice}
                      onChange={(e) => handleChange("updateNotice", e.target.value)}
                      placeholder="We've updated our Privacy Policy. Please review and accept."
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50"
                    />
                  </div>
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Content <span className="opacity-60">(markdown or HTML)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="text-xs text-[#13ec5b] hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </button>
                  </div>
                  <textarea
                    value={form.content}
                    onChange={(e) => handleChange("content", e.target.value)}
                    rows={18}
                    placeholder="Write the terms content here..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#13ec5b]/50 font-mono resize-y"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {form.content.length.toLocaleString()} characters
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={handleReset}
                    disabled={!isDirty || publishing}
                    className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={handlePublishClick}
                    disabled={!isDirty || publishing}
                    className="px-5 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {publishing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {publishing ? "Publishing..." : "Publish New Version"}
                  </button>
                </div>
              </div>

              {/* History card */}
              <div className="bg-white dark:bg-gray-800 border-y lg:border border-gray-200 dark:border-gray-700 lg:rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Version History
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {history.length} archived
                  </span>
                </div>

                {historyLoading ? (
                  <div className="p-4 space-y-3 animate-pulse">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-10">
                    <History className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No previous versions yet
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Published updates will appear here
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {history
                      .slice()
                      .reverse()
                      .map((h, i) => (
                        <li key={`${h.version}-${i}`} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                  v{h.version}
                                </span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {h.title || "—"}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatDate(h.changedAt)}
                              </p>
                              {h.updateNotice && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 italic">
                                  "{h.updateNotice}"
                                </p>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!isModalOpen && <AdminBottombar />}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmPublish}
        loading={publishing}
        message={`Publishing this will set every user's termsAccepted to false and give them ${gracePeriodDays} days to re-accept "${form.title}". This cannot be undone.`}
      />

      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={form.title}
        content={form.content}
      />
    </div>
  );
};

export default AdminTerms;