import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/utils/errors/AppError';

describe('AppError', () => {
  it('sets message and statusCode', () => {
    const err = new AppError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
  });

  it('defaults isOperational to true', () => {
    const err = new AppError('Bad request', 400);
    expect(err.isOperational).toBe(true);
  });

  it('allows overriding isOperational', () => {
    const err = new AppError('Critical', 500, false);
    expect(err.isOperational).toBe(false);
  });

  it('is an instance of Error and AppError', () => {
    const err = new AppError('Unauthorized', 401);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});
