import prisma from '../prisma.client';
import { SuperAdmin, Prisma } from '@prisma/client';

export class SuperAdminRepository {
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<SuperAdmin | null> {
    return (tx ?? prisma).superAdmin.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<SuperAdmin | null> {
    return (tx ?? prisma).superAdmin.findUnique({
      where: { email },
    });
  }
}
