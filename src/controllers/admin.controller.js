import User from '../models/user.js';
import LessonBooking from '../models/lessonBooking.js';
import ServiceRequest from '../models/serviceRequest.js';
import Instrument from '../models/instrument.js';

export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingApprovals = await User.countDocuments({
      role: { $in: ['tutor', 'repair_specialist'] },
      verificationStatus: 'PENDING_APPROVAL'
    });

    const bookings = await LessonBooking.find({ paymentStatus: 'completed' });
    const requests = await ServiceRequest.find({ status: 'completed' });
    const totalEarnings = bookings.reduce((sum, b) => sum + (b.price || 0), 0) +
                         requests.reduce((sum, r) => sum + (r.serviceFee || 0), 0);

    const totalOrders = await LessonBooking.countDocuments();
    const pendingOrders = await LessonBooking.countDocuments({ paymentStatus: 'pending' });

    const totalInstruments = await Instrument.countDocuments();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const usersToday = await User.countDocuments({ createdAt: { $gte: today } });

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const ordersThisWeek = await LessonBooking.countDocuments({ createdAt: { $gte: weekAgo } });

    const avgOrderValue = totalOrders > 0 ? Math.round(totalEarnings / totalOrders) : 0;

    const pendingUsers = await User.find({
      role: { $in: ['tutor', 'repair_specialist'] },
      verificationStatus: 'PENDING_APPROVAL'
    }).select('-password').limit(5);

    const recentOrders = await LessonBooking.find()
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalUsers,
        pendingApprovals,
        totalEarnings,
        totalOrders,
        pendingOrders,
        totalInstruments,
        usersToday,
        ordersThisWeek,
        avgOrderValue,
      },
      pendingApprovals: pendingUsers,
      recentOrders,
    });
  } catch (error) {
    console.error('Get Admin Stats Error:', error);
    res.status(500).json({ message: 'Failed to load dashboard stats', error: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await LessonBooking.find()
      .populate('student', 'name email')
      .sort({ createdAt: -1 });

    const completedCount = await LessonBooking.countDocuments({ paymentStatus: 'completed' });
    const pendingCount = await LessonBooking.countDocuments({ paymentStatus: 'pending' });
    const failedCount = await LessonBooking.countDocuments({ paymentStatus: { $in: ['failed', 'refunded'] } });

    const totalRevenue = orders
      .filter(o => o.paymentStatus === 'completed')
      .reduce((sum, o) => sum + (o.price || 0), 0);

    res.json({
      orders: orders.map(o => ({ ...o._doc, customer: o.student, type: 'lesson' })),
      stats: {
        totalRevenue,
        completedCount,
        pendingCount,
        failedCount,
      },
    });
  } catch (error) {
    console.error('Get All Orders Error:', error);
    res.status(500).json({ message: 'Failed to load orders', error: error.message });
  }
};

export const refundOrder = async (req, res) => {
  try {
    const order = await LessonBooking.findByIdAndUpdate(
      req.params.orderId,
      { paymentStatus: 'refunded' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order refunded successfully', order });
  } catch (error) {
    console.error('Refund Order Error:', error);
    res.status(500).json({ message: 'Failed to refund order', error: error.message });
  }
};

export const completeOrder = async (req, res) => {
  try {
    const order = await LessonBooking.findByIdAndUpdate(
      req.params.orderId,
      { paymentStatus: 'completed' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order completed successfully', order });
  } catch (error) {
    console.error('Complete Order Error:', error);
    res.status(500).json({ message: 'Failed to complete order', error: error.message });
  }
};

export const getAllInstruments = async (req, res) => {
  try {
    const instruments = await Instrument.find().sort({ createdAt: -1 });
    res.json({ instruments });
  } catch (error) {
    console.error('Get All Instruments Error:', error);
    res.status(500).json({ message: 'Failed to load instruments', error: error.message });
  }
};

export const addInstrument = async (req, res) => {
  try {
    const { name, category, description, rentalPrice, salePrice, rentalQuantity, saleQuantity } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Instrument name is required' });
    }
    const instrument = new Instrument({
      name,
      category,
      description,
      rentalPrice: rentalPrice || 0,
      salePrice: salePrice || 0,
      rentalQuantity: rentalQuantity || 0,
      saleQuantity: saleQuantity || 0,
    });
    await instrument.save();
    res.status(201).json({ message: 'Instrument added successfully', instrument });
  } catch (error) {
    console.error('Add Instrument Error:', error);
    res.status(500).json({ message: 'Failed to add instrument', error: error.message });
  }
};

export const deleteInstrument = async (req, res) => {
  try {
    const instrument = await Instrument.findByIdAndDelete(req.params.instrumentId);
    if (!instrument) return res.status(404).json({ message: 'Instrument not found' });
    res.json({ message: 'Instrument deleted successfully' });
  } catch (error) {
    console.error('Delete Instrument Error:', error);
    res.status(500).json({ message: 'Failed to delete instrument', error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

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
