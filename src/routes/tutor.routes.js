import express from 'express';
import User from '../models/user.js';

const router = express.Router();

// Get all verified tutors (public)
router.get('/', async (req, res) => {
  try {
    const tutors = await User.find({
      role: 'tutor',
      isVerified: true,
      verificationStatus: 'APPROVED'
    })
      .select('name specialization experience hourlyRate avatar bio isVerified')
      .sort({ createdAt: -1 });

    res.json({ tutors });
  } catch (error) {
    console.error('Get Tutors Error:', error);
    res.status(500).json({ message: 'Failed to fetch tutors' });
  }
});

// Get single tutor details
router.get('/:id', async (req, res) => {
  try {
    const tutor = await User.findOne({
      _id: req.params.id,
      role: 'tutor',
      isVerified: true,
      verificationStatus: 'APPROVED'
    }).select('name specialization experience hourlyRate avatar bio isVerified verificationStatus createdAt');

    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    res.json({ tutor });
  } catch (error) {
    console.error('Get Tutor Error:', error);
    res.status(500).json({ message: 'Failed to fetch tutor' });
  }
});

export default router;
