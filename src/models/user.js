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
      unique: true,
      sparse: true // Allows null values but ensures uniqueness for non-null values
    },
    role: {
      type: String,
      enum: ['PENDING', 'customer', 'tutor', 'repair_specialist', 'admin'],
      default: 'PENDING',
      required: true
    },
    documentUrl: String, // Single document URL for license/certificate
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationStatus: {
      type: String,
      enum: ['NONE', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
      default: 'NONE'
    },
    verificationDocuments: [{
      fileUrl: String,
      fileName: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    adminNotes: String, // Notes from admin about verification
    profileCompleted: {
      type: Boolean,
      default: false
    },
    // Professional details for tutors
    specialization: String, // e.g., Piano, Guitar, Violin
    experience: Number, // years of experience
    hourlyRate: Number,
    bio: String,
    // For repair specialists
    certifications: String, // Comma-separated or text
    serviceTypes: String, // Comma-separated or text
    // For customers
    phone: String,
    address: String
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
