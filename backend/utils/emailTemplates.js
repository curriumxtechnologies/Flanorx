// utils/emailTemplates.js

const BASE_URL = process.env.WEB_URL || "https://web.flanorx.com";
const CONTACT_EMAIL = "flanorx1@gmail.com";

const firstName = (full) => (full || "").split(" ")[0] || "there";

// ═══════════════════════════════════════════════════════════
//  CUSTOMER ORDER TEMPLATES
//  Each entry: (order) => { subject, preheader, body, ctaLabel, ctaUrl }
// ═══════════════════════════════════════════════════════════
export const ORDER_TEMPLATES = {
  // ── Order placed but not paid — sent automatically at 5 min
  pending_reminder: (order) => ({
    subject: `Your Flanorx order #${order.orderId} is waiting`,
    preheader: "Complete payment to get your order on the road.",
    body: `Hi ${firstName(order.user?.name)},

You started an order a few minutes ago, but it's still waiting on payment.

Order #${order.orderId}
Total: ₦${Number(order.totalAmount || 0).toFixed(2)}

Complete payment to get it moving. If you changed your mind, no worries — the order will cancel itself.

Thanks for choosing Flanorx!`,
    ctaLabel: "Complete payment",
    ctaUrl: `${BASE_URL}/order/${order._id}`,
  }),

  // ── Payment confirmed
  paid: (order) => ({
    subject: `Order #${order.orderId} confirmed — thank you!`,
    preheader: "We've received your payment and will start processing shortly.",
    body: `Hi ${firstName(order.user?.name)},

Thank you for your order! We've received your payment for order #${order.orderId}.

What happens next:
• We'll get your order ready
• A rider will pick it up and head your way
• You'll get a QR code to show the rider when they arrive

You can follow progress anytime from your Orders page.

Thanks for choosing Flanorx!`,
    ctaLabel: "View order",
    ctaUrl: `${BASE_URL}/order/${order._id}`,
  }),

  // ── Order now being prepared
  processing: (order) => ({
    subject: `Your order #${order.orderId} is being prepared`,
    preheader: "We're getting your order ready for dispatch.",
    body: `Hi ${firstName(order.user?.name)},

Good news — order #${order.orderId} is now being prepared.

We'll let you know as soon as a rider has picked it up.

Thanks for choosing Flanorx!`,
    ctaLabel: "View order",
    ctaUrl: `${BASE_URL}/order/${order._id}`,
  }),

  // ── Rider accepted (fuel) or station assigned a rider (gas)
  accepted: (order) => ({
    subject: `Your order #${order.orderId} has been accepted`,
    preheader: "A rider is on the way to pick up your order.",
    body: `Hi ${firstName(order.user?.name)},

A rider has accepted order #${order.orderId} and will be picking it up shortly.

Keep an eye on the app — you'll be able to track them in real time.

Thanks for choosing Flanorx!`,
    ctaLabel: "Track order",
    ctaUrl: `${BASE_URL}/tracking/${order._id}`,
  }),

  // ── Rider picked up
  picked_up: (order) => ({
    subject: `Your order #${order.orderId} is on its way`,
    preheader: "Your rider has picked up the order and is heading your way.",
    body: `Hi ${firstName(order.user?.name)},

Your rider has picked up order #${order.orderId} and is heading your way.

You can track their location in real time from the app.

Thanks for choosing Flanorx!`,
    ctaLabel: "Track order",
    ctaUrl: `${BASE_URL}/tracking/${order._id}`,
  }),

  // ── Rider in transit
  in_transit: (order) => ({
    subject: `Your order #${order.orderId} is almost there`,
    preheader: "Your rider is approaching your delivery address.",
    body: `Hi ${firstName(order.user?.name)},

Your rider is on the final stretch to you for order #${order.orderId}.

Please have your QR code ready — the rider will scan it when they arrive to confirm the delivery.

Thanks for choosing Flanorx!`,
    ctaLabel: "Show QR code",
    ctaUrl: `${BASE_URL}/order/${order._id}`,
  }),

  // ── Rider arrived (marked delivered, awaiting QR scan)
  delivered: (order) => ({
    subject: `Your rider has arrived — show your QR code`,
    preheader: "Your rider is at your door. Show them the QR code to complete.",
    body: `Hi ${firstName(order.user?.name)},

Your rider has arrived with order #${order.orderId}.

Open the app and show the rider the QR code for this order. They'll scan it to confirm the delivery.

Thanks for choosing Flanorx!`,
    ctaLabel: "Show QR code",
    ctaUrl: `${BASE_URL}/order/${order._id}`,
  }),

  // ── QR scanned, order complete
  confirmed: (order) => ({
    subject: `Order #${order.orderId} completed — thank you!`,
    preheader: "Your delivery has been confirmed. We hope you enjoyed it.",
    body: `Hi ${firstName(order.user?.name)},

Your order #${order.orderId} has been confirmed and completed.

We hope everything went smoothly. If you have any feedback, just reply to this email or reach us at ${CONTACT_EMAIL}.

We look forward to serving you again!`,
    ctaLabel: "View receipt",
    ctaUrl: `${BASE_URL}/order/${order._id}`,
  }),

  // ── Admin cancelled
  cancelled: (order) => ({
    subject: `Order #${order.orderId} has been cancelled`,
    preheader: "Your order was cancelled. Reach out if you need help.",
    body: `Hi ${firstName(order.user?.name)},

Your order #${order.orderId} has been cancelled.

If this wasn't expected, or you'd like to place a new order, you can do so anytime from the app.

If there was an issue we'd love to hear about it — just reply to this email or reach us at ${CONTACT_EMAIL}.

Thanks for choosing Flanorx!`,
    ctaLabel: "Place a new order",
    ctaUrl: `${BASE_URL}/orders`,
  }),

  // ── Payment failed
  failed: (order) => ({
    subject: `Payment failed for order #${order.orderId}`,
    preheader: "Your payment didn't go through. You can retry from the app.",
    body: `Hi ${firstName(order.user?.name)},

It looks like your payment for order #${order.orderId} didn't go through. This can happen for a few reasons — nothing to worry about.

You can try again from your Orders page. If you keep running into issues, reply to this email or reach us at ${CONTACT_EMAIL} and we'll help you out.

Thanks for choosing Flanorx!`,
    ctaLabel: "Try again",
    ctaUrl: `${BASE_URL}/orders`,
  }),
};

