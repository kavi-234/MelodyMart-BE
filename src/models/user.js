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
      required: true 
    },
    avatar: String,
    provider: { 
      type: String, 
      default: 'google' 
    },
    role: {
      type: String,
      enum: ['customer', 'tutor', 'repair_specialist'],
      default: 'customer',
      required: true
    },
    // For tutors and repair specialists
    documents: [{
      filename: String,
      path: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    verified: {
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

export default mongoose.model('User', userSchema);
