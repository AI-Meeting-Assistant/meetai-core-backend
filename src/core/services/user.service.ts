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
}
