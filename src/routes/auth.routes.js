import express from 'express';
import { googleLogin, emailSignup, emailLogin, completeProfile, getProfileStatus } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadDocument } from '../utils/upload.js';

const router = express.Router();

// Google OAuth
router.post('/google-login', googleLogin);

// Email/Password Authentication
router.post('/email/signup', uploadDocument.single('document'), emailSignup);
router.post('/email/login', emailLogin);

// Profile Management
router.post('/complete-profile', protect, uploadDocument.array('documents', 3), completeProfile);
router.get('/profile-status', protect, getProfileStatus);
router.get('/profile', protect, getProfileStatus);

export default router;
