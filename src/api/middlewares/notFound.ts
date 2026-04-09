import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors/AppError';

/**
 * 404 Not Found handler.
 * Registered after all routes so it catches any unmatched request.
 */
export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};
