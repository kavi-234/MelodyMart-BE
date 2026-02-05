import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';

// Load environment variables
dotenv.config();

const clearUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/melodymart');
    console.log('Connected to MongoDB');

    // Delete all users except admin
    const result = await User.deleteMany({ 
      role: { $ne: 'admin' } 
    });

    console.log(`✅ Deleted ${result.deletedCount} users (kept admin users)`);

    // Optionally, to delete ALL users including admin:
    // const result = await User.deleteMany({});
    // console.log(`✅ Deleted ${result.deletedCount} users (including admin)`);

    process.exit(0);
  } catch (error) {
    console.error('Error clearing users:', error);
    process.exit(1);
  }
};

clearUsers();