// ═══════════════════════════════════════════════════════════
//  RIDER APPLICATION TEMPLATES
// ═══════════════════════════════════════════════════════════
export const RIDER_TEMPLATES = {
  applied: (user) => ({
    subject: "We've received your rider application",
    preheader: "Your application is under review — we'll be in touch soon.",
    body: `Hi ${firstName(user.name)},

Thanks for applying to become a Flanorx rider. We've received your application and are reviewing it.

We'll get back to you within 1–2 business days. If you need anything in the meantime, just reply to this email or reach us at ${CONTACT_EMAIL}.

Thanks for your interest,
The Flanorx Team`,
    ctaLabel: "Visit Flanorx",
    ctaUrl: BASE_URL,
  }),

  approved: (user) => ({
    subject: "Welcome to the Flanorx rider team!",
    preheader: "Your application has been approved. Sign in to start delivering.",
    body: `Hi ${firstName(user.name)},

Great news — your rider application has been approved. Welcome to the Flanorx rider team!

Sign in to your rider dashboard to start accepting deliveries. You'll find everything you need there — deliveries, earnings, and your profile.

If you have any questions, just reply to this email or reach us at ${CONTACT_EMAIL}.

Ride safe,
The Flanorx Team`,
    ctaLabel: "Open rider dashboard",
    ctaUrl: `${BASE_URL}/rider/dashboard`,
  }),

  rejected: (user, extra = {}) => ({
    subject: "An update on your rider application",
    preheader: "We couldn't approve your application this time.",
    body: `Hi ${firstName(user.name)},

Thank you for applying to become a Flanorx rider. Unfortunately, we're unable to approve your application at this time.

${
  extra.reason ? `Reason: ${extra.reason}\n\n` : ""
}You're welcome to reapply in the future. If you have questions about this decision, just reply to this email or reach us at ${CONTACT_EMAIL}.

Thanks for your interest,
The Flanorx Team`,
    ctaLabel: "Visit Flanorx",
    ctaUrl: BASE_URL,
  }),
};

// ═══════════════════════════════════════════════════════════
//  STATION RIDER TEMPLATES
// ═══════════════════════════════════════════════════════════
export const STATION_RIDER_TEMPLATES = {
  assigned: (order, station) => ({
    subject: `New delivery assigned — order #${order.orderId}`,
    preheader: `${station?.name || "Your station"} assigned you a delivery.`,
    body: `Hi there,

You've been assigned a new delivery by ${station?.name || "your station"}.

Order #${order.orderId}${
      order.deliveryAddress
        ? `\nDeliver to: ${order.deliveryAddress}`
        : "\nFulfillment: customer pickup"
    }

Open your rider app to accept and start the delivery.

Ride safe,
The Flanorx Team`,
    ctaLabel: "View delivery",
    ctaUrl: `${BASE_URL}/rider/deliveries`,
  }),
};

export const TEMPLATE_REGISTRY = {
  order: Object.keys(ORDER_TEMPLATES),
  rider: Object.keys(RIDER_TEMPLATES),
  stationRider: Object.keys(STATION_RIDER_TEMPLATES),
};