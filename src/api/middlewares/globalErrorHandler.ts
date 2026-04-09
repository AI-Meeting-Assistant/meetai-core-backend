import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors/AppError';

/**
 * Global Error Handler Middleware
 *
 * Must be registered LAST in app.ts (after all routes).
 * Catches AppError instances and unknown errors, formats a standardised response:
 *   { success: false, error: { code: number, message: string } }
 */
export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Known operational error thrown via AppError
  if (err instanceof AppError) {
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
  console.error('[globalErrorHandler] Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 500,
      message: 'An unexpected error occurred. Please try again later.',
    },
  });
};
