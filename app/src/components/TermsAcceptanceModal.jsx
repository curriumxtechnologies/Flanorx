// src/components/TermsAcceptanceModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FileText, Shield, CheckCircle, Clock, X } from "lucide-react";
import {
  useGetTermsStatusQuery,
  useAcceptTermsMutation,
} from "../features/userApiSlice";

// Bump this key to force all sessions to re-show the modal after a deploy
const DISMISS_KEY = "flanorx_terms_dismissed";

const TermsAcceptanceModal = ({ forceOpen = false, onForceClose }) => {
  const { data, isLoading, refetch } = useGetTermsStatusQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const [acceptTerms, { isLoading: accepting }] = useAcceptTermsMutation();
  const [dismissed, setDismissed] = useState(false);

  // Stable signature of "which versions are pending"
  const versionKey = useMemo(() => {
    if (!data?.pendingDocuments?.length) return "";
    return data.pendingDocuments
      .map((d) => `${d.type}@${d.version}`)
      .sort()
      .join("|");
  }, [data]);

  // Restore per-session dismissal
  useEffect(() => {
    if (!versionKey) {
      setDismissed(false);
      return;
    }
    try {
      const stored = sessionStorage.getItem(DISMISS_KEY);
      setDismissed(stored === versionKey);
    } catch {
      setDismissed(false);
    }
  }, [versionKey]);

  const autoVisible =
    !isLoading &&
    data?.requiresAcceptance === true &&
    !(dismissed && data.canDismiss);

  // forceOpen (from Profile button) OR normal auto-show
  const visible = forceOpen || autoVisible;

  // Lock body scroll while visible
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible) return null;

  const handleAccept = async () => {
    const versions = Object.fromEntries(
      data.pendingDocuments.map((d) => [d.type, d.version])
    );

    try {
      await acceptTerms({ accepted: true, versions }).unwrap();
      try {
        sessionStorage.removeItem(DISMISS_KEY);
      } catch {
        /* ignore */
      }
      onForceClose?.();
      refetch();
    } catch (err) {
      alert(
        err?.data?.message ||
          "Failed to record your acceptance. Please try again."
      );
    }
  };

  const handleClose = () => {
    // Mandatory window: no closing allowed, period.
    if (!data.canDismiss) return;

    // Set session dismissal so the auto modal stays hidden,
    // and clear force mode (Profile-instance state).
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, versionKey);
    } catch {
      /* ignore */
    }
    onForceClose?.();
  };

  const iconFor = (type) => (type === "terms" ? FileText : Shield);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b] flex-shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2
                id="terms-modal-title"
                className="text-base sm:text-lg font-bold text-gray-900 dark:text-white"
              >
                {data.isMandatory
                  ? "Action Required"
                  : "We've Updated Our Policies"}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {data.isMandatory
                  ? "Please review and accept to continue using Flanorx."
                  : "Please review and accept to continue."}
              </p>
            </div>
            {data.canDismiss && (
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Grace-period strip */}
        <div
          className={`flex-shrink-0 px-5 py-2.5 border-b ${
            data.canDismiss
              ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50"
          }`}
        >
          <div
            className={`flex items-center gap-2 text-xs ${
              data.canDismiss
                ? "text-amber-800 dark:text-amber-200"
                : "text-red-800 dark:text-red-200 font-medium"
            }`}
          >
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            {data.canDismiss ? (
              <span>
                You have{" "}
                <strong>
                  {data.daysLeft} day{data.daysLeft === 1 ? "" : "s"}
                </strong>{" "}
                left to review. After that, acceptance becomes mandatory.
              </span>
            ) : (
              <span>
                Your grace period has ended. You must accept to continue.
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {data.pendingDocuments.map((doc) => {
            const Icon = iconFor(doc.type);
            return (
              <section key={doc.type}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-[#13ec5b]" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {doc.title}
                  </h3>
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    v{doc.version}
                  </span>
                </div>

                {doc.updateNotice && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2 mb-3">
                    {doc.updateNotice}
                  </p>
                )}

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 max-h-52 overflow-y-auto">
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {doc.content}
                  </p>
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-2">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-3 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {accepting ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                I have read and accept
              </>
            )}
          </button>

          {data.canDismiss && (
            <button
              onClick={handleClose}
              disabled={accepting}
              className="w-full py-2.5 bg-transparent text-gray-500 dark:text-gray-400 rounded-lg font-medium text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              Remind me later
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TermsAcceptanceModal;