import bcrypt from 'bcryptjs';
import { User, Role, Prisma } from '@prisma/client';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { AppError } from '../../utils/errors/AppError';

interface CreateUserData {
  organizationId: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role?: Role;
}

export interface OrganizationUserSummary {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async createUser(data: CreateUserData, tx?: Prisma.TransactionClient): Promise<User> {
    return this.userRepository.create(data, tx);
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async getUsersByOrganization(orgId: string): Promise<User[]> {
    return this.userRepository.findUsersByOrganization(orgId);
  }

  toSummary(user: User): OrganizationUserSummary {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async listOrganizationUsers(orgId: string): Promise<OrganizationUserSummary[]> {
    const users = await this.getUsersByOrganization(orgId);
    return users.map((u) => this.toSummary(u));
  }

  async createViewerUser(
    orgId: string,
    fullName: string,
    email: string,
    password: string,
  ): Promise<OrganizationUserSummary> {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      throw new AppError('fullName is required', 400);
    }
    if (!trimmedEmail) {
      throw new AppError('email is required', 400);
    }
    if (!password || password.length < 6) {
      throw new AppError('password must be at least 6 characters', 400);
    }

    const existing = await this.userRepository.findByEmail(trimmedEmail);
    if (existing) {
      throw new AppError('Email already in use', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.createUser({
      organizationId: orgId,
      fullName: trimmedName,
      email: trimmedEmail,
      passwordHash,
      role: Role.VIEWER,
    });

    return this.toSummary(user);
  }

  async setUserActive(
    orgId: string,
    targetUserId: string,
    actingUserId: string,
    isActive: boolean,
  ): Promise<OrganizationUserSummary> {
    if (targetUserId === actingUserId) {
      throw new AppError('You cannot change the active status of your own account', 400);
    }

    const user = await this.getUserById(targetUserId);
    if (user.organizationId !== orgId) {
      throw new AppError('Forbidden: User does not belong to your organization', 403);
    }

    const updated = await this.userRepository.update(targetUserId, { isActive });
    return this.toSummary(updated);
  }
}
