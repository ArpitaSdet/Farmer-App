import { Router } from 'express';
import {
  requestOtp,
  verifyOtp,
  selectProfile,
  completeFarmerOnboarding,
  registerMachineOwner,
  inviteDriver,
  adminLogin,
  refreshAccessToken,
  logout,
  getMe,
  updateMe,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

export const authRoutes = Router();

// Phone OTP Auth
authRoutes.post('/otp/request', requestOtp);
authRoutes.post('/send-otp', requestOtp);
authRoutes.post('/otp/verify', verifyOtp);
authRoutes.post('/verify-otp', verifyOtp);
authRoutes.post('/select-profile', selectProfile);

// Farmer Onboarding
authRoutes.post('/farmer/onboarding', authenticate, completeFarmerOnboarding);

// Machine Owner / Vendor KYC Sign-up
authRoutes.post('/owner/signup', registerMachineOwner);

// Driver Invite
authRoutes.post('/driver/invite', authenticate, inviteDriver);

// Admin Web Console Login (Email + Password + TOTP 2FA)
authRoutes.post('/admin/login', adminLogin);

// Session & Profile
authRoutes.post('/refresh', refreshAccessToken);
authRoutes.post('/logout', logout);
authRoutes.get('/me', authenticate, getMe);
authRoutes.put('/me', authenticate, updateMe);
