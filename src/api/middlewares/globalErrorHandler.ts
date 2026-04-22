import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors/AppError';
import { Logger } from '../../utils/logger';

const log = new Logger('GlobalErrorHandler');

/**
 * Global Error Handler Middleware
 *
 * Must be registered LAST in app.ts (after all routes).
 * Catches AppError instances and unknown errors, formats a standardised response:
 *   { success: false, error: { code: number, message: string } }
 */
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Known operational error thrown via AppError
  if (err instanceof AppError) {
    log.warn(err.message, { code: err.statusCode, method: req.method, path: req.path });
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.statusCode,
        message: err.message,
      },
    });
    return;
  }

  // Unknown / programming error — never leak internal details to the client
  log.error('Unhandled error', { message: err.message, stack: err.stack, method: req.method, path: req.path });

  res.status(500).json({
    success: false,
    error: {
      code: 500,
      message: 'An unexpected error occurred. Please try again later.',
    },
  });
};
