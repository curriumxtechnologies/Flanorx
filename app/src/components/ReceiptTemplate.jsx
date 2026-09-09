// src/components/ReceiptTemplate.jsx
import React, { forwardRef } from "react";

const formatCurrency = (amount) => {
  const value = Number(amount) || 0;
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date) => {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (date) => {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getItemDescription = (order) => {
  if (!order) return "Order";
  if (order.orderType === "fuel") {
    return `${order.fuelType || "Fuel"} Delivery – ${order.quantity ?? "-"} L`;
  }
  if (order.orderType === "gas") {
    const size = order.gasDetails?.cylinderSize || "-";
    const qty = order.gasDetails?.quantityKg ?? "-";
    const isNew = order.gasDetails?.isFirstTime ? " (New Cylinder)" : "";
    return `Gas Delivery – ${size}, ${qty} kg${isNew}`;
  }
  return order.orderType
    ? `${order.orderType.charAt(0).toUpperCase()}${order.orderType.slice(1)} Order`
    : "Order";
};

/**
 * Off-screen, print-style letterhead receipt.
 * This is rendered invisibly and captured by html2canvas — it is never
 * shown directly to the user, so it uses fixed inline styles (not Tailwind
 * dark-mode classes) to guarantee it always renders as a clean, light,
 * corporate document regardless of the app's theme.
 */
const ReceiptTemplate = forwardRef(({ order, reference, isSubscription, paymentData }, ref) => {
  const receiptNumber = order?.orderId || reference || "N/A";
  const dateSource = order?.createdAt || paymentData?.paidAt || new Date();

  return (
    <div
      ref={ref}
      style={{
        width: "800px",
        backgroundColor: "#ffffff",
        color: "#1a1a1a",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* ── Letterhead ─────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "40px 48px 24px 48px",
          borderBottom: "4px solid #13ec5b",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
          <img
            src="/flanorx.png"
            alt="Flanorx"
            crossOrigin="anonymous"
            style={{ height: "56px", width: "auto", objectFit: "contain" }}
          />
          <div
            style={{
              fontSize: "11px",
              color: "#6b7280",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Fuel &amp; Gas Delivery Services
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "11px", color: "#6b7280", lineHeight: 1.6 }}>
          <div>Port Harcourt, Rivers State, Nigeria</div>
          <div>support@flanorx.com</div>
          <div>www.flanorx.com</div>
        </div>
      </div>

      {/* ── Title Row ──────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "28px 48px 0 48px",
        }}
      >
        <div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#111827" }}>
            {isSubscription ? "SUBSCRIPTION RECEIPT" : "PAYMENT RECEIPT"}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            Receipt No: <span style={{ fontWeight: 600, color: "#111827" }}>#{receiptNumber}</span>
          </div>
        </div>

        <div
          style={{
            border: "2px solid #13ec5b",
            borderRadius: "6px",
            padding: "6px 18px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#0f9c46",
            letterSpacing: "1px",
            textTransform: "uppercase",
            transform: "rotate(3deg)",
          }}
        >
          Paid
        </div>
      </div>

      {/* ── Meta Info ──────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          padding: "24px 48px 0 48px",
          fontSize: "12px",
        }}
      >
        <div>
          <div
            style={{
              color: "#9ca3af",
              textTransform: "uppercase",
              fontSize: "10px",
              letterSpacing: "0.5px",
              marginBottom: "4px",
            }}
          >
            Payment Reference
          </div>
          <div style={{ fontWeight: 600, color: "#111827" }}>{reference || "N/A"}</div>
        </div>
        <div>
          <div
            style={{
              color: "#9ca3af",
              textTransform: "uppercase",
              fontSize: "10px",
              letterSpacing: "0.5px",
              marginBottom: "4px",
            }}
          >
            Date &amp; Time
          </div>
          <div style={{ fontWeight: 600, color: "#111827" }}>
            {formatDate(dateSource)} · {formatTime(dateSource)}
          </div>
        </div>
        <div>
          <div
            style={{
              color: "#9ca3af",
              textTransform: "uppercase",
              fontSize: "10px",
              letterSpacing: "0.5px",
              marginBottom: "4px",
            }}
          >
            Order Type
          </div>
          <div style={{ fontWeight: 600, color: "#111827", textTransform: "capitalize" }}>
            {isSubscription ? "Gas Subscription" : order?.orderType || "N/A"}
          </div>
        </div>
        <div>
          <div
            style={{
              color: "#9ca3af",
              textTransform: "uppercase",
              fontSize: "10px",
              letterSpacing: "0.5px",
              marginBottom: "4px",
            }}
          >
            Delivery Status
          </div>
          <div style={{ fontWeight: 600, color: "#111827", textTransform: "capitalize" }}>
            {order?.deliveryStatus || "Processing"}
          </div>
        </div>
      </div>

      {/* ── Delivery Address ───────────────────────────────── */}
      {order?.deliveryAddress && (
        <div style={{ padding: "20px 48px 0 48px", fontSize: "12px" }}>
          <div
            style={{
              color: "#9ca3af",
              textTransform: "uppercase",
              fontSize: "10px",
              letterSpacing: "0.5px",
              marginBottom: "4px",
            }}
          >
            Delivery Address
          </div>
          <div style={{ fontWeight: 600, color: "#111827" }}>{order.deliveryAddress}</div>
        </div>
      )}

      {/* ── Items Table ────────────────────────────────────── */}
      <div style={{ padding: "28px 48px 0 48px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "#111827" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Description
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "10px 12px",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "14px 12px", color: "#111827" }}>{getItemDescription(order)}</td>
              <td style={{ padding: "14px 12px", textAlign: "right", color: "#111827", fontWeight: 600 }}>
                {formatCurrency(order?.totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Totals ───────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
          <div style={{ width: "260px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 12px",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              <span>Subtotal</span>
              <span>{formatCurrency(order?.totalAmount)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px",
                marginTop: "6px",
                backgroundColor: "#f0fdf4",
                borderRadius: "6px",
                border: "1px solid #13ec5b",
              }}
            >
              <span style={{ fontWeight: 700, color: "#111827" }}>Total Paid</span>
              <span style={{ fontWeight: 700, color: "#0f9c46" }}>{formatCurrency(order?.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div style={{ padding: "36px 48px 40px 48px" }}>
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "20px",
            fontSize: "11px",
            color: "#6b7280",
            lineHeight: 1.7,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>Thank you for choosing Flanorx.</p>
          <p style={{ margin: "4px 0 0 0" }}>
            This is a computer-generated receipt and does not require a signature. For enquiries regarding this
            transaction, please contact our support team and quote the payment reference above.
          </p>
        </div>
        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "10px",
            color: "#9ca3af",
            letterSpacing: "0.5px",
          }}
        >
          FLANORX · GENERATED ON {formatDate(new Date())} AT {formatTime(new Date())}
        </div>
      </div>
    </div>
  );
});

ReceiptTemplate.displayName = "ReceiptTemplate";

export default ReceiptTemplate;