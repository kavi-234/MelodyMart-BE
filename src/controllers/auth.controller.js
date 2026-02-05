import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user.js';
import { hashPassword, comparePassword } from '../utils/hash.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const { name, email, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    // Check if user exists with local auth provider
    if (user && user.authProvider === 'local') {
      return res.status(400).json({ 
        message: 'This email is registered with email/password. Please use email/password login instead.' 
      });
    }

    // Check verification status for existing Google users
    if (user && user.authProvider === 'google') {
      // Check if account was rejected
      if (user.verificationStatus === 'REJECTED') {
        return res.status(403).json({ 
          message: 'Your account has been rejected. Please contact support.' 
        });
      }
      
      // Check if account is pending verification (for tutors/repair specialists)
      if (user.verificationStatus === 'PENDING_APPROVAL' && (user.role === 'tutor' || user.role === 'repair_specialist')) {
        return res.status(403).json({ 
          message: 'Your account is pending admin approval. Please check back later.' 
        });
      }
    }

    if (!user) {
      user = await User.create({
        name,
        email,
        avatar: picture,
        authProvider: 'google',
        role: 'customer', // Default to customer for Google sign-ups
        isVerified: true,
        verificationStatus: 'APPROVED' // Auto-approve Google customers
      });
    }

    const jwtToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token: jwtToken,
      user
    });
  } catch (err) {
    console.error('Google Login Error:', err);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

export const emailSignup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        message: 'Name, email, password, and role are required' 
      });
    }

    // Validate role
    if (!['customer', 'tutor', 'repair_specialist'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check document requirement for tutor/repair_specialist
    if ((role === 'tutor' || role === 'repair_specialist') && !req.file) {
      return res.status(400).json({ 
        message: 'Document upload is required for tutors and repair specialists' 
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Prepare user data
    const userData = {
      name,
      email,
      password: hashedPassword,
      authProvider: 'local',
      role,
      isVerified: role === 'customer', // Auto-verify customers, require verification for tutors/repair specialists
      verificationStatus: role === 'customer' ? 'APPROVED' : 'PENDING_APPROVAL'
    };

    // Add document URL if uploaded
    if (req.file) {
      userData.documentUrl = `/uploads/documents/${req.file.filename}`;
    }

    // Create user
    const user = await User.create(userData);

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return response (exclude password)
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider,
      isVerified: user.isVerified,
      documentUrl: user.documentUrl
    };

    res.status(201).json({
      token,
      user: userResponse,
      message: role === 'customer' 
        ? 'Account created successfully!' 
        : 'Account created successfully! Your account is pending admin approval. You will be able to login once approved.'
    });
  } catch (err) {
    console.error('Email Signup Error:', err);
    res.status(500).json({ message: 'Failed to create account' });
  }
};

export const emailLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // Find user by email first
    const user = await User.findOne({ 
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Check if user registered with Google
    if (user.authProvider === 'google') {
      return res.status(400).json({ 
        message: 'This email is registered with Google. Please use Google Sign-In instead.' 
      });
    }

    // Check if account was rejected
    if (user.verificationStatus === 'REJECTED') {
      return res.status(403).json({ 
        message: 'Your account has been rejected. Please contact support or create a new account.' 
      });
    }

    // Check if account is pending approval (for tutors and repair specialists)
    if (user.verificationStatus === 'PENDING_APPROVAL') {
      return res.status(403).json({ 
        message: 'Your account is pending admin approval. Please wait for approval before logging in.' 
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return response (exclude password)
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider,
      isVerified: user.isVerified,
      avatar: user.avatar,
      specialization: user.specialization,
      experience: user.experience,
      hourlyRate: user.hourlyRate,
      serviceTypes: user.serviceTypes
    };

    res.json({
      token,
      user: userResponse
    });
  } catch (err) {
    console.error('Email Login Error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
};

export const completeProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { role, specialization, experience, hourlyRate, bio, serviceTypes, certifications } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate role
    if (!['customer', 'tutor', 'repair_specialist'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check document requirement for tutor/repair_specialist
    if ((role === 'tutor' || role === 'repair_specialist') && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ 
        message: 'Document upload is required for tutors and repair specialists' 
      });
    }

    // Update user role and profile
    user.role = role;
    user.profileCompleted = true;

    // Add role-specific fields
    if (role === 'tutor') {
      user.specialization = specialization;
      user.experience = experience;
      user.hourlyRate = hourlyRate;
      user.bio = bio;
      user.verificationStatus = 'PENDING_APPROVAL'; // Requires admin approval
      user.isVerified = false;
    } else if (role === 'repair_specialist') {
      user.serviceTypes = serviceTypes;
      user.certifications = certifications;
      user.bio = bio;
      user.verificationStatus = 'PENDING_APPROVAL'; // Requires admin approval
      user.isVerified = false;
    } else if (role === 'customer') {
      user.verificationStatus = 'APPROVED'; // Auto-approve customers
      user.isVerified = true;
    }

    // Add document URLs if uploaded
    if (req.files && req.files.length > 0) {
      user.verificationDocuments = req.files.map(file => ({
        url: `/uploads/documents/${file.filename}`,
        uploadedAt: new Date()
      }));
    }

    await user.save();

    res.json({
      message: 'Profile completed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted,
        verificationStatus: user.verificationStatus,
        isVerified: user.isVerified,
        specialization: user.specialization,
        experience: user.experience,
        hourlyRate: user.hourlyRate,
        serviceTypes: user.serviceTypes,
        bio: user.bio,
        requiresApproval: role === 'tutor' || role === 'repair_specialist'
      }
    });
  } catch (err) {
    console.error('Complete Profile Error:', err);
    res.status(500).json({ message: 'Failed to complete profile' });
  }
};

export const getProfileStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        profileCompleted: user.profileCompleted,
        verificationStatus: user.verificationStatus,
        isVerified: user.isVerified,
        authProvider: user.authProvider,
        specialization: user.specialization,
        experience: user.experience,
        hourlyRate: user.hourlyRate,
        serviceTypes: user.serviceTypes,
        bio: user.bio
      }
    });
  } catch (err) {
    console.error('Get Profile Status Error:', err);
    res.status(500).json({ message: 'Failed to get profile status' });
  }
};
