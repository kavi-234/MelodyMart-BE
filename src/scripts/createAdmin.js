import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';
import { hashPassword } from '../utils/hash.js';

// Load environment variables
dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/melodymart');
    console.log('Connected to MongoDB');

    // Admin credentials
    const adminEmail = 'admin@melodymart.com';
    const adminPassword = 'Admin@123'; // Change this to a secure password
    const adminName = 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      // Update existing admin to have verificationStatus if missing
      if (!existingAdmin.verificationStatus) {
        existingAdmin.verificationStatus = 'approved';
        existingAdmin.isVerified = true;
        await existingAdmin.save();
        console.log('✅ Admin user updated with verification status!');
      } else {
        console.log('Admin user already exists!');
      }
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Role: ${existingAdmin.role}`);
      console.log(`Verification Status: ${existingAdmin.verificationStatus}`);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await hashPassword(adminPassword);

    // Create admin user
    const adminUser = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      authProvider: 'local',
      role: 'admin',
      isVerified: true,
      verificationStatus: 'approved'
    });

    console.log('✅ Admin user created successfully!');
    console.log('-----------------------------------');
    console.log(`Email: ${adminUser.email}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`Status: ${adminUser.isVerified ? 'Verified' : 'Not Verified'}`);
    console.log('-----------------------------------');
    console.log('⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
