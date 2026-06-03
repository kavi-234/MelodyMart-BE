import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  createServiceRequest,
  getMyServiceRequests,
  getServiceRequestById,
  cancelServiceRequest,
} from '../controllers/serviceRequest.controller.js';

const router = express.Router();

router.post('/', protect, createServiceRequest);
router.get('/my', protect, getMyServiceRequests);
router.get('/:id', protect, getServiceRequestById);
router.patch('/:id/cancel', protect, cancelServiceRequest);

export default router;
