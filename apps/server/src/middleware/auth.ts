import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, AdminSubRole, ErrorCode, AuthTokenPayload } from '@krishi/shared';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { AppError } from './errorHandler';
import { logger } from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
        role: UserRole;
        adminSubRole?: AdminSubRole | null;
      };
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthTokenPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, phone: true, role: true, adminSubRole: true, isBlocked: true },
    });

    if (!user) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'User associated with this token no longer exists');
    }

    if (user.isBlocked) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Your account has been suspended. Please contact support.');
    }

    req.user = {
      id: user.id,
      phone: user.phone,
      // Tokens are only issued for roles the user is approved for, so honour the profile chosen at login
      role: ((decoded.role as UserRole) || user.role) as UserRole,
      adminSubRole: user.adminSubRole as AdminSubRole | null,
    };

    next();
  } catch (err: any) {
    if (err instanceof AppError) return next(err);
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, ErrorCode.UNAUTHORIZED, 'Session expired. Please refresh your token.'));
    }
    return next(new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid authentication token'));
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, ErrorCode.UNAUTHORIZED, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          ErrorCode.FORBIDDEN,
          `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

export function requireAdminSubRole(...allowedSubRoles: AdminSubRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return next(new AppError(403, ErrorCode.FORBIDDEN, 'Admin privileges required'));
    }

    // SUPER_ADMIN has access to everything
    if (req.user.adminSubRole === 'SUPER_ADMIN') {
      return next();
    }

    if (!req.user.adminSubRole || !allowedSubRoles.includes(req.user.adminSubRole)) {
      return next(
        new AppError(
          403,
          ErrorCode.FORBIDDEN,
          `Requires admin permissions: ${allowedSubRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

export function auditLog(action: string, entity: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Record audit log asynchronously after response finishes
      res.on('finish', async () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            await prisma.auditLog.create({
              data: {
                actorId: req.user?.id || null,
                action,
                entity,
                entityId: req.params.id || body?.data?.id || 'unknown',
                beforeJson: (req as any)._auditBeforeState || null,
                afterJson: body?.data || null,
                ipAddress: req.ip || req.socket.remoteAddress || null,
                userAgent: req.get('user-agent') || null,
              },
            });
          }
        } catch (auditErr: any) {
          logger.error({ err: auditErr.message }, 'Failed to record audit log');
        }
      });

      return originalJson(body);
    };

    next();
  };
}
