import express from 'express';
import {
  createLesson,
  getAllLessons,
  getTutorLessons,
  getLessonsByTutorId,
  getLesson,
  updateLesson,
  deleteLesson,
  enrollInLesson
} from '../controllers/lesson.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { isTutor } from '../middleware/role.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllLessons);

// Protected routes - Tutor only (specific routes MUST come before param routes)
router.get('/tutor/my-lessons', protect, isTutor, getTutorLessons);
router.post('/', protect, isTutor, createLesson);
router.put('/:id', protect, isTutor, updateLesson);
router.delete('/:id', protect, isTutor, deleteLesson);

// Public routes with params (must be after specific routes)
router.get('/tutor/:tutorId', getLessonsByTutorId);
router.get('/:id', getLesson);

// Student enrollment
router.post('/:id/enroll', protect, enrollInLesson);

export default router;
