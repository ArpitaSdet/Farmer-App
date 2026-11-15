import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  OtpRequestSchema,
  OtpVerifySchema,
  RefreshTokenSchema,
  FarmerProfileSchema,
  OwnerSignupSchema,
  DriverInviteSchema,
  SelectProfileSchema,
  AdminLoginSchema,
  KycReviewSchema,
  ErrorCode,
  AuthTokenPayload,
  UserRole,
} from '@krishi/shared';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { getSmsProvider } from '../services/sms';
import { logger } from '../config/logger';
import { verifyTotpToken } from '../services/totp';

function generateTokens(payload: AuthTokenPayload, expiresIn: any = env.JWT_ACCESS_EXPIRES_IN) {
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn,
  });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  return { accessToken, refreshToken, refreshTokenHash };
}

/**
 * Determine which active approved roles a user qualifies for.
 */
export async function getUserAvailableRoles(user: {
  id: string;
  role: string;
  email?: string | null;
  adminSubRole?: string | null;
  driverProfile?: { id: string; kycStatus: string } | null;
  ownerProfile?: { id: string; kycStatus: string } | null;
}): Promise<UserRole[]> {
  const roles: UserRole[] = [];

  // Super Admin / Admin role
  if (user.role === 'ADMIN' || user.email || user.adminSubRole) {
    roles.push('ADMIN');
  }

  // Farmer capability (default for all registered phone numbers)
  roles.push('FARMER');

  // Driver / Operator capability: only if driver record exists and KYC is approved
  if (user.driverProfile && user.driverProfile.kycStatus === 'APPROVED') {
    roles.push('DRIVER');
  }

  // Machine Owner / Vendor capability: only if owner profile exists and KYC is approved
  if (user.ownerProfile && user.ownerProfile.kycStatus === 'APPROVED') {
    roles.push('OWNER');
  }

  return Array.from(new Set(roles));
}

