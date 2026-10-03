const jwt = require('jsonwebtoken');
const { Users } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'farmer_app_super_secure_jwt_secret_2026_kisan_mitra';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Please login to continue',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await Users.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account not found. Please login again.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid. Please login again.',
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  requireRole,
  JWT_SECRET,
};
