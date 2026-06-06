import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { globalErrorHandler } from '../../src/api/middlewares/globalErrorHandler';
import { AppError } from '../../src/utils/errors/AppError';

function runHandler(err: Error) {
  const req = { method: 'GET', path: '/test' } as Request;
  let statusCode = 0;
  let body: unknown;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn((data) => { body = data; }),
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;

  globalErrorHandler(err, req, res, next);

  statusCode = (res.status as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
  return { statusCode, body };
}

describe('globalErrorHandler', () => {
  it('returns correct status and shape for AppError', () => {
    const { statusCode, body } = runHandler(new AppError('Meeting not found', 404));

    expect(statusCode).toBe(404);
    expect(body).toEqual({
      success: false,
      error: { code: 404, message: 'Meeting not found' },
    });
  });

  it('returns 500 and generic message for unknown errors', () => {
    const { statusCode, body } = runHandler(new Error('Something exploded'));

    expect(statusCode).toBe(500);
    expect((body as any).success).toBe(false);
    expect((body as any).error.code).toBe(500);
    expect((body as any).error.message).not.toContain('exploded');
  });

  it('does not leak internal error details to client', () => {
    const { body } = runHandler(new Error('db password is hunter2'));

    expect(JSON.stringify(body)).not.toContain('hunter2');
  });
});
