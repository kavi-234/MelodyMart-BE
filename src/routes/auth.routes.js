import express from 'express';
import { googleLogin, emailSignup, emailLogin, completeProfile, getProfileStatus } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = 'uploads/documents/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'document-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Explicit mimetype allowlist
    const allowedMimetypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const allowedExtensions = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.includes(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg, .jpeg, .pdf, .doc, and .docx files are allowed!'));
  }
});

// Google OAuth
router.post('/google-login', googleLogin);

// Email/Password Authentication
router.post('/email/signup', upload.single('document'), emailSignup);
router.post('/email/login', emailLogin);

// Profile Management
router.post('/complete-profile', protect, upload.array('documents', 3), completeProfile);
router.get('/profile-status', protect, getProfileStatus);
router.get('/profile', protect, getProfileStatus); // Alias for refreshUser

export default router;
