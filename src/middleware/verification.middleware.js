import User from '../models/user.js';

export const requireVerification = async (req, res, next) => {
  try {
    // Ensure user is authenticated (this should be called after protect middleware)
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get user from database
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // PENDING users need to complete profile first
    if (user.role === 'PENDING' || !user.profileCompleted) {
      return res.status(403).json({ 
        message: 'Profile incomplete',
        requiresProfileCompletion: true,
        note: 'Please complete your profile before accessing this resource.'
      });
    }

    // Customers always have access (auto-approved)
    if (user.role === 'customer') {
      return next();
    }

    // Tutors and repair specialists need admin approval
    if (user.role === 'tutor' || user.role === 'repair_specialist') {
      if (user.verificationStatus !== 'APPROVED' || !user.isVerified) {
        return res.status(403).json({ 
          message: 'Verification pending',
          verificationStatus: user.verificationStatus,
          note: 'Your account is awaiting admin approval. Please check back later.'
        });
      }
      return next();
    }

    // Admins always have access
    if (user.role === 'admin') {
      return next();
    }

    // Fallback for unknown roles
    return res.status(403).json({ message: 'Access denied' });
  } catch (err) {
    console.error('Verification Middleware Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Middleware to block PENDING users from accessing protected routes
export const requireCompletedProfile = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'PENDING' || !user.profileCompleted) {
      return res.status(403).json({ 
        message: 'Profile incomplete',
        requiresProfileCompletion: true
      });
    }

    next();
  } catch (err) {
    console.error('Profile Completion Middleware Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
