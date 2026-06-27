import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./models/adminModel.js";

// Load environment variables
dotenv.config();

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URL;
    
    if (!mongoUri) {
      console.error("❌ MONGO_URL is not defined in your .env file");
      console.log("Make sure you have a .env file with MONGO_URL=your_mongodb_connection_string");
      process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const adminEmail = "admin@flanorx.com";
    const adminPassword = "flanorxadmin";
    
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log(`⚠️ Admin already exists: ${adminEmail}`);
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Role: ${existingAdmin.role}`);
    } else {
      const admin = await Admin.create({
        name: "Admin User",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        isVerified: true,
        authMethod: "local",
      });
      
      console.log("✅ Admin created successfully!");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Role: ${admin.role}`);
      console.log("");
      console.log("⚠️ Please change the password after first login!");
    }
    
  } catch (error) {
    console.error("❌ Error seeding admin:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("Connection closed");
    process.exit(0);
  }
};

seedAdmin();