export async function requestOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const rawPhone = req.body.phone || req.body.mobileNumber;
    const { phone } = OtpRequestSchema.parse({ phone: rawPhone });

    // Rate limiting check: max 3 attempts within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentAttempts = await prisma.otpAttempt.count({
      where: {
        phone,
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (recentAttempts >= (env.DEMO_MODE ? 20 : 3)) {
      throw new AppError(
        429,
        ErrorCode.RATE_LIMITED,
        'Too many OTP requests. Please wait 5 minutes before trying again.'
      );
    }

    // Generate 6-digit OTP
    const otp = env.DEMO_MODE ? env.DEMO_OTP : crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    await prisma.otpAttempt.create({
      data: {
        phone,
        otpHash,
        expiresAt,
      },
    });

    // Send real SMS OTP
    const sms = getSmsProvider();
    await sms.sendOtp(phone, otp);

    return res.status(200).json({
      success: true,
      data: {
        message: env.DEMO_MODE
          ? `Demo mode: use OTP ${env.DEMO_OTP}`
          : 'OTP sent successfully to your mobile number',
        expiresInSeconds: 300,
        ...(env.DEMO_MODE ? { demoOtp: env.DEMO_OTP } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const rawPhone = req.body.phone || req.body.mobileNumber;
    const { phone, otp } = OtpVerifySchema.parse({ ...req.body, phone: rawPhone });
    const deviceId = (req.body.deviceId as string) || undefined;
    const requestedRole = (req.body.role as UserRole) || undefined;

    const latestAttempt = await prisma.otpAttempt.findFirst({
      where: {
        phone,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestAttempt) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'OTP expired or not found. Please request a new OTP.');
    }

    if (latestAttempt.attempts >= 3) {
      throw new AppError(400, ErrorCode.RATE_LIMITED, 'Maximum OTP verification attempts exceeded.');
    }

    // Check OTP hash
    const isValid = await bcrypt.compare(otp, latestAttempt.otpHash);
    if (!isValid) {
      await prisma.otpAttempt.update({
        where: { id: latestAttempt.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Invalid OTP entered. Please try again.');
    }

    // Mark verified
    await prisma.otpAttempt.update({
      where: { id: latestAttempt.id },
      data: { verifiedAt: new Date() },
    });

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone },
      include: {
        driverProfile: true,
        ownerProfile: true,
      },
    });
    let isNewUser = false;

    if (!user) {
      // Driver cannot self sign-up
      if (requestedRole === 'DRIVER') {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Drivers cannot self sign-up. Please contact an admin or machine owner for an invitation.'
        );
      }

      const initialRole: UserRole = requestedRole === 'OWNER' ? 'OWNER' : 'FARMER';
      user = await prisma.user.create({
        data: {
          phone,
          role: initialRole,
        },
        include: {
          driverProfile: true,
          ownerProfile: true,
        },
      });
      // Automatically initialize shopping cart
      await prisma.cart.create({ data: { userId: user.id } });
      isNewUser = true;
    }

    if (user.isBlocked) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Your account has been suspended. Please contact support.');
    }

    // Check Driver status & KYC approval
    if (requestedRole === 'DRIVER' || (!requestedRole && user.role === 'DRIVER')) {
      if (!user.driverProfile) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'No driver account linked to this phone. Registration requires an invitation.'
        );
      }

      if (user.driverProfile.kycStatus === 'PENDING_APPROVAL') {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Your driver KYC is pending Admin approval. You will receive an SMS once approved.'
        );
      }

      if (user.driverProfile.kycStatus === 'REJECTED') {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          `Driver KYC rejected: ${user.driverProfile.rejectionReason || 'Please contact operations'}.`
        );
      }

      // Check device binding
      if (deviceId) {
        if (!user.driverProfile.boundDeviceId) {
          // Bind to first device
          await prisma.driver.update({
            where: { id: user.driverProfile.id },
            data: { boundDeviceId: deviceId },
          });
        } else if (user.driverProfile.boundDeviceId !== deviceId) {
          if (user.driverProfile.deviceChangePendingApproval) {
            throw new AppError(
              403,
              ErrorCode.FORBIDDEN,
              'New device detected. Device binding is pending admin approval.'
            );
          }
          await prisma.driver.update({
            where: { id: user.driverProfile.id },
            data: { pendingDeviceId: deviceId, deviceChangePendingApproval: true },
          });
          throw new AppError(
            403,
            ErrorCode.FORBIDDEN,
            'New device detected. A device change approval request has been sent to Admin.'
          );
        }
      }
    }

    // Check Owner KYC status if logging in as owner
    if (requestedRole === 'OWNER' || (!requestedRole && user.role === 'OWNER')) {
      if (user.ownerProfile && user.ownerProfile.kycStatus === 'PENDING_APPROVAL') {
        return res.status(200).json({
          success: true,
          data: {
            kycPending: true,
            kycStatus: 'PENDING_APPROVAL',
            message: 'Your Machine Owner KYC is pending admin approval.',
            user: { id: user.id, phone: user.phone, name: user.name, role: 'OWNER' },
          },
        });
      }
    }

    // Determine available roles for profile selection
    const availableRoles = await getUserAvailableRoles(user);

    // If user has multiple roles and didn't specify one, show profile selection screen
    if (availableRoles.length > 1 && !requestedRole) {
      const tempToken = jwt.sign(
        { userId: user.id, phone: user.phone, availableRoles, type: 'PROFILE_SELECTION' },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '10m' }
      );

      return res.status(200).json({
        success: true,
        data: {
          requiresProfileSelection: true,
          availableRoles,
          tempToken,
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
          },
        },
      });
    }

    const assignedRole = requestedRole && availableRoles.includes(requestedRole) ? requestedRole : availableRoles[0] || user.role;

    // Issue tokens scoped strictly to this role
    const { accessToken, refreshToken, refreshTokenHash } = generateTokens({
      userId: user.id,
      phone: user.phone,
      role: assignedRole,
      adminSubRole: user.adminSubRole || undefined,
    });

    // Save refresh token session (30 days)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        deviceInfo: req.get('user-agent') || 'Mobile App',
        expiresAt,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        isNewUser,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: assignedRole,
          adminSubRole: user.adminSubRole,
          village: user.village,
          district: user.district,
          state: user.state,
          pincode: user.pincode,
          preferredLang: user.preferredLang,
          landSizeAcres: user.landSizeAcres,
          mainCrops: user.mainCrops,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle Profile Selection for users with multiple roles (e.g. Farmer who owns a tractor)
 */
export async function selectProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { tempToken, selectedRole, deviceId } = SelectProfileSchema.parse(req.body);

    // Verify temp selection token
    let decoded: any;
    try {
      decoded = jwt.verify(tempToken, env.JWT_ACCESS_SECRET);
    } catch (_) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Profile selection token expired. Please login again.');
    }

    if (decoded.type !== 'PROFILE_SELECTION') {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid profile selection token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { driverProfile: true, ownerProfile: true },
    });

    if (!user || user.isBlocked) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'User account invalid or blocked.');
    }

    const availableRoles = await getUserAvailableRoles(user);
    if (!availableRoles.includes(selectedRole)) {
      throw new AppError(403, ErrorCode.FORBIDDEN, `You do not have access to role: ${selectedRole}`);
    }

    // Driver device binding check
    if (selectedRole === 'DRIVER' && user.driverProfile && deviceId) {
      if (!user.driverProfile.boundDeviceId) {
        await prisma.driver.update({
          where: { id: user.driverProfile.id },
          data: { boundDeviceId: deviceId },
        });
      } else if (user.driverProfile.boundDeviceId !== deviceId) {
        if (user.driverProfile.deviceChangePendingApproval) {
          throw new AppError(403, ErrorCode.FORBIDDEN, 'New device binding is pending Admin approval.');
        }
        await prisma.driver.update({
          where: { id: user.driverProfile.id },
          data: { pendingDeviceId: deviceId, deviceChangePendingApproval: true },
        });
        throw new AppError(403, ErrorCode.FORBIDDEN, 'New device detected. Sent to Admin for approval.');
      }
    }

    // Issue tokens scoped to the chosen role
    const { accessToken, refreshToken, refreshTokenHash } = generateTokens({
      userId: user.id,
      phone: user.phone,
      role: selectedRole,
      adminSubRole: user.adminSubRole || undefined,
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        deviceInfo: req.get('user-agent') || 'Mobile App',
        expiresAt,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: selectedRole,
          adminSubRole: user.adminSubRole,
          village: user.village,
          pincode: user.pincode,
          preferredLang: user.preferredLang,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Farmer Onboarding Flow: Language -> Name -> Village/Pincode (Map Pin) -> Land size & crops
 */
export async function completeFarmerOnboarding(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const body = FarmerProfileSchema.parse(req.body);

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          name: body.name,
          village: body.village,
          district: body.district,
          state: body.state,
          pincode: body.pincode,
          preferredLang: body.preferredLanguage,
          landSizeAcres: body.landSizeAcres || null,
          mainCrops: (Array.isArray(body.mainCrops) ? body.mainCrops.join(',') : body.mainCrops) || null,
          farmLat: body.farmLatitude || null,
          farmLng: body.farmLongitude || null,
        },
      });

      // Upsert default farm address
      if (body.farmLatitude && body.farmLongitude) {
        await tx.address.upsert({
          where: { id: `addr-${user.id}` },
          create: {
            id: `addr-${user.id}`,
            userId: user.id,
            label: 'Farm Location',
            village: body.village || '',
            district: body.district || '',
            state: body.state || '',
            pincode: body.pincode || '',
            latitude: body.farmLatitude,
            longitude: body.farmLongitude,
            isDefault: true,
          },
          update: {
            village: body.village || '',
            district: body.district || '',
            state: body.state || '',
            pincode: body.pincode || '',
            latitude: body.farmLatitude,
            longitude: body.farmLongitude,
          },
        });
      }

      return user;
    });

    return res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Machine Owner / Vendor KYC Self Sign-up (Pending Admin Approval)
 */
