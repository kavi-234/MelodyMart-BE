import express from 'express';
import { googleLogin, emailSignup, emailLogin } from '../controllers/auth.controller.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

// Google OAuth
router.post('/google-login', googleLogin);

// Email/Password Authentication
router.post('/email/signup', upload.single('document'), emailSignup);
router.post('/email/login', emailLogin);

export default router;
