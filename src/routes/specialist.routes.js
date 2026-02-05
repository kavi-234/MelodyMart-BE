import express from 'express';
import { getVerifiedSpecialists, getAllVerifiedSpecialists, getSpecialistById } from '../controllers/specialist.controller.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/', getVerifiedSpecialists);
router.get('/all', getAllVerifiedSpecialists);
router.get('/:id', getSpecialistById);

export default router;
