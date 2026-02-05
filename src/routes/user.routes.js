import express from 'express';
import User from '../models/user.js';
import { protect } from '../middleware/auth.middleware.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
});

// GET /api/me - Get current user profile (safe fields only)
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return only safe user data
    const safeUserData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      authProvider: user.authProvider,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      specialization: user.specialization,
      experience: user.experience,
      hourlyRate: user.hourlyRate,
      bio: user.bio,
      serviceTypes: user.serviceTypes,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({ user: safeUserData });
  } catch (error) {
    console.error('Get User Profile Error:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// PATCH /api/me - Update current user profile (whitelist allowed fields only)
router.patch('/', protect, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Whitelist of allowed update fields
    const allowedUpdates = ['name', 'phone'];
    
    // Add role-specific fields
    if (user.role === 'repair_specialist') {
      allowedUpdates.push('experience', 'specialization');
    }
    
    const updates = {};

    // Only allow whitelisted fields
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle avatar upload
    if (req.file) {
      // Store avatar as base64 or you can upload to cloud storage
      const avatarBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      updates.avatar = avatarBase64;
    }

    // Validate name if provided
    if (updates.name && updates.name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters long' });
    }

    // Validate phone if provided
    if (updates.phone && updates.phone.trim().length > 0) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
      if (!phoneRegex.test(updates.phone)) {
        return res.status(400).json({ message: 'Invalid phone number format' });
      }
    }

    // Reject any attempts to change protected fields
    const protectedFields = ['email', 'role', 'password', 'isVerified', 'verificationStatus', 'authProvider'];
    const attemptedProtectedUpdates = protectedFields.filter(field => req.body[field] !== undefined);
    
    if (attemptedProtectedUpdates.length > 0) {
      return res.status(403).json({ 
        message: `Cannot update protected fields: ${attemptedProtectedUpdates.join(', ')}` 
      });
    }

    // Apply updates
    Object.assign(user, updates);
    await user.save();

    // Return safe user data
    const safeUserData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      authProvider: user.authProvider,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      specialization: user.specialization,
      experience: user.experience,
      hourlyRate: user.hourlyRate,
      bio: user.bio,
      serviceTypes: user.serviceTypes,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({ 
      message: 'Profile updated successfully',
      user: safeUserData 
    });
  } catch (error) {
    console.error('Update User Profile Error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

export default router;
