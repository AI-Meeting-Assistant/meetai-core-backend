import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireSuperAdmin } from '../../src/api/middlewares/requireSuperAdmin';
import { signAdminTestToken, signTestToken } from '../helpers/tokens';
import { Role } from '@prisma/client';

function runMiddleware(authHeader?: string) {
  const req = {
    headers: authHeader ? { authorization: authHeader } : {},
    query: {},
  } as unknown as Request;
  const res = {} as Response;
  let status = 200;
  const next = vi.fn((err?: unknown) => {
    if (err && typeof err === 'object' && 'statusCode' in (err as object)) {
      status = (err as { statusCode: number }).statusCode;
    }
  });
  requireSuperAdmin(req, res as Response, next as NextFunction);
  return { req, next, status };
}

describe('requireSuperAdmin', () => {
  it('attaches admin for valid super admin token', () => {
    const token = signAdminTestToken({ id: 'admin-1', type: 'super_admin' });
    const { req, next } = runMiddleware(`Bearer ${token}`);
    expect(next).toHaveBeenCalledWith();
    expect(req.admin?.id).toBe('admin-1');
    expect(req.admin?.type).toBe('super_admin');
  });

  it('rejects missing token with 401', () => {
    const { status } = runMiddleware();
    expect(status).toBe(401);
  });

  it('rejects invalid token with 401', () => {
    const { status } = runMiddleware('Bearer not-a-jwt');
    expect(status).toBe(401);
  });

  it('rejects expired token with 401', () => {
    const token = signAdminTestToken({ id: 'admin-1', type: 'super_admin' }, '0s');
    const { status } = runMiddleware(`Bearer ${token}`);
    expect(status).toBe(401);
  });

  it('rejects regular user token with 403', () => {
    const token = signTestToken({ id: 'u1', organizationId: 'org-1', role: Role.MODERATOR });
    const { status } = runMiddleware(`Bearer ${token}`);
    expect(status).toBe(403);
  });
});
