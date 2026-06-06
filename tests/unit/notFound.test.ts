import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { notFound } from '../../src/api/middlewares/notFound';
import { AppError } from '../../src/utils/errors/AppError';

describe('notFound middleware', () => {
  it('calls next with a 404 AppError', () => {
    const req = { method: 'GET', originalUrl: '/api/v1/unknown' } as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    notFound(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('GET');
    expect(err.message).toContain('/api/v1/unknown');
  });
});
