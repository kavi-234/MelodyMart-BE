import User from '../models/user.js';

export const verifyUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, adminNotes } = req.body;

    // Validate status
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be "APPROVED" or "REJECTED"' 
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from modifying other admins
    if (user.role === 'admin') {
      return res.status(403).json({ 
        message: 'Cannot modify admin user status' 
      });
    }

    // Only tutors and repair specialists can be verified/rejected
    if (!['tutor', 'repair_specialist'].includes(user.role)) {
      return res.status(400).json({ 
        message: 'Only tutors and repair specialists require verification' 
      });
    }

    // Update verification status
    user.isVerified = status === 'APPROVED';
    user.verificationStatus = status;
    if (adminNotes) {
      user.adminNotes = adminNotes;
    }
    await user.save();

    // Return updated user (exclude password)
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      avatar: user.avatar,
      verificationDocuments: user.verificationDocuments,
      specialization: user.specialization,
      experience: user.experience,
      hourlyRate: user.hourlyRate,
      bio: user.bio,
      serviceTypes: user.serviceTypes,
      adminNotes: user.adminNotes,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      message: `User ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully`,
      user: userResponse
    });
  } catch (err) {
    console.error('Verify User Error:', err);
    res.status(500).json({ message: 'Failed to update user status' });
  }
};

export const getPendingUsers = async (req, res) => {
  try {
    // Get all users who need verification (tutors and repair specialists with pending status)
    const pendingUsers = await User.find({
      role: { $in: ['tutor', 'repair_specialist'] },
      verificationStatus: 'PENDING_APPROVAL'
    }).select('-password').sort({ createdAt: -1 });

    res.json({
      count: pendingUsers.length,
      users: pendingUsers
    });
  } catch (err) {
    console.error('Get Pending Users Error:', err);
    res.status(500).json({ message: 'Failed to retrieve pending users' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { role, verified } = req.query;
    
    // Build query
    const query = {};
    if (role && role !== 'all') {
      query.role = role;
    }
    if (verified !== undefined) {
      query.isVerified = verified === 'true';
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      count: users.length,
      users
    });
  } catch (err) {
    console.error('Get All Users Error:', err);
    res.status(500).json({ message: 'Failed to retrieve users' });
  }
};
