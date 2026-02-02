import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import { verifyGoogleToken } from '../utils/googleVerify.js';

export const googleLogin = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is missing. Ensure you are sending JSON.' });
    }
    const { token, credential } = req.body;
    const idToken = token || credential;

    if (!idToken) {
      return res.status(400).json({ message: 'No token provided' });
    }

    const verification = await verifyGoogleToken(idToken);
    
    if (!verification.success) {
      return res.status(401).json({ message: 'Google authentication failed', error: verification.error });
    }

    const { name, email, picture } = verification.data;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        avatar: picture,
        role: 'customer' // Default role
      });
    }

    const jwtToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        verified: user.verified
      }
    });
  } catch (err) {
    console.error('Google Login Error:', err);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

export const completeProfile = async (req, res) => {
  try {
    const { role, specialization, experience, hourlyRate, bio, serviceTypes, certifications } = req.body;
    const userId = req.userId;

    if (!['customer', 'tutor', 'repair_specialist'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const updateData = { role };

    if (role === 'tutor') {
      updateData.specialization = specialization;
      updateData.experience = experience;
      updateData.hourlyRate = hourlyRate;
      updateData.bio = bio;
    } else if (role === 'repair_specialist') {
      updateData.serviceTypes = serviceTypes;
      updateData.certifications = certifications;
    }

    // Handle uploaded documents
    if (req.files && req.files.length > 0) {
      updateData.documents = req.files.map(file => ({
        filename: file.filename,
        path: file.path
      }));
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

    res.json({
      message: 'Profile completed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        verified: user.verified
      }
    });
  } catch (err) {
    console.error('Complete Profile Error:', err);
    res.status(500).json({ message: 'Failed to complete profile' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Get Profile Error:', err);
    res.status(500).json({ message: 'Failed to get profile' });
  }
};
