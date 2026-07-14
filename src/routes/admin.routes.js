import express from 'express';
import {
  getAdminStats,
  verifyUser,
  getPendingUsers,
  getAllUsers,
  deleteUser,
  getAllOrders,
  refundOrder,
  completeOrder,
  getAllInstruments,
  addInstrument,
  deleteInstrument
} from '../controllers/admin.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/role.middleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, isAdmin);

// Dashboard stats
router.get('/dashboard/stats', getAdminStats);

// User management
router.patch('/verify-user/:userId', verifyUser);
router.get('/pending-users', getPendingUsers);
router.get('/users', getAllUsers);
router.delete('/users/:userId', deleteUser);

// Order management
router.get('/orders', getAllOrders);
router.patch('/orders/:orderId/refund', refundOrder);
router.patch('/orders/:orderId/complete', completeOrder);

// Instrument management
router.get('/instruments', getAllInstruments);
router.post('/instruments', addInstrument);
router.delete('/instruments/:instrumentId', deleteInstrument);

export default router;
