import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/orderModel.js";
import Track from "../models/trackModel.js";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");

  const orders = await Order.find({
    rider: { $ne: null },
    deliveryStatus: { $in: ["accepted", "picked_up", "in_transit"] },
  });

  console.log(`Found ${orders.length} accepted orders to check`);

  let created = 0;
  for (const order of orders) {
    const existing = await Track.findOne({ order: order._id });
    if (!existing) {
      await Track.create({
        order: order._id,
        user: order.user,
        rider: order.rider,
        status: "active",
      });
      created++;
      console.log(`Created tracking for order ${order._id}`);
    }
  }

  console.log(`✅ Done. Created ${created} tracking records.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});