export async function registerMachineOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const body = OwnerSignupSchema.parse(req.body);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone: body.phone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: body.phone,
          name: body.name,
          role: 'OWNER',
        },
      });
    }

    const rawAadhaar = body.aadhaarNumber || '';
    const maskedAadhaar = rawAadhaar.length >= 4 ? `XXXX-XXXX-${rawAadhaar.slice(-4)}` : rawAadhaar;

    // Upsert OwnerProfile with status PENDING_APPROVAL
    const ownerProfile = await prisma.ownerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        businessName: body.businessName || null,
        aadhaarNumber: maskedAadhaar,
        panNumber: body.panNumber || '',
        bankAccountNumber: body.bankAccountNumber || '',
        bankIfsc: body.bankIfsc || '',
        bankAccountName: body.bankAccountName || '',
        photoUrl: body.photoUrl || null,
        kycStatus: 'PENDING_APPROVAL',
      },
      update: {
        businessName: body.businessName || null,
        aadhaarNumber: maskedAadhaar,
        panNumber: body.panNumber || '',
        bankAccountNumber: body.bankAccountNumber || '',
        bankIfsc: body.bankIfsc || '',
        bankAccountName: body.bankAccountName || '',
        photoUrl: body.photoUrl || null,
        kycStatus: 'PENDING_APPROVAL',
        rejectionReason: null,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        message: 'Owner KYC submitted successfully. Account is pending Admin approval.',
        kycStatus: ownerProfile.kycStatus,
        ownerId: ownerProfile.id,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Driver Invitation: Admin or Machine Owner invites a driver by phone number
 */
export async function inviteDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const inviterUser = req.user!;
    const body = DriverInviteSchema.parse(req.body);

    // Only Admin or Owner can invite drivers
    if (inviterUser.role !== 'ADMIN' && inviterUser.role !== 'OWNER') {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Only Admins or Machine Owners can invite drivers');
    }

    let driverUser = await prisma.user.findUnique({ where: { phone: body.phone } });
    if (!driverUser) {
      driverUser = await prisma.user.create({
        data: {
          phone: body.phone,
          name: body.name,
          role: 'DRIVER',
        },
      });
    }

    const rawDriverAadhaar = body.aadhaarNumber || '';
    const maskedDriverAadhaar = rawDriverAadhaar.length >= 4 ? `XXXX-XXXX-${rawDriverAadhaar.slice(-4)}` : null;

    // Upsert Driver profile
    const driver = await prisma.driver.upsert({
      where: { userId: driverUser.id },
      create: {
        userId: driverUser.id,
        name: body.name,
        phone: body.phone,
        licenceNumber: body.licenceNumber,
        aadhaarNumber: maskedDriverAadhaar,
        invitedByPhone: inviterUser.phone,
        kycStatus: 'PENDING_APPROVAL',
      },
      update: {
        name: body.name,
        licenceNumber: body.licenceNumber,
        aadhaarNumber: maskedDriverAadhaar,
        invitedByPhone: inviterUser.phone,
      },
    });

    // Create vehicle if provided
    if (body.vehicleNumber) {
      await prisma.vehicle.upsert({
        where: { driverId: driver.id },
        create: {
          driverId: driver.id,
          vehicleNumber: body.vehicleNumber,
          vehicleType: body.vehicleType || 'MINI_TRUCK',
        },
        update: {
          vehicleNumber: body.vehicleNumber,
          vehicleType: body.vehicleType || 'MINI_TRUCK',
        },
      });
    }

    // Send invitation SMS
    const sms = getSmsProvider();
    await sms.sendNotification(
      body.phone,
      `You have been invited as a KRISHI Driver by ${inviterUser.phone}. Log in after Admin approves your KYC.`
    );

    return res.status(201).json({
      success: true,
      data: {
        message: 'Driver invited successfully. Verification pending approval.',
        driverId: driver.id,
        driverPhone: driver.phone,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin Login: Email + Password + TOTP 2FA. Session timeout 30 min. Lock after 5 failed tries.
 */
export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, totpToken } = AdminLoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== 'ADMIN') {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid admin email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        423,
        ErrorCode.FORBIDDEN,
        `Account locked due to 5 consecutive failed attempts. Try again in ${minutesRemaining} minutes.`
      );
    }

    // Check password
    if (!user.passwordHash) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Admin credentials not configured');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockedUntil: Date | null = null;

      if (failedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts >= 5 ? 0 : failedAttempts,
          lockedUntil,
        },
      });

      if (lockedUntil) {
        throw new AppError(
          423,
          ErrorCode.FORBIDDEN,
          'Account locked for 30 minutes after 5 consecutive failed login attempts.'
        );
      }

      throw new AppError(
        401,
        ErrorCode.UNAUTHORIZED,
        `Invalid password. ${5 - failedAttempts} attempts remaining before account lock.`
      );
    }

    // Verify TOTP 2FA code if TOTP is configured
    if (user.totpSecret) {
      const isValidTotp = verifyTotpToken(user.totpSecret, totpToken || '');
      if (!isValidTotp) {
        throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid Google Authenticator 2FA code');
      }
    }

    // Reset failed attempts on successful authentication
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // 30-minute session timeout for admin web console
    const { accessToken, refreshToken, refreshTokenHash } = generateTokens(
      {
        userId: user.id,
        phone: user.phone,
        role: 'ADMIN',
        adminSubRole: user.adminSubRole || undefined,
      },
      env.DEMO_MODE ? '12h' : '30m'
    );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Admin refresh token 24 hours
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        deviceInfo: req.get('user-agent') || 'Admin Web Console',
        expiresAt,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'ADMIN',
          adminSubRole: user.adminSubRole,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresInSeconds: env.DEMO_MODE ? 43200 : 1800,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin KYC Management: Approve or reject Owner KYC
 */
