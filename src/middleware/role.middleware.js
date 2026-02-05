export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated (should be set by protect middleware)
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // User role should be attached to req by auth middleware
    if (!req.user.role && !req.userRole) {
      return res.status(403).json({ message: 'Role not found' });
    }

    const userRole = req.user.role || req.userRole;
    
    if (!allowedRoles.includes(userRole)) {
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
export const isAdmin = checkRole('admin');
export const isAdminOrTutor = checkRole('admin', 'tutor');
