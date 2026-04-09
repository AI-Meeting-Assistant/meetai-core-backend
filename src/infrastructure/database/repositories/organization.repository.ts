import prisma from '../prisma.client';
import { Organization, Prisma } from '@prisma/client';

export class OrganizationRepository {
  /**
   * Finds an organization by ID.
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Organization | null> {
    return (tx ?? prisma).organization.findUnique({
      where: { id },
    });
  }

  /**
   * Fetches all organizations where isActive is true.
   */
  async findActive(tx?: Prisma.TransactionClient): Promise<Organization[]> {
    return (tx ?? prisma).organization.findMany({
      where: { isActive: true },
    });
  }

  /**
   * Creates a new organization.
   */
  async create(data: Prisma.OrganizationCreateInput, tx?: Prisma.TransactionClient): Promise<Organization> {
    return (tx ?? prisma).organization.create({ data });
  }
}
