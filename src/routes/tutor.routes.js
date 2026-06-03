import express from 'express';
import User from '../models/user.js';
import { protect } from '../middleware/auth.middleware.js';
import { isTutor } from '../middleware/role.middleware.js';
import { getTutorStats, getTutorBookings, getTutorEarnings } from '../controllers/tutorDashboard.controller.js';

const router = express.Router();

// Protected dashboard routes (tutor only) — must come before /:id param route
router.get('/dashboard/stats', protect, isTutor, getTutorStats);
router.get('/dashboard/bookings', protect, isTutor, getTutorBookings);
router.get('/dashboard/earnings', protect, isTutor, getTutorEarnings);

// Public routes
router.get('/', async (req, res) => {
  try {
    const tutors = await User.find({ role: 'tutor', verificationStatus: 'APPROVED' })
      .select('name specialization experience hourlyRate avatar bio isVerified verificationStatus')
      .sort({ createdAt: -1 });
    res.json({ tutors });
  } catch (error) {
    console.error('Get Tutors Error:', error);
    res.status(500).json({ message: 'Failed to fetch tutors' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tutor = await User.findOne({ _id: req.params.id, role: 'tutor', verificationStatus: 'APPROVED' })
      .select('name specialization experience hourlyRate avatar bio isVerified verificationStatus createdAt');
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    res.json({ tutor });
  } catch (error) {
    console.error('Get Tutor Error:', error);
    res.status(500).json({ message: 'Failed to fetch tutor' });
  }
});

export default router;
