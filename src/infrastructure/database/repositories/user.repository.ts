import prisma from '../prisma.client';
import { User } from '@prisma/client';

export class UserRepository {
  /**
   * Finds a user by ID.
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Finds a user by email.
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Fetches all users belonging to a specific organization.
   */
  async findUsersByOrganization(orgId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: { organizationId: orgId },
    });
  }
}