export async function reviewOwnerKyc(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = KycReviewSchema.parse(req.body);
    const adminId = req.user!.id;

    const owner = await prisma.ownerProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!owner) throw new AppError(404, ErrorCode.NOT_FOUND, 'Owner profile not found');

    const updated = await prisma.ownerProfile.update({
      where: { id },
      data: {
        kycStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        rejectionReason: action === 'REJECT' ? rejectionReason || 'KYC verification failed' : null,
        approvedAt: action === 'APPROVE' ? new Date() : null,
        approvedById: action === 'APPROVE' ? adminId : null,
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin KYC Management: Approve or reject Driver KYC
 */
export async function reviewDriverKyc(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = KycReviewSchema.parse(req.body);
    const adminId = req.user!.id;

    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new AppError(404, ErrorCode.NOT_FOUND, 'Driver not found');

    const updated = await prisma.driver.update({
      where: { id },
      data: {
        kycStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        rejectionReason: action === 'REJECT' ? rejectionReason || 'Licence verification failed' : null,
        approvedAt: action === 'APPROVE' ? new Date() : null,
        approvedById: action === 'APPROVE' ? adminId : null,
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin Device Binding: Approve Driver Device Change
 */
export async function approveDriverDevice(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new AppError(404, ErrorCode.NOT_FOUND, 'Driver not found');

    if (!driver.pendingDeviceId) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'No pending device change request found');
    }

    const updated = await prisma.driver.update({
      where: { id },
      data: {
        boundDeviceId: driver.pendingDeviceId,
        pendingDeviceId: null,
        deviceChangePendingApproval: false,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        message: 'Driver device binding approved successfully.',
        boundDeviceId: updated.boundDeviceId,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refreshAccessToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = RefreshTokenSchema.parse(req.body);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await prisma.session.findUnique({
      where: { refreshTokenHash },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid or expired refresh token. Please login again.');
    }

    if (session.user.isBlocked) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Your account has been suspended.');
    }

    // Rotate refresh token
    const newTokens = generateTokens({
      userId: session.user.id,
      phone: session.user.phone,
      role: session.user.role,
      adminSubRole: session.user.adminSubRole || undefined,
    });

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newTokens.refreshTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await prisma.session.deleteMany({ where: { refreshTokenHash } });
    }
    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
        driverProfile: {
          include: { vehicle: true },
        },
        ownerProfile: true,
      },
    });

    if (!user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    const sanitizedUser: any = { ...user };
    delete sanitizedUser.passwordHash;
    delete sanitizedUser.totpSecret;

    if (sanitizedUser.ownerProfile) {
      sanitizedUser.ownerProfile = {
        ...sanitizedUser.ownerProfile,
        aadhaarNumber: sanitizedUser.ownerProfile.aadhaarNumber
          ? `XXXX-XXXX-${sanitizedUser.ownerProfile.aadhaarNumber.slice(-4)}`
          : null,
        bankAccountNumber: sanitizedUser.ownerProfile.bankAccountNumber
          ? `XXXX${sanitizedUser.ownerProfile.bankAccountNumber.slice(-4)}`
          : null,
      };
    }

    if (sanitizedUser.driverProfile && sanitizedUser.driverProfile.aadhaarNumber) {
      sanitizedUser.driverProfile = {
        ...sanitizedUser.driverProfile,
        aadhaarNumber: `XXXX-XXXX-${sanitizedUser.driverProfile.aadhaarNumber.slice(-4)}`,
      };
    }

    return res.status(200).json({
      success: true,
      data: sanitizedUser,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const body = FarmerProfileSchema.partial().parse(req.body);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name,
        village: body.village,
        district: body.district,
        state: body.state,
        pincode: body.pincode,
        preferredLang: body.preferredLanguage,
        landSizeAcres: body.landSizeAcres,
        mainCrops: (Array.isArray(body.mainCrops) ? body.mainCrops.join(',') : body.mainCrops) ?? undefined,
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}
