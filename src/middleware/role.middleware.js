export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // User role should be attached to req by auth middleware
    if (!req.userRole) {
      return res.status(403).json({ message: 'Role not found' });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }

    next();
  };
};

export const isCustomer = checkRole('customer');
export const isTutor = checkRole('tutor');
export const isRepairSpecialist = checkRole('repair_specialist');
export const isTutorOrRepairSpecialist = checkRole('tutor', 'repair_specialist');
