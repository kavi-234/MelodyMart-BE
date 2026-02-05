import User from '../models/user.js';

/**
 * Get all verified repair specialists
 * Public route - no authentication required
 */
export const getVerifiedSpecialists = async (req, res) => {
  try {
    const specialists = await User.find({
      role: 'repair_specialist',
      verificationStatus: 'APPROVED'
    })
    .select('name email phone specialization experience hourlyRate avatar')
    .sort({ createdAt: -1 })
    .limit(4); // Limit to 4 for the landing page

    res.status(200).json({
      success: true,
      specialists
    });
  } catch (error) {
    console.error('Error fetching specialists:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching repair specialists'
    });
  }
};

/**
 * Get all verified repair specialists (full list)
 * Public route - no authentication required
 */
export const getAllVerifiedSpecialists = async (req, res) => {
  try {
    const specialists = await User.find({
      role: 'repair_specialist',
      verificationStatus: 'APPROVED'
    })
    .select('name email phone specialization experience hourlyRate avatar')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      specialists
    });
  } catch (error) {
    console.error('Error fetching specialists:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching repair specialists'
    });
  }
};

/**
 * Get specialist by ID
 * Public route - no authentication required
 */
export const getSpecialistById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const specialist = await User.findOne({
      _id: id,
      role: 'repair_specialist',
      verificationStatus: 'APPROVED'
    })
    .select('name email phone specialization experience hourlyRate avatar bio certifications serviceTypes verificationStatus createdAt');

    if (!specialist) {
      return res.status(404).json({
        success: false,
        message: 'Repair specialist not found'
      });
    }

    res.status(200).json({
      success: true,
      specialist
    });
  } catch (error) {
    console.error('Error fetching specialist:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching repair specialist'
    });
  }
};
