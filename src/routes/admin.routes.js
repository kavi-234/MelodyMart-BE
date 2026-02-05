import express from 'express';
import { verifyUser, getPendingUsers, getAllUsers } from '../controllers/admin.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/role.middleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, isAdmin);

// Verify or reject a user
router.patch('/verify-user/:userId', verifyUser);

// Get all pending verification users
router.get('/pending-users', getPendingUsers);

// Get all users with optional filters
router.get('/users', getAllUsers);

export default router;
