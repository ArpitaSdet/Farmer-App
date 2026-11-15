import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '@krishi/shared';
import { logger } from '../config/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(
    {
      err: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    },
    'Request error'
  );

  // 1. AppError (domain error)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid request data',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // 3. Prisma Known Request Error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          code: ErrorCode.CONFLICT,
          message: 'A record with this unique value already exists',
        },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Requested record was not found',
        },
      });
    }
  }

  // 4. Configuration Error (missing real external credential)
  if (err.message && err.message.includes('[CONFIGURATION_ERROR]')) {
    return res.status(503).json({
      success: false,
      error: {
        code: ErrorCode.CONFIGURATION_ERROR,
        message: err.message.replace('[CONFIGURATION_ERROR] ', ''),
      },
    });
  }

  // 5. Unhandled Server Error
  return res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected internal error occurred. Our engineers have been notified.',
    },
  });
}
