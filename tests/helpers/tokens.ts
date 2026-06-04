import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import type { JwtPayload } from '../../src/api/middlewares/requireAuth';

export function signTestToken(payload: Partial<JwtPayload> & { id: string; organizationId: string }): string {
  return jwt.sign(
    {
      role: Role.MODERATOR,
      ...payload,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

export function moderatorToken(orgId = 'org-test', userId = 'user-mod'): string {
  return signTestToken({ id: userId, organizationId: orgId, role: Role.MODERATOR });
}

export function viewerToken(orgId = 'org-test', userId = 'user-view'): string {
  return signTestToken({ id: userId, organizationId: orgId, role: Role.VIEWER });
}
