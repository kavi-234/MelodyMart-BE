import jwt from 'jsonwebtoken';
import User from '../models/user.js';

export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    
    // Fetch user to get role
    const user = await User.findById(decoded.userId).select('role');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
