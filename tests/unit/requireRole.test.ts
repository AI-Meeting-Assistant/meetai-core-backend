// @trace SDD-DG2 — RBAC blocks VIEWER from moderator-only actions

import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { requireRole } from '../../src/api/middlewares/requireRole';

function runRole(allowed: Role[], user?: { role: Role }) {
  const req = { user } as Request;
  const res = {} as Response;
  let status = 200;
  const next = vi.fn((err?: unknown) => {
    if (err && typeof err === 'object' && 'statusCode' in (err as object)) {
      status = (err as { statusCode: number }).statusCode;
    }
  });
  requireRole(allowed)(req, res, next as NextFunction);
  return { next, status };
}

describe('requireRole', () => {
  it('allows MODERATOR for moderator-only route', () => {
    const { next, status } = runRole([Role.MODERATOR], {
      id: '1',
      organizationId: 'o',
      role: Role.MODERATOR,
    });
    expect(status).toBe(200);
    expect(next).toHaveBeenCalledWith();
  });

  it('forbids VIEWER from moderator-only route', () => {
    const { status } = runRole([Role.MODERATOR], {
      id: '1',
      organizationId: 'o',
      role: Role.VIEWER,
    });
    expect(status).toBe(403);
  });

  it('requires user context from requireAuth', () => {
    const { status } = runRole([Role.MODERATOR]);
    expect(status).toBe(401);
  });
});
