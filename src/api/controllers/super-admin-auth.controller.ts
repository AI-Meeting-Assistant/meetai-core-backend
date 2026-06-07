import { Request, Response, NextFunction } from 'express';
import { SuperAdminAuthService } from '../../core/services/super-admin-auth.service';
import { AppError } from '../../utils/errors/AppError';
import { Logger } from '../../utils/logger';

const adminAuthService = new SuperAdminAuthService();
const log = new Logger('SuperAdminAuthController');

export class SuperAdminAuthController {
  /**
   * POST /admin/auth/login
   * Authenticates a super admin and returns a JWT token.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError('email and password are required', 400);
      }

      const result = await adminAuthService.login(email, password);

      log.info('Super admin logged in', { email });
      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }
}
