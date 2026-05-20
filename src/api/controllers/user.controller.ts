import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
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
   * Creates a new organization member (moderator or viewer).
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new AppError('Organization context required', 403);

      const { fullName, email, password, role } = req.body;
      if (!fullName || !email || !password || !role) {
        throw new AppError('fullName, email, password, and role are required', 400);
      }
      if (role !== Role.MODERATOR && role !== Role.VIEWER) {
        throw new AppError('role must be MODERATOR or VIEWER', 400);
      }

      const user = await userService.createOrganizationUser(
        orgId,
        fullName,
        email,
        password,
        role as Role,
      );

      log.info('Organization user created', { orgId, email: user.email, role: user.role });
      res.status(201).json({
        success: true,
        data: user,
        message: 'Team member created successfully',
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
