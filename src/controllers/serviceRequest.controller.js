import ServiceRequest from '../models/serviceRequest.js';
import User from '../models/user.js';

export const createServiceRequest = async (req, res) => {
  try {
    const { specialistId, serviceType, description, preferredDate } = req.body;

    if (!specialistId || !serviceType) {
      return res.status(400).json({ message: 'Specialist and service type are required' });
    }

    const specialist = await User.findOne({ _id: specialistId, role: 'repair_specialist', verificationStatus: 'APPROVED' });
    if (!specialist) {
      return res.status(404).json({ message: 'Specialist not found' });
    }

    const request = await ServiceRequest.create({
      customer: req.user.userId,
      specialist: specialistId,
      serviceType,
      description: description || '',
      preferredDate: preferredDate || null,
    });

    await request.populate('specialist', 'name email specialization hourlyRate avatar phone');

    res.status(201).json({ message: 'Service request submitted successfully', request });
  } catch (error) {
    console.error('Create Service Request Error:', error);
    res.status(500).json({ message: 'Failed to create service request' });
  }
};

export const getMyServiceRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ customer: req.user.userId })
      .populate('specialist', 'name email specialization hourlyRate avatar phone')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    console.error('Get Service Requests Error:', error);
    res.status(500).json({ message: 'Failed to fetch service requests' });
  }
};

export const getServiceRequestById = async (req, res) => {
  try {
    const request = await ServiceRequest.findOne({ _id: req.params.id, customer: req.user.userId })
      .populate('specialist', 'name email specialization hourlyRate avatar phone bio certifications serviceTypes');

    if (!request) return res.status(404).json({ message: 'Service request not found' });

    res.json({ request });
  } catch (error) {
    console.error('Get Service Request Error:', error);
    res.status(500).json({ message: 'Failed to fetch service request' });
  }
};

export const cancelServiceRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.findOne({ _id: req.params.id, customer: req.user.userId });
    if (!request) return res.status(404).json({ message: 'Service request not found' });

    if (['Completed', 'Cancelled'].includes(request.status)) {
      return res.status(400).json({ message: `Cannot cancel a request that is already ${request.status}` });
    }

    request.status = 'Cancelled';
    await request.save();

    res.json({ message: 'Service request cancelled', request });
  } catch (error) {
    console.error('Cancel Service Request Error:', error);
    res.status(500).json({ message: 'Failed to cancel service request' });
  }
};
