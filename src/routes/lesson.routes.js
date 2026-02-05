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

const router = express.Router();

// Public routes
router.get('/', getAllLessons);
router.get('/:id', getLesson);

// Protected routes - Tutor only
router.post('/', protect, createLesson);
router.get('/tutor/my-lessons', protect, getTutorLessons);
router.put('/:id', protect, updateLesson);
router.delete('/:id', protect, deleteLesson);

// Student enrollment
router.post('/:id/enroll', protect, enrollInLesson);

export default router;
