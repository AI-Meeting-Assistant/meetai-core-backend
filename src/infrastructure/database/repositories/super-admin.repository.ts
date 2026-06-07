import prisma from '../prisma.client';
import { SuperAdmin, Prisma } from '@prisma/client';

export class SuperAdminRepository {
  /**
   * Finds a super admin by ID.
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<SuperAdmin | null> {
    return (tx ?? prisma).superAdmin.findUnique({
      where: { id },
    });
  }

  /**
   * Finds a super admin by email.
   */
  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<SuperAdmin | null> {
    return (tx ?? prisma).superAdmin.findUnique({
      where: { email },
    });
  }
}
