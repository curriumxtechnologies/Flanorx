// models/orderModel.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: () =>
        `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    orderYear: { type: Number, required: true },
    orderMonth: { type: Number, required: true, min: 1, max: 12 },

    orderType: {
      type: String,
      required: true,
      enum: ["fuel", "gas"],
    },

    // ⭐ Which station fulfills this gas order (null for fuel)
    station: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      default: null,
      index: true,
    },

    // ⭐ Gas only — how the customer gets the cylinder
    fulfillmentType: {
      type: String,
      enum: ["delivery", "pickup", null],
      default: null,
    },

    fuelType: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (this.orderType !== "fuel") return true;
          const valid = ["Petrol", "Diesel", "Petrol (95 Octane)"];
          return valid.includes(v);
        },
        message: (props) => `${props.value} is not a valid fuel type.`,
      },
    },
    fuelPricePerLiter: { type: Number, min: 0 },
    quantity: { type: Number, min: 0 },
    fillingStation: { type: String, trim: true },

    gasDetails: {
      cylinderSize: { type: String, enum: ["3kg", "6kg", "12kg"] },
      quantityKg: { type: Number, min: 0 },
      isFirstTime: { type: Boolean, default: false },
      cylinderCost: { type: Number, min: 0, default: 0 },
      gasContentCost: { type: Number, min: 0, default: 0 },
      cylinderSerialNumber: { type: String, trim: true, default: null },
      previousCylinderSize: { type: String, default: null },
      upgradeCost: { type: Number, default: 0 },
    },

    subscriptionDueDate: { type: Date, default: null },
    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },

    deliveryAddress: { type: String, trim: true, default: "" },
    deliveryCoordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    scheduleType: {
      type: String,
      required: true,
      enum: ["now", "scheduled"],
      default: "now",
    },
    scheduledDate: { type: Date, default: null },
    scheduledTime: { type: String, default: "" },
    estimatedDeliveryMinutes: { type: Number, min: 0, default: null },

    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    serviceTax: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    paid: { type: Boolean, required: true, default: false },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer", "wallet"],
      default: "card",
    },
    paymentReference: { type: String, trim: true, default: "" },
    paymentDate: { type: Date, default: null },

    status: {
      type: String,
      required: true,
      default: "pending",
      enum: ["pending", "processing", "completed", "cancelled", "failed"],
    },
    deliveryStatus: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "picked_up",
        "in_transit",
        "delivered",
        "confirmed",
      ],
      default: "pending",
    },
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    riderCommission: { type: Number, default: 0, min: 0 },
    commissionPaidToRider: { type: Boolean, default: false },
    deliveryAcceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ⭐ Who assigned the rider (station admin / staff), for audit
    riderAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    riderAssignedAt: { type: Date, default: null },

    // ⭐ QR verification (fuel + gas)
    verificationToken: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      trim: true,
    },
    verificationScannedAt: { type: Date, default: null },
    verificationScannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    acceptedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    customerConfirmedAt: { type: Date, default: null },

    notes: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

// ─── Pre‑validate hook (synchronous) ──────────────────────────
orderSchema.pre("validate", function () {
  const d = this.date ? new Date(this.date) : new Date();
  this.orderYear = d.getFullYear();
  this.orderMonth = d.getMonth() + 1;

  if (this.scheduleType === "scheduled" && !this.scheduledDate) {
    throw new Error(
      "Scheduled date is required when schedule type is 'scheduled'"
    );
  }

  if (this.orderType === "fuel") {
    if (!this.fuelType || !this.quantity) {
      throw new Error("fuelType and quantity are required for fuel orders");
    }
    if (!this.fillingStation) {
      this.fillingStation = "Flanorx Depot";
    }
    // Fuel orders never belong to a station
    if (this.station) this.station = null;
    if (this.fulfillmentType) this.fulfillmentType = null;
  }

  if (this.orderType === "gas") {
    if (
      !this.gasDetails ||
      !this.gasDetails.cylinderSize ||
      !this.gasDetails.quantityKg
    ) {
      throw new Error(
        "gasDetails with cylinderSize and quantityKg are required for gas orders"
      );
    }
    if (!this.fulfillmentType) this.fulfillmentType = "delivery";

    if (this.gasDetails.isFirstTime) {
      const due = new Date();
      due.setDate(due.getDate() + 30);
      this.subscriptionDueDate = due;
      this.subscriptionStatus = "active";
    }
  }
});

// ─── Mark as paid method ────────────────────────────────────
orderSchema.methods.markAsPaid = function (paymentReference, paymentMethod) {
  this.paid = true;
  this.paymentDate = new Date();
  this.paymentReference = paymentReference;
  this.paymentMethod = paymentMethod;
  this.status = "processing";
  this.deliveryStatus = "pending";
  return this.save();
};

// ─── Static price calculation (for fuel only) ──────────────
orderSchema.statics.calculatePrice = function (fuelType, quantity) {
  const prices = {
    Petrol: 850,
    "Petrol (95 Octane)": 850,
    Diesel: 1320,
  };
  const pricePerLiter = prices[fuelType] || 0;
  const subtotal = pricePerLiter * quantity;
  const deliveryFee = 4.99;
  const serviceTax = subtotal * 0.05;
  const total = subtotal + deliveryFee + serviceTax;
  return { pricePerLiter, subtotal, deliveryFee, serviceTax, total };
};

// ─── Indexes ────────────────────────────────────────────────
orderSchema.index({ user: 1, orderYear: 1, orderMonth: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paid: 1 });
orderSchema.index({ deliveryStatus: 1 });
orderSchema.index({ rider: 1, deliveryStatus: 1, status: 1 });
orderSchema.index({ paid: 1, rider: 1, deliveryStatus: 1 });
orderSchema.index({ orderType: 1 });
orderSchema.index({ subscriptionDueDate: 1 });
orderSchema.index({ station: 1, status: 1, createdAt: -1 });

// NOTE: `verificationToken` already has `unique: true, sparse: true` in the
// field definition above, which creates the index. Do NOT add a
// `orderSchema.index({ verificationToken: 1 }, ...)` line — that would
// trigger the "Duplicate schema index" mongoose warning.

const Order = mongoose.model("Order", orderSchema);

export default Order;