import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { initiatePayHereCheckout, handlePayHereNotify, getMyOrders, getMyOrderByOrderId, reconcileOrder } from '../controllers/payment.controller.js';

const router = express.Router();

router.post('/payhere/initiate', protect, initiatePayHereCheckout);
router.post('/payhere/notify', handlePayHereNotify);
router.post('/orders/:orderId/reconcile', protect, reconcileOrder);
router.get('/orders', protect, getMyOrders);
router.get('/orders/:orderId', protect, getMyOrderByOrderId);

export default router;