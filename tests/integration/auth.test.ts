import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

const { registerMock, loginMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
  loginMock: vi.fn(),
}));

vi.mock('../../src/core/services/auth.service', () => ({
  AuthService: vi.fn().mockImplementation(() => ({
    register: registerMock,
    login: loginMock,
  })),
}));

const mockAuthResult = {
  token: 'jwt-token',
  user: { id: 'u1', fullName: 'John Doe', email: 'john@acme.com', role: 'MODERATOR', organizationId: 'org-1', organizationName: 'Acme' },
};

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => registerMock.mockClear());

  it('returns 201 with token on valid body', async () => {
    registerMock.mockResolvedValue(mockAuthResult);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ fullName: 'John Doe', email: 'john@acme.com', password: 'pass123', organizationName: 'Acme' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('jwt-token');
    expect(registerMock).toHaveBeenCalledWith('John Doe', 'john@acme.com', 'pass123', 'Acme');
  });

  it('returns 400 when fullName is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'john@acme.com', password: 'pass123', organizationName: 'Acme' });

    expect(res.status).toBe(400);
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('returns 400 when organizationName is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ fullName: 'John', email: 'john@acme.com', password: 'pass123' });

    expect(res.status).toBe(400);
    expect(registerMock).not.toHaveBeenCalled();
  });


});

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => loginMock.mockClear());

  it('returns 200 with token on valid credentials', async () => {
    loginMock.mockResolvedValue(mockAuthResult);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john@acme.com', password: 'pass123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('jwt-token');
    expect(loginMock).toHaveBeenCalledWith('john@acme.com', 'pass123');
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'pass123' });

    expect(res.status).toBe(400);
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john@acme.com' });

    expect(res.status).toBe(400);
    expect(loginMock).not.toHaveBeenCalled();
  });


});
