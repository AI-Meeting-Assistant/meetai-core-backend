import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/errors/AppError';
import { Role } from '@prisma/client';

export interface JwtPayload {
  id: string;
  organizationId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Validates JWT token from Authorization header and attaches payload to req.user
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Unauthorized: Token required', 401);
    }

    const token = authHeader.split(' ')[1];
    
    if (!process.env.JWT_SECRET) {
      throw new AppError('Server Configuration Error: JWT_SECRET not found', 500);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
      req.user = decoded;
      next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Unauthorized: Token expired', 401);
      }
      if (err.name === 'JsonWebTokenError') {
        throw new AppError('Unauthorized: Invalid token', 401);
      }
      throw new AppError('Unauthorized: Authentication failed', 401);
    }
  } catch (error) {
    next(error);
  }
};
