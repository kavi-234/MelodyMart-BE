import express from 'express';
import { googleLogin, completeProfile, getProfile } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

router.post('/google-login', googleLogin);
router.post('/complete-profile', protect, upload.array('documents', 5), completeProfile);
router.get('/profile', protect, getProfile);

export default router;
