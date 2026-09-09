// src/pages/PaymentSuccess.jsx
import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CheckCircle, XCircle, Loader2, Package, ArrowRight } from "lucide-react";
import { useVerifyPaymentQuery } from "../features/orderApiSlice";
import Sidebar from "../components/Sidebar";
import Bottombar from "../components/Bottombar";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference");

  // ─── Redirect if no reference ──────────────────────────────
  useEffect(() => {
    if (!reference) {
      navigate("/dashboard");
    }
  }, [reference, navigate]);

  // ─── Verify payment ─────────────────────────────────────────
  const {
    data: paymentData,
    isLoading,
    error,
  } = useVerifyPaymentQuery(reference, {
    skip: !reference,
  });

  const order = paymentData?.order || null;
  const isSuccess = paymentData && !error;

  // ─── Loading state ──────────────────────────────────────────
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

  // ─── Error state ────────────────────────────────────────────
  if (error || !isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full shadow-sm text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Failed</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error?.data?.message || "We couldn't verify your payment. Please contact support if you were charged."}
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

  // ─── Success state ──────────────────────────────────────────
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Successful!</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Your order has been confirmed and is being processed.
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Order Details */}
                {order && (
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
                        <p className="font-medium text-gray-900 dark:text-white capitalize">{order.orderType}</p>
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
                )}
              </div>
            </div>

            {/* Info Card */}
            <div className="mt-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300">
              <p className="font-medium text-gray-800 dark:text-gray-200">What happens next?</p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-xs">
                <li>Your order will be assigned to a rider shortly.</li>
                <li>You'll receive tracking updates via email and in‑app notifications.</li>
                <li>You can track your delivery status in the Orders page.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Bottombar />
    </div>
  );
};

export default PaymentSuccess;