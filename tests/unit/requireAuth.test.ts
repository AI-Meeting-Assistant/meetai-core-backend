// @trace SDD-DG2 — JWT validation on protected routes
// @trace NFR-SEC-02 — rejects missing/invalid tokens

import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../src/api/middlewares/requireAuth';
import { signTestToken } from '../helpers/tokens';
import { Role } from '@prisma/client';

function runMiddleware(authHeader?: string, queryToken?: string) {
  const req = {
    headers: authHeader ? { authorization: authHeader } : {},
    query: queryToken ? { token: queryToken } : {},
  } as unknown as Request;
  const res = {} as Response;
  let status = 200;
  let body: unknown;
  const next = vi.fn((err?: unknown) => {
    if (err && typeof err === 'object' && 'statusCode' in (err as object)) {
      status = (err as { statusCode: number }).statusCode;
      body = err;
    }
  });
  requireAuth(req, res, next as NextFunction);
  return { req, next, status, body };
}

describe('requireAuth', () => {
  it('attaches user for valid Bearer token', () => {
    const token = signTestToken({
      id: 'u1',
      organizationId: 'org-1',
      role: Role.MODERATOR,
    });
    const { req, next } = runMiddleware(`Bearer ${token}`);
    expect(next).toHaveBeenCalledWith();
    expect(req.user?.organizationId).toBe('org-1');
  });

  it('rejects missing token with 401', () => {
    const { next, status } = runMiddleware();
    expect(next).toHaveBeenCalled();
    expect(status).toBe(401);
  });

  it('rejects invalid token with 401', () => {
    const { status } = runMiddleware('Bearer not-a-jwt');
    expect(status).toBe(401);
  });

  it('accepts token from query string', () => {
    const token = signTestToken({
      id: 'u1',
      organizationId: 'org-1',
      role: Role.VIEWER,
    });
    const { req, next } = runMiddleware(undefined, token);
    expect(next).toHaveBeenCalledWith();
    expect(req.user?.role).toBe(Role.VIEWER);
  });
});
