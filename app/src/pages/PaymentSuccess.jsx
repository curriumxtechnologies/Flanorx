// src/pages/PaymentSuccess.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  ArrowRight,
  Download,
  FileImage,
  Flame,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useVerifyPaymentQuery } from "../features/orderApiSlice";
import {
  useVerifySubscriptionPaymentQuery,
  useVerifyRenewalPaymentQuery,
  useVerifyUpgradePaymentQuery,
  useVerifyCylinderOnlyPaymentQuery,
} from "../features/gasApiSlice";
import Sidebar from "../components/Sidebar";
import Bottombar from "../components/Bottombar";
import ReceiptTemplate from "../components/ReceiptTemplate";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  const receiptRef = useRef(null);
  const [generating, setGenerating] = useState(null);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!reference) navigate("/dashboard");
  }, [reference, navigate]);

  // ─── Detect reference prefix ────────────────────────────────
  const isSub = reference?.startsWith("SUB_");
  const isCylinder = reference?.startsWith("CYL_");
  const isRenew = reference?.startsWith("RENEW_");
  const isUpgrade = reference?.startsWith("UPGRADE_");
  const isOrder = reference?.startsWith("FLX_");

  // ─── Verification queries (only the matching one runs) ──────
  const subResult = useVerifySubscriptionPaymentQuery(reference, { skip: !isSub });
  const cylinderResult = useVerifyCylinderOnlyPaymentQuery(reference, { skip: !isCylinder });
  const renewResult = useVerifyRenewalPaymentQuery(reference, { skip: !isRenew });
  const upgradeResult = useVerifyUpgradePaymentQuery(reference, { skip: !isUpgrade });
  const orderResult = useVerifyPaymentQuery(reference, { skip: !isOrder });

  const activeResult = isSub
    ? subResult
    : isCylinder
    ? cylinderResult
    : isRenew
    ? renewResult
    : isUpgrade
    ? upgradeResult
    : orderResult;

  const { data: paymentData, isLoading, error } = activeResult;

  const order = paymentData?.order || null;
  const subscription = paymentData?.subscription || null;
  const isSubscription = isSub || isCylinder || isRenew || isUpgrade;
  const isCylinderOnly = isCylinder;
  const isSuccess = paymentData && !error;

  // ─── Receipt download handler ───────────────────────────────
  const handleDownload = async (format) => {
    if (!order || !receiptRef.current) return;

    setDownloadError("");
    setGenerating(format);

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const fileBase = `Flanorx-Receipt-${order.orderId || reference}`;

      if (format === "pdf") {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileBase}.pdf`);
      } else {
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const link = document.createElement("a");
        link.href = imgData;
        link.download = `${fileBase}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to generate receipt:", err);
      setDownloadError("Couldn't generate the receipt. Please try again.");
    } finally {
      setGenerating(null);
    }
  };

  // ─── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-[#13ec5b] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────
  if (error || !isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full shadow-sm text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Failed</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error?.data?.message ||
              "We couldn't verify your payment. Please contact support if you were charged."}
          </p>
          <button
            onClick={() => navigate("/orders")}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition"
          >
            View Orders <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Success ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
          <div className="max-w-2xl mx-auto">
            {/* Success Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-6 text-center border-b border-gray-100 dark:border-gray-700">
                <CheckCircle className="h-16 w-16 text-[#13ec5b] mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isSubscription ? "Subscription Activated!" : "Payment Successful!"}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {isCylinderOnly
                    ? "Your cylinder subscription is now active."
                    : isRenew
                    ? "Your gas subscription has been renewed."
                    : isUpgrade
                    ? "Your cylinder size has been updated."
                    : isSub
                    ? "Your gas subscription has been activated."
                    : "Your order has been confirmed and is being processed."}
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Subscription details (for gas subscription flows) */}
                {isSubscription && subscription && (
                  <>
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
                      <div className="w-12 h-12 rounded-xl bg-[#13ec5b]/10 flex items-center justify-center">
                        <Flame className="h-6 w-6 text-[#13ec5b]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Cylinder Subscription
                        </p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {subscription.cylinderSize} Cylinder
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Status</span>
                        <p className="font-medium text-green-600 dark:text-green-400 mt-0.5 capitalize">
                          {subscription.status}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Next Renewal</span>
                        <p className="font-medium text-gray-900 dark:text-white mt-0.5">
                          {subscription.nextBillingDate
                            ? new Date(subscription.nextBillingDate).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Order details (for orders + subscribe+gas) */}
                {order ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Order ID</span>
                        <p className="font-medium text-gray-900 dark:text-white">#{order.orderId}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Total</span>
                        <p className="font-medium text-[#13ec5b]">₦{order.totalAmount?.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Type</span>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">
                          {order.orderType}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Status</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          {order.deliveryStatus || "processing"}
                        </span>
                      </div>
                    </div>

                    {order.deliveryAddress && (
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Delivery Address</span>
                        <p className="text-sm text-gray-900 dark:text-white">{order.deliveryAddress}</p>
                      </div>
                    )}

                    {order.orderType === "fuel" && (
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Fuel Details</span>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {order.fuelType} – {order.quantity} L
                        </p>
                      </div>
                    )}

                    {order.orderType === "gas" && order.gasDetails && (
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Gas Details</span>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {order.gasDetails.cylinderSize} – {order.gasDetails.quantityKg} kg
                          {order.gasDetails.isFirstTime && " (New cylinder)"}
                        </p>
                      </div>
                    )}

                    {/* Receipt Download */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Receipt</span>
                      <div className="flex flex-col sm:flex-row gap-3 mt-2">
                        <button
                          onClick={() => handleDownload("pdf")}
                          disabled={generating !== null}
                          className="flex-1 py-2.5 border border-[#13ec5b] text-[#0f9c46] dark:text-[#13ec5b] rounded-lg font-medium transition flex items-center justify-center gap-2 hover:bg-[#13ec5b]/10 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {generating === "pdf" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Download PDF
                        </button>
                        <button
                          onClick={() => handleDownload("jpg")}
                          disabled={generating !== null}
                          className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {generating === "jpg" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileImage className="h-4 w-4" />
                          )}
                          Download JPG
                        </button>
                      </div>
                      {downloadError && (
                        <p className="text-xs text-red-500 mt-2">{downloadError}</p>
                      )}
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => navigate(`/order/${order._id}`)}
                        className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                      >
                        View Order <Package className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigate("/dashboard")}
                        className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  </>
                ) : isSubscription ? (
                  <div className="pt-4 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => navigate("/gas/subscription")}
                      className="flex-1 py-2.5 bg-[#13ec5b] hover:bg-[#10d04e] text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                    >
                      <Flame className="h-4 w-4" /> View Subscription
                    </button>
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Order details not available.</p>
                    <button
                      onClick={() => navigate("/orders")}
                      className="mt-3 text-[#13ec5b] hover:underline"
                    >
                      View all orders
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Info Card */}
            <div className="mt-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300">
              <p className="font-medium text-gray-800 dark:text-gray-200">What happens next?</p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-xs">
                {isCylinderOnly ? (
                  <>
                    <li>Your cylinder subscription is active for 30 days.</li>
                    <li>Order a gas swap anytime you need a refill.</li>
                    <li>You'll get a 6-day grace period at renewal time.</li>
                  </>
                ) : isRenew ? (
                  <>
                    <li>Your subscription has been extended by 30 days.</li>
                    <li>You can continue swapping cylinders as usual.</li>
                    <li>You'll receive a reminder before your next renewal.</li>
                  </>
                ) : isUpgrade ? (
                  <>
                    <li>Your cylinder plan has been updated.</li>
                    <li>Your next delivery will use the new cylinder size.</li>
                    <li>Your billing date remains unchanged.</li>
                  </>
                ) : isSubscription ? (
                  <>
                    <li>Your gas subscription is now active for 30 days.</li>
                    <li>You can swap your cylinder anytime during your subscription.</li>
                    <li>You'll receive a reminder before your subscription expires.</li>
                  </>
                ) : (
                  <>
                    <li>Your order will be assigned to a rider shortly.</li>
                    <li>You'll receive tracking updates via email and in‑app notifications.</li>
                    <li>You can track your delivery status in the Orders page.</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Bottombar />

      {/* Off-screen receipt used as the html2canvas source */}
      {order && (
        <div
          style={{ position: "fixed", top: 0, left: "-10000px", pointerEvents: "none" }}
          aria-hidden="true"
        >
          <ReceiptTemplate
            ref={receiptRef}
            order={order}
            reference={reference}
            isSubscription={isSubscription}
            paymentData={paymentData}
          />
        </div>
      )}
    </div>
  );
};

export default PaymentSuccess;