import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors/AppError';
import { Role } from '@prisma/client';

/**
 * Higher-order middleware to enforce RBAC using Prisma's Role enum.
 * Must be mounted AFTER requireAuth middleware.
 * 
 * Usage example in routes/domain.routes.ts:
 * router.get('/admin', requireAuth, requireRole([Role.MODERATOR]), ...);
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized: No user context found. Make sure requireAuth is used first.', 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError(`Forbidden: Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`, 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
