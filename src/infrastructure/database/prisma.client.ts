import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 *
 * Ensures only one PrismaClient instance is created across the entire application,
 * preventing connection pool exhaustion. Import `prisma` from this file everywhere.
 *
 * Usage:
 *   import { prisma } from '../infrastructure/database/prisma.client';
 */

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
