import ServiceRequest from '../models/serviceRequest.js';
import User from '../models/user.js';

export const getSpecialistStats = async (req, res) => {
  try {
    const specialistId = req.user.userId;

    const allRequests = await ServiceRequest.find({ specialist: specialistId });
    const activeRequests = allRequests.filter(r => ['Pending', 'Accepted', 'In Progress'].includes(r.status));
    const completedRequests = allRequests.filter(r => r.status === 'Completed');

    const totalEarnings = completedRequests.reduce((sum, r) => sum + (r.serviceFee || 0), 0);

    const recentRequests = await ServiceRequest.find({ specialist: specialistId })
      .populate('customer', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalRequests: allRequests.length,
        activeJobs: activeRequests.length,
        completedJobs: completedRequests.length,
        totalEarnings,
      },
      recentRequests,
    });
  } catch (error) {
    console.error('Get Specialist Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

export const getSpecialistRequests = async (req, res) => {
  try {
    const specialistId = req.user.userId;

    const requests = await ServiceRequest.find({ specialist: specialistId })
      .populate('customer', 'name email avatar phone')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    console.error('Get Specialist Requests Error:', error);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, serviceFee } = req.body;
    const specialistId = req.user.userId;

    if (!['Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await ServiceRequest.findOne({ _id: id, specialist: specialistId });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = status;
    if (serviceFee !== undefined && serviceFee > 0) request.serviceFee = serviceFee;
    await request.save();

    const updated = await request.populate('customer', 'name email avatar');
    res.json({ message: 'Status updated', request: updated });
  } catch (error) {
    console.error('Update Request Status Error:', error);
    res.status(500).json({ message: 'Failed to update request' });
  }
};

export const getSpecialistEarnings = async (req, res) => {
  try {
    const specialistId = req.user.userId;

    const completedRequests = await ServiceRequest.find({ specialist: specialistId, status: 'Completed' })
      .populate('customer', 'name email')
      .sort({ updatedAt: -1 });

    const totalEarnings = completedRequests.reduce((sum, r) => sum + (r.serviceFee || 0), 0);

    // Monthly breakdown
    const monthlyMap = {};
    completedRequests.forEach(r => {
      const d = new Date(r.updatedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyMap[key]) monthlyMap[key] = { key, label, total: 0, count: 0 };
      monthlyMap[key].total += r.serviceFee || 0;
      monthlyMap[key].count++;
    });

    const monthly = Object.values(monthlyMap).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 6);

    // By service type
    const byTypeMap = {};
    completedRequests.forEach(r => {
      const type = r.serviceType || 'Other';
      if (!byTypeMap[type]) byTypeMap[type] = { type, count: 0, total: 0 };
      byTypeMap[type].count++;
      byTypeMap[type].total += r.serviceFee || 0;
    });

    const byType = Object.values(byTypeMap);

    res.json({
      totalEarnings,
      monthly,
      byType,
      history: completedRequests.map(r => ({
        _id: r._id,
        customer: r.customer,
        serviceType: r.serviceType,
        serviceFee: r.serviceFee || 0,
        completedAt: r.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get Specialist Earnings Error:', error);
    res.status(500).json({ message: 'Failed to fetch earnings' });
  }
};
