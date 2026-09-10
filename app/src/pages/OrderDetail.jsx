// src/pages/OrderDetail.jsx
import React, { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Package,
  Flame,
  MapPin,
  Calendar,
  Clock,
  Truck,
  User,
  Mail,
  Phone,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Receipt,
  DollarSign,
  ArrowRight,
  Download,
  FileImage,
} from "lucide-react";
import { useGetOrderByIdQuery } from "../features/orderApiSlice";
import Sidebar from "../components/Sidebar";
import Bottombar from "../components/Bottombar";
import ReceiptTemplate from "../components/ReceiptTemplate";

const OrderDetail = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();

  // ─── Query ──────────────────────────────────────────────
  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useGetOrderByIdQuery(orderId, {
    skip: !orderId,
  });

  const receiptRef = useRef(null);
  const [generating, setGenerating] = useState(null); // "pdf" | "jpg" | null
  const [downloadError, setDownloadError] = useState("");

  // ─── Status colors ──────────────────────────────────────
  const getOrderStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "processing": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "completed": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "failed": return "bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "accepted": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "picked_up": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "in_transit": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "delivered": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "confirmed": return "bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
      case "completed":
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
      case "failed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // ─── Timeline events ────────────────────────────────────
  const getTimeline = (order) => {
    const events = [];
    if (order.createdAt) {
      events.push({
        label: "Order Placed",
        date: order.createdAt,
        icon: <Package className="h-4 w-4" />,
      });
    }
    if (order.acceptedAt) {
      events.push({
        label: "Accepted by Rider",
        date: order.acceptedAt,
        icon: <Truck className="h-4 w-4" />,
      });
    }
    if (order.pickedUpAt) {
      events.push({
        label: "Picked Up",
        date: order.pickedUpAt,
        icon: <Package className="h-4 w-4" />,
      });
    }
    if (order.deliveredAt) {
      events.push({
        label: "Delivered",
        date: order.deliveredAt,
        icon: <CheckCircle className="h-4 w-4" />,
      });
    }
    if (order.customerConfirmedAt) {
      events.push({
        label: "Confirmed by Customer",
        date: order.customerConfirmedAt,
        icon: <CheckCircle className="h-4 w-4" />,
      });
    }
    if (order.completedAt) {
      events.push({
        label: "Completed",
        date: order.completedAt,
        icon: <CheckCircle className="h-4 w-4" />,
      });
    }
    return events;
  };

  const formatDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFullDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ─── Receipt download handler ───────────────────────────────
  // Gated only on payment — the order does not need to be "completed".
  const handleDownloadReceipt = async (format) => {
    if (!order || !receiptRef.current) return;

    setDownloadError("");
    setGenerating(format);

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const fileBase = `Flanorx-Receipt-${order.orderId || order._id}`;

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

  // ─── Loading ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#13ec5b]" />
            </div>
          </div>
        </div>
        <Bottombar />
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Order not found</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {error?.data?.message || "The order you're looking for doesn't exist."}
                </p>
                <button
                  onClick={() => navigate("/orders")}
                  className="mt-4 px-6 py-2 bg-[#13ec5b] text-white rounded-lg hover:bg-[#10d04e] transition inline-flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" /> Back to Orders
                </button>
              </div>
            </div>
          </div>
        </div>
        <Bottombar />
      </div>
    );
  }

  const timeline = getTimeline(order);
  const canDownloadReceipt = !!order.paid;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:py-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:text-xl">
              Order #{order.orderId}
            </h1>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <Loader2 className={`h-5 w-5 text-gray-500 dark:text-gray-400 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </header>

        <div className="w-full px-0.5 sm:px-4 lg:px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-5">

            {/* ─── Status Banner ────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}
                  >
                    {getStatusIcon(order.status)}
                    {order.status || "pending"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getDeliveryStatusColor(order.deliveryStatus)}`}
                  >
                    {getStatusIcon(order.deliveryStatus)}
                    Delivery: {order.deliveryStatus || "pending"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Paid:</span>
                  {order.paid ? (
                    <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Yes
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                      <XCircle className="h-4 w-4" /> No
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Grid: Order Info ──────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left: Main Details */}
              <div className="lg:col-span-2 space-y-5">
                {/* Order Type Card */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      {order.orderType === "fuel" ? (
                        <Flame className="h-5 w-5 text-[#13ec5b]" />
                      ) : (
                        <Package className="h-5 w-5 text-[#13ec5b]" />
                      )}
                      {order.orderType === "fuel" ? "Fuel Order" : "Gas Order"}
                    </h3>
                  </div>
                  <div className="p-4 space-y-3 text-sm">
                    {order.orderType === "fuel" ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Fuel Type</span>
                          <span className="text-gray-900 dark:text-white">{order.fuelType || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Quantity</span>
                          <span className="text-gray-900 dark:text-white">{order.quantity || 0} L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Price per Liter</span>
                          <span className="text-gray-900 dark:text-white">₦{order.fuelPricePerLiter?.toFixed(2) || "0.00"}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Cylinder Size</span>
                          <span className="text-gray-900 dark:text-white">{order.gasDetails?.cylinderSize || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Quantity</span>
                          <span className="text-gray-900 dark:text-white">{order.gasDetails?.quantityKg || 0} kg</span>
                        </div>
                        {order.gasDetails?.isFirstTime && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">New Cylinder</span>
                            <span className="text-green-600 dark:text-green-400">Yes</span>
                          </div>
                        )}
                        {order.subscriptionDueDate && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Subscription Due</span>
                            <span className="text-gray-900 dark:text-white">{formatDate(order.subscriptionDueDate)}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-2">
                      <span className="text-gray-500 dark:text-gray-400">Order Date</span>
                      <span className="text-gray-900 dark:text-white">{formatFullDate(order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Card */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-[#13ec5b]" />
                      Delivery Details
                    </h3>
                  </div>
                  <div className="p-4 space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Address</span>
                      <p className="text-gray-900 dark:text-white">{order.deliveryAddress || "—"}</p>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Schedule</span>
                      <span className="text-gray-900 dark:text-white capitalize">{order.scheduleType || "now"}</span>
                    </div>
                    {order.scheduleType === "scheduled" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Scheduled Date</span>
                          <span className="text-gray-900 dark:text-white">{formatDate(order.scheduledDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Scheduled Time</span>
                          <span className="text-gray-900 dark:text-white">{order.scheduledTime || "—"}</span>
                        </div>
                      </>
                    )}
                    {order.estimatedDeliveryMinutes && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Est. Delivery</span>
                        <span className="text-gray-900 dark:text-white">{order.estimatedDeliveryMinutes} minutes</span>
                      </div>
                    )}
                    {order.notes && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Notes</span>
                        <p className="text-gray-900 dark:text-white">{order.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Card */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-5 w-5 text-[#13ec5b]" />
                      Timeline
                    </h3>
                  </div>
                  <div className="p-4">
                    {timeline.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No events yet</p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="space-y-4">
                          {timeline.map((event, idx) => (
                            <div key={idx} className="relative pl-10">
                              <div className="absolute left-0 top-0.5 w-8 h-8 rounded-full bg-[#13ec5b]/10 flex items-center justify-center text-[#13ec5b]">
                                {event.icon}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{event.label}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatFullDate(event.date)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Summary */}
              <div className="space-y-5">
                {/* Pricing Card */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-[#13ec5b]" />
                      Pricing
                    </h3>
                  </div>
                  <div className="p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                      <span className="text-gray-900 dark:text-white">₦{order.subtotal?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Delivery Fee</span>
                      <span className="text-gray-900 dark:text-white">₦{order.deliveryFee?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Service Tax</span>
                      <span className="text-gray-900 dark:text-white">₦{order.serviceTax?.toFixed(2) || "0.00"}</span>
                    </div>
                    {order.riderCommission > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Rider Commission</span>
                        <span className="text-gray-900 dark:text-white">₦{order.riderCommission?.toFixed(2) || "0.00"}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                      <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                      <span className="text-xl font-bold text-[#13ec5b]">₦{order.totalAmount?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>
                </div>

                {/* Receipt Card — available once paid, regardless of completion status */}
                {canDownloadReceipt && (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-[#13ec5b]" />
                        Receipt
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => handleDownloadReceipt("pdf")}
                          disabled={generating !== null}
                          className="w-full py-2.5 border border-[#13ec5b] text-[#0f9c46] dark:text-[#13ec5b] rounded-lg font-medium transition flex items-center justify-center gap-2 hover:bg-[#13ec5b]/10 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {generating === "pdf" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Download PDF
                        </button>
                        <button
                          onClick={() => handleDownloadReceipt("jpg")}
                          disabled={generating !== null}
                          className="w-full py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {generating === "jpg" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileImage className="h-4 w-4" />
                          )}
                          Download JPG
                        </button>
                      </div>
                      {downloadError && <p className="text-xs text-red-500 mt-2">{downloadError}</p>}
                    </div>
                  </div>
                )}

                {/* Customer Card */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <User className="h-5 w-5 text-[#13ec5b]" />
                      Customer
                    </h3>
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <p className="font-medium text-gray-900 dark:text-white">{order.user?.name || "Unknown"}</p>
                    <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" /> {order.user?.email || "—"}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {order.user?.phone || "—"}
                    </p>
                  </div>
                </div>

                {/* Rider Card */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Truck className="h-5 w-5 text-[#13ec5b]" />
                      Rider
                    </h3>
                  </div>
                  <div className="p-4">
                    {order.rider ? (
                      <div className="space-y-2 text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">{order.rider.name || "Rider"}</p>
                        <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" /> {order.rider.email || "—"}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {order.rider.phone || "—"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No rider assigned yet</p>
                    )}
                  </div>
                </div>

                {/* Payment Card */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-[#13ec5b]" />
                      Payment
                    </h3>
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Status</span>
                      {order.paid ? (
                        <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" /> Paid
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                          <XCircle className="h-4 w-4" /> Unpaid
                        </span>
                      )}
                    </div>
                    {order.paymentMethod && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Method</span>
                        <span className="text-gray-900 dark:text-white capitalize">{order.paymentMethod}</span>
                      </div>
                    )}
                    {order.paymentDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Date</span>
                        <span className="text-gray-900 dark:text-white">{formatFullDate(order.paymentDate)}</span>
                      </div>
                    )}
                    {order.paymentReference && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Reference</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400 break-all">{order.paymentReference}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!order.paid && order.status !== "cancelled" && (
                  <button
                    onClick={() => navigate(`/payment/initiate/${order._id}`)}
                    className="w-full py-3 bg-[#13ec5b] hover:bg-[#10d04e] text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <CreditCard className="h-5 w-5" /> Pay Now
                  </button>
                )}

                <button
                  onClick={() => navigate("/orders")}
                  className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2"
                >
                  <Package className="h-5 w-5" /> View All Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Bottombar />

      {/* ── Off-screen receipt used as the html2canvas source ──── */}
      {canDownloadReceipt && (
        <div style={{ position: "fixed", top: 0, left: "-10000px", pointerEvents: "none" }} aria-hidden="true">
          <ReceiptTemplate
            ref={receiptRef}
            order={order}
            reference={order.paymentReference || order.orderId}
            isSubscription={false}
            paymentData={null}
          />
        </div>
      )}
    </div>
  );
};

export default OrderDetail;