import express from 'express';
import { getVerifiedSpecialists, getAllVerifiedSpecialists, getSpecialistById } from '../controllers/specialist.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { isRepairSpecialist } from '../middleware/role.middleware.js';
import { getSpecialistStats, getSpecialistRequests, updateRequestStatus, getSpecialistEarnings } from '../controllers/specialistDashboard.controller.js';

const router = express.Router();

// Protected dashboard routes (specialist only) — must come before /:id param route
router.get('/dashboard/stats', protect, isRepairSpecialist, getSpecialistStats);
router.get('/dashboard/requests', protect, isRepairSpecialist, getSpecialistRequests);
router.patch('/dashboard/requests/:id/status', protect, isRepairSpecialist, updateRequestStatus);
router.get('/dashboard/earnings', protect, isRepairSpecialist, getSpecialistEarnings);

// Public routes - no authentication required
router.get('/', getVerifiedSpecialists);
router.get('/all', getAllVerifiedSpecialists);
router.get('/:id', getSpecialistById);

export default router;
