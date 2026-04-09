import prisma from '../prisma.client';
import { User, Prisma } from '@prisma/client';

export class UserRepository {
  /**
   * Finds a user by ID.
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return (tx ?? prisma).user.findUnique({
      where: { id },
    });
  }

  /**
   * Finds a user by email.
   */
  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return (tx ?? prisma).user.findUnique({
      where: { email },
    });
  }

  /**
   * Fetches all users belonging to a specific organization.
   */
  async findUsersByOrganization(orgId: string, tx?: Prisma.TransactionClient): Promise<User[]> {
    return (tx ?? prisma).user.findMany({
      where: { organizationId: orgId },
    });
  }

  /**
   * Creates a new user.
   */
  async create(data: Prisma.UserUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<User> {
    return (tx ?? prisma).user.create({ data });
  }
}
