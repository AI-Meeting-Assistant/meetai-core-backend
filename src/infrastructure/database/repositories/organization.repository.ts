import prisma from '../prisma.client';
import { Organization } from '@prisma/client';

export class OrganizationRepository {
  /**
   * Finds an organization by ID.
   */
  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { id },
    });
  }

  /**
   * Fetches all organizations where isActive is true.
   */
  async findActive(): Promise<Organization[]> {
    return prisma.organization.findMany({
      where: { isActive: true },
    });
  }
}
