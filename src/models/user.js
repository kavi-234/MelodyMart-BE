import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      unique: true, 
      required: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: function() {
        return this.authProvider === 'local';
      }
    },
    avatar: String,
    authProvider: { 
      type: String,
      enum: ['google', 'local'],
      default: 'google',
      required: true
    },
    googleId: {
      type: String,
      sparse: true // Allows null values but ensures uniqueness for non-null values
    },
    role: {
      type: String,
      enum: ['customer', 'tutor', 'repair_specialist'],
      default: 'customer',
      required: true
    },
    documentUrl: String, // Single document URL for license/certificate
    isVerified: {
      type: Boolean,
      default: false
    },
    // Professional details for tutors
    specialization: String, // e.g., Piano, Guitar, Violin
    experience: Number, // years of experience
    hourlyRate: Number,
    bio: String,
    // For repair specialists
    certifications: [String],
    serviceTypes: [String], // e.g., String Instruments, Wind Instruments
  },
  { timestamps: true }
);

// Ensure googleId is unique when provided
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

export default mongoose.model('User', userSchema);
