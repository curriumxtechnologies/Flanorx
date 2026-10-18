// server.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import dns from "dns";

import userRoutes from "./routes/userRoutes.js";
import riderRoutes from "./routes/riderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import trackingRoutes from "./routes/trackingRoutes.js";
import gasRoutes from "./routes/gasRoutes.js";
import waitlistRoutes from "./routes/waitlistRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import emailRoutes from "./routes/emailNotificationRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import {
  publicRouter as stationPublicRoutes,
  stationRouter as stationScopedRoutes,
} from "./routes/stationRoutes.js";

// ⭐ Refill system (3rd-party refill stations)
import {
  refillRoutes,
  refillAdminRoutes,
} from "./routes/refillRoutes.js";
import { protect } from "./middleware/authMiddleware.js";

import {
  startEmailScheduler,
  stopEmailScheduler,
} from "./controllers/emailNotificationController.js";

import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

dotenv.config();

// ✅ Fix DNS SRV resolution issues on Windows/VPN setups
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();
const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URL;

// ✅ Parse JSON with increased limit for base64 images
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ✅ CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "http://localhost:8000",
  "http://localhost",
  "https://localhost",
  "https://flanorx.onrender.com",
  "https://flanorx.vercel.app",
  "https://flanorx.com",
  "https://flanorx-api-6920.onrender.com",
  "https://staging.flanorx.com",
  "https://flanorx-kduo.onrender.com",
  "https://web.flanorx.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("Blocked origin:", origin);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// ✅ Health test endpoint
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend is reachable" });
});

// ✅ Routes
app.use("/api/users", userRoutes);
app.use("/api/riders", riderRoutes);

// ⭐ Refill admin router MUST be mounted BEFORE the general /api/admin
// router, otherwise Express may let adminRoutes swallow /refill/* paths.
// Each refill admin controller re-checks `req.user.role === "admin"`, so
// `protect` alone is enough — `adminOnly` is optional defence-in-depth.
app.use("/api/admin/refill", protect, refillAdminRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/order", orderRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/gas", gasRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/email", emailRoutes); // email status / debug / manual trigger
app.use("/api/notifications", notificationRoutes); // push tokens + send + broadcast
app.use("/api/stations", stationPublicRoutes); // GET /api/stations/nearby
app.use("/api/station", stationScopedRoutes); // everything else under /api/station

// ⭐ Refill system (customer + station-facing endpoints)
app.use("/api/refill", refillRoutes);

// ✅ Error middleware order (notFound first)
app.use(notFound);
app.use(errorHandler);

// ✅ Mongo + server start
mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("✅ Connected to MongoDB");

    const server = app.listen(PORT, "0.0.0.0", () =>
      console.log(`✅ Server running on port ${PORT}`)
    );

    // ✅ Boot the automatic email scheduler
    // Sweeps for pending/unpaid orders every 60s and sends reminder emails.
    // Silently skips if RESEND_API_KEY is not set.
    startEmailScheduler();

    // ─────────────────────────────────────────────────────────
    // ⭐ Refill commission cron jobs
    // ─────────────────────────────────────────────────────────
    // The two admin endpoints below are idempotent and can also be
    // triggered manually from the dashboard:
    //   • POST /api/admin/refill/invoices/generate   (monthly billing)
    //   • POST /api/admin/refill/invoices/run-aging  (daily overdue sweep
    //                                                 + auto-ban past grace)
    //
    // To automate them, install `node-cron` (`npm i node-cron`) and
    // uncomment the block below. The service functions they call are the
    // same handlers the admin endpoints use, so no extra controller code
    // is needed.
    //
    // import cron from "node-cron";
    // import {
    //   adminGenerateInvoicesForPeriod,
    //   adminRunAgingAndAutoBan,
    // } from "./controllers/refillController.js";
    //
    // // 1st of every month @ 01:00 — generate last month's invoices
    // cron.schedule("0 1 1 * *", async () => {
    //   try {
    //     const fakeReq = { user: { role: "admin", _id: null }, body: {} };
    //     const fakeRes = {
    //       status: () => ({ json: (d) => console.log("[refill invoice cron]", d) }),
    //     };
    //     await adminGenerateInvoicesForPeriod(fakeReq, fakeRes, () => {});
    //   } catch (err) {
    //     console.error("[refill invoice cron] failed:", err.message);
    //   }
    // });
    //
    // // Every day @ 02:00 — mark overdue + auto-ban past grace
    // cron.schedule("0 2 * * *", async () => {
    //   try {
    //     const fakeReq = { user: { role: "admin", _id: null }, body: {} };
    //     const fakeRes = {
    //       status: () => ({ json: (d) => console.log("[refill aging cron]", d) }),
    //     };
    //     await adminRunAgingAndAutoBan(fakeReq, fakeRes, () => {});
    //   } catch (err) {
    //     console.error("[refill aging cron] failed:", err.message);
    //   }
    // });
    // ─────────────────────────────────────────────────────────

    // Graceful shutdown so intervals don't keep the process alive
    const shutdown = (signal) => {
      console.log(`\n${signal} received — shutting down cleanly...`);
      stopEmailScheduler();
      server.close(() => {
        mongoose.connection.close(false).finally(() => {
          process.exit(0);
        });
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((err) => console.error("❌ Mongo error:", err.message));