import express from 'express';
import {
  createLesson,
  getAllLessons,
  getTutorLessons,
  getLesson,
  updateLesson,
  deleteLesson,
  enrollInLesson
} from '../controllers/lesson.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkRole } from '../middleware/role.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllLessons);

// Protected routes - Tutor only (specific routes before param routes)
router.get('/tutor/my-lessons', protect, checkRole('tutor'), getTutorLessons);
router.post('/', protect, checkRole('tutor'), createLesson);
router.put('/:id', protect, checkRole('tutor'), updateLesson);
router.delete('/:id', protect, checkRole('tutor'), deleteLesson);

// Public param route (must be after specific routes)
router.get('/:id', getLesson);

// Student enrollment
router.post('/:id/enroll', protect, enrollInLesson);

export default router;
