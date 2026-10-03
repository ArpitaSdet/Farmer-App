const jwt = require('jsonwebtoken');
const { Users, FarmerProfiles } = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const notificationService = require('../config/notifications');

// In-memory OTP storage with expiration
const otpStore = new Map();

/**
 * Send OTP to Farmer Mobile Number
 */
const sendOtp = async (req, res, next) => {
  try {
    const { mobileNumber } = req.body;
    if (!mobileNumber || String(mobileNumber).trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number',
      });
    }

    const cleanPhone = String(mobileNumber).trim().slice(-10);
    // Generate 4-digit OTP (e.g., 1234 in dev or random)
    const otp = process.env.NODE_ENV === 'development' ? '1234' : Math.floor(1000 + Math.random() * 9000).toString();
    
    otpStore.set(cleanPhone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    // Simulated SMS dispatch
    await notificationService.sendSms({
      mobileNumber: cleanPhone,
      message: `Your Farmer App verification OTP is ${otp}. Do not share this with anyone.`,
    });

    return res.json({
      success: true,
      message: 'OTP sent successfully to your mobile number',
      // In dev mode, return OTP for easy testing
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP and authenticate farmer
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { mobileNumber, otp, name, village, language } = req.body;
    if (!mobileNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and OTP are required',
      });
    }

    const cleanPhone = String(mobileNumber).trim().slice(-10);
    const storedRecord = otpStore.get(cleanPhone);

    const isDevFallback = process.env.NODE_ENV === 'development' && otp === '1234';

    if (!isDevFallback) {
      if (!storedRecord) {
        return res.status(400).json({
          success: false,
          message: 'OTP expired or not requested. Please request a new OTP.',
        });
      }

      if (Date.now() > storedRecord.expiresAt) {
        otpStore.delete(cleanPhone);
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please tap resend OTP.',
        });
      }

      if (storedRecord.otp !== String(otp).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Incorrect OTP. Please check and enter again.',
        });
      }
    }

    otpStore.delete(cleanPhone);

    // Find or create farmer user
    let user = await Users.findOne({ mobileNumber: cleanPhone });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await Users.create({
        mobileNumber: cleanPhone,
        role: 'FARMER',
        name: name || `Farmer ${cleanPhone.slice(-4)}`,
        village: village || 'Hubballi Rural',
        district: 'Dharwad',
        state: 'Karnataka',
        pincode: '580031',
        farmSize: '3 Acres',
        mainCrops: ['Cotton', 'Vegetables'],
        preferredLanguage: language || 'en',
        isVerified: true,
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, mobileNumber: user.mobileNumber },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      isNewUser,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await Users.findById(req.user.id);
    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update profile details
 */
const updateProfile = async (req, res, next) => {
  try {
    const updates = req.body;
    // Don't allow changing role or id
    delete updates.id;
    delete updates._id;
    delete updates.role;

    const updated = await Users.findByIdAndUpdate(req.user.id, updates);
    return res.json({
      success: true,
      message: 'Farmer profile updated successfully',
      user: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Quick demo login (Farmer / Admin)
 */
const quickLogin = async (req, res, next) => {
  try {
    const { role = 'FARMER' } = req.body;
    let user;
    if (role === 'ADMIN') {
      user = await Users.findOne({ role: 'ADMIN' });
      if (!user) {
        user = await Users.create({
          mobileNumber: '9999999999',
          role: 'ADMIN',
          name: 'Kisan Kendra Admin',
          village: 'Hubballi',
          district: 'Dharwad',
          state: 'Karnataka',
          pincode: '580020',
          isVerified: true,
        });
      }
    } else {
      user = await Users.findOne({ role: 'FARMER' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, mobileNumber: user.mobileNumber },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: `Demo logged in as ${user.name}`,
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  getProfile,
  updateProfile,
  quickLogin,
};
