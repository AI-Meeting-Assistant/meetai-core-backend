import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/errors/AppError';

export interface AdminJwtPayload {
  id: string;
  type: 'super_admin';
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminJwtPayload;
    }
  }
}

export const requireSuperAdmin = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      throw new AppError('Unauthorized: Token required', 401);
    }

    if (!process.env.JWT_SECRET) {
      throw new AppError('Server Configuration Error: JWT_SECRET not found', 500);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as AdminJwtPayload;

      if (decoded.type !== 'super_admin') {
        throw new AppError('Forbidden: Super admin access required', 403);
      }

      req.admin = decoded;
      next();
    } catch (err: any) {
      if (err instanceof AppError) throw err;
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
