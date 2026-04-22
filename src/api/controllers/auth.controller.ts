import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../core/services/auth.service';
import { AppError } from '../../utils/errors/AppError';
import { Logger } from '../../utils/logger';

const authService = new AuthService();
const log = new Logger('AuthController');

export class AuthController {
  /**
   * POST /auth/register
   * Creates a new organization and registers the first user under it.
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fullName, email, password, organizationName } = req.body;

      if (!fullName || !email || !password || !organizationName) {
        throw new AppError('fullName, email, password, and organizationName are required', 400);
      }

      const result = await authService.register(fullName, email, password, organizationName);

      log.info('User registered', { email, organizationName });
      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/login
   * Authenticates a user and returns a JWT token.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError('email and password are required', 400);
      }

      const result = await authService.login(email, password);

      log.info('User logged in', { email });
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
