import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';

dotenv.config();

const fixAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/melodymart');
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ email: 'admin@melodymart.com' });
    
    if (!admin) {
      console.log('❌ Admin not found');
      process.exit(1);
    }

    admin.verificationStatus = 'approved';
    admin.isVerified = true;
    await admin.save();

    console.log('✅ Admin user fixed!');
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    console.log(`Verification Status: ${admin.verificationStatus}`);
    console.log(`Is Verified: ${admin.isVerified}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixAdmin();
