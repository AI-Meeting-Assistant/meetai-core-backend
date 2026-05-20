import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../core/services/user.service';
import { AppError } from '../../utils/errors/AppError';
import { Logger } from '../../utils/logger';

const userService = new UserService();
const log = new Logger('UserController');

export class UserController {
  /**
   * GET /users
   * Lists all users in the moderator's organization.
   */
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new AppError('Organization context required', 403);

      const users = await userService.listOrganizationUsers(orgId);

      log.info('Organization users listed', { orgId, count: users.length });
      res.status(200).json({
        success: true,
        data: users,
        message: 'Users fetched successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /users
   * Creates a new viewer account in the moderator's organization.
   */
  async createViewer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new AppError('Organization context required', 403);

      const { fullName, email, password } = req.body;
      if (!fullName || !email || !password) {
        throw new AppError('fullName, email, and password are required', 400);
      }

      const user = await userService.createViewerUser(orgId, fullName, email, password);

      log.info('Viewer user created', { orgId, email: user.email });
      res.status(201).json({
        success: true,
        data: user,
        message: 'Viewer created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /users/:id
   * Activates or deactivates a user in the same organization.
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      const actingUserId = req.user?.id;
      if (!orgId || !actingUserId) throw new AppError('User context required', 403);

      const { id } = req.params;
      if (!id) throw new AppError('User ID is required', 400);

      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        throw new AppError('isActive (boolean) is required', 400);
      }

      const user = await userService.setUserActive(orgId, id, actingUserId, isActive);

      log.info('User active status updated', { orgId, userId: id, isActive });
      res.status(200).json({
        success: true,
        data: user,
        message: 'User updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
