import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

const { loginMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
}));

vi.mock('../../src/core/services/super-admin-auth.service', () => ({
  SuperAdminAuthService: vi.fn().mockImplementation(() => ({
    login: loginMock,
  })),
}));

describe('POST /api/v1/admin/auth/login', () => {
  beforeEach(() => {
    loginMock.mockClear();
  });

  it('returns 200 with token and admin payload on valid credentials', async () => {
    loginMock.mockResolvedValue({
      token: 'admin-jwt',
      admin: { id: 'admin-1', fullName: 'Admin User', email: 'admin@meetai.com' },
    });

    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'admin@meetai.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('admin-jwt');
    expect(res.body.data.admin.email).toBe('admin@meetai.com');
    expect(loginMock).toHaveBeenCalledWith('admin@meetai.com', 'secret');
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ password: 'secret' });

    expect(res.status).toBe(400);
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'admin@meetai.com' });

    expect(res.status).toBe(400);
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('returns 401 when service rejects credentials', async () => {
    const { AppError } = await import('../../src/utils/errors/AppError');
    loginMock.mockRejectedValue(new AppError('Invalid credentials', 401));

    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'admin@meetai.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
