import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors/AppError';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        organizationId: string;
        role: string;
      };
    }
  }
}

/**
 * Mock authentication middleware.
 * Simulates extracting a user from a token and populating req.user.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Unauthorized: Token required', 401);
    }

    // Mock user payload
    req.user = {
      id: 'mock-user-id',
      organizationId: 'mock-org-id',
      role: 'MODERATOR',
    };

    next();
  } catch (error) {
    next(error);
  }
};
