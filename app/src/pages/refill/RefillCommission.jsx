// src/pages/refill/RefillCommission.jsx
import React, { useState, useMemo } from "react";
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  TrendingUp,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import {
  useGetMyRefillCommissionQuery,
  usePayRefillInvoiceMutation,
} from "../../features/refillApiSlice";

import RefillSidebar from "../../components/refill/RefillSidebar";
import RefillBottombar from "../../components/refill/RefillBottombar";

const formatNaira = (n) =>
  `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

const formatMonth = (month, year) => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const getInvoiceStatusBadge = (status) => {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800";
    case "waived":
      return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700";
    case "overdue":
      return "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800";
    case "pending":
    default:
      return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800";
  }
};

const RefillCommission = () => {
  const [activeTab, setActiveTab] = useState("open"); // 'open' | 'history'

  // Queries & Mutations
  const { data, isLoading, error, refetch } = useGetMyRefillCommissionQuery();
  const [payInvoice, { isLoading: isPaying }] = usePayRefillInvoiceMutation();

  // Derived Data
  const totalOwed = data?.totalOwed || 0;
  const totalPaid = data?.totalPaid || 0;
  const commissionRate = data?.commissionRate || 0;
  const graceDays = data?.graceDays || 10;
  const openInvoices = data?.openInvoices || [];
  const history = data?.history || [];

  const overdueInvoices = useMemo(
    () => openInvoices.filter((inv) => inv.status === "overdue"),
    [openInvoices]
  );

  // Handlers
  const handlePayInvoice = async (invoiceId) => {
    try {
      const result = await payInvoice(invoiceId).unwrap();
      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        alert("Failed to generate payment link. Please try again.");
      }
    } catch (err) {
      alert(err.data?.message || "Failed to initialize payment");
    }
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RefillSidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-6 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl truncate">
            Commission & Invoices
          </h1>
        </header>

        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          {/* Overdue Alert Banner */}
          {overdueInvoices.length > 0 && (
            <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800 dark:text-red-300">
                    Action Required: Overdue Invoices
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                    You have {overdueInvoices.length} unpaid invoice(s). Your
                    station may be automatically suspended if these are not cleared.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("open")}
                className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
              >
                View Invoices
              </button>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                Total Owed
              </p>
              <p
                className={`text-2xl font-bold mt-1 truncate ${
                  totalOwed > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {isLoading ? "—" : formatNaira(totalOwed)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                Total Paid
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1 truncate">
                {isLoading ? "—" : formatNaira(totalPaid)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                    Commission Rate
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">
                    {isLoading ? "—" : `${commissionRate}%`}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-[#13ec5b]/10 text-[#13ec5b] flex-shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                    Grace Period
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">
                    {isLoading ? "—" : `${graceDays} Days`}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("open")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === "open"
                  ? "bg-[#13ec5b] text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Open Invoices ({openInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === "history"
                  ? "bg-[#13ec5b] text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Payment History
            </button>
          </div>

          {/* Invoice List */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden lg:rounded-2xl rounded-2xl">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 text-[#13ec5b] animate-spin mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Loading invoices...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-600 dark:text-red-400">Failed to load invoices.</p>
                <button
                  onClick={refetch}
                  className="mt-3 text-[#13ec5b] hover:underline text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            ) : (activeTab === "open" ? openInvoices : history).length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {activeTab === "open" ? "No open invoices" : "No payment history"}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {activeTab === "open"
                    ? "You're all caught up! New invoices are generated at the end of each month."
                    : "Your paid invoices will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {(activeTab === "open" ? openInvoices : history).map((invoice) => (
                  <div
                    key={invoice._id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          invoice.status === "overdue"
                            ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                            : invoice.status === "paid"
                            ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
                        }`}
                      >
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {formatMonth(invoice.period.month, invoice.period.year)} Invoice
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{invoice.orderCount} orders</span>
                          <span className="hidden sm:inline">·</span>
                          <span>Rate: {invoice.commissionRate}%</span>
                          <span className="hidden sm:inline">·</span>
                          <span>
                            Due: {new Date(invoice.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-gray-700">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatNaira(invoice.commissionOwed)}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize mt-1 ${getInvoiceStatusBadge(
                            invoice.status
                          )}`}
                        >
                          {invoice.status}
                        </span>
                      </div>

                      {["pending", "overdue"].includes(invoice.status) && (
                        <button
                          onClick={() => handlePayInvoice(invoice._id)}
                          disabled={isPaying}
                          className="px-4 py-2 bg-[#13ec5b] hover:bg-[#10d04e] text-white text-xs font-bold rounded-lg transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isPaying ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Wallet className="h-3.5 w-3.5" />
                          )}
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <RefillBottombar />
    </div>
  );
};

export default RefillCommission;