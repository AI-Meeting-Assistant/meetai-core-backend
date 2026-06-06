import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { moderatorToken, viewerToken } from '../helpers/tokens';

const { listUsersMock, createUserMock, setUserActiveMock } = vi.hoisted(() => ({
  listUsersMock: vi.fn(),
  createUserMock: vi.fn(),
  setUserActiveMock: vi.fn(),
}));

vi.mock('../../src/core/services/user.service', () => ({
  UserService: vi.fn().mockImplementation(() => ({
    listOrganizationUsers: listUsersMock,
    createOrganizationUser: createUserMock,
    setUserActive: setUserActiveMock,
  })),
}));

const mockUser = { id: 'u1', fullName: 'Jane Doe', email: 'jane@acme.com', role: 'MODERATOR', isActive: true };

describe('GET /api/v1/users', () => {
  beforeEach(() => listUsersMock.mockClear());

  it('returns 200 with users list', async () => {
    listUsersMock.mockResolvedValue([mockUser]);

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${moderatorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${viewerToken()}`);

    expect(res.status).toBe(403);
    expect(listUsersMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/users', () => {
  beforeEach(() => createUserMock.mockClear());

  it('returns 201 on valid body', async () => {
    createUserMock.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${moderatorToken()}`)
      .send({ fullName: 'Jane Doe', email: 'jane@acme.com', password: 'pass123', role: 'MODERATOR' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('jane@acme.com');
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${moderatorToken()}`)
      .send({ email: 'jane@acme.com', password: 'pass123' });

    expect(res.status).toBe(400);
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid role', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${moderatorToken()}`)
      .send({ fullName: 'Jane', email: 'jane@acme.com', password: 'pass', role: 'SUPERUSER' });

    expect(res.status).toBe(400);
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it('returns 403 for viewer', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${viewerToken()}`)
      .send({ fullName: 'Jane', email: 'jane@acme.com', password: 'pass', role: 'VIEWER' });

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/v1/users/:id', () => {
  beforeEach(() => setUserActiveMock.mockClear());

  it('returns 200 when deactivating a user', async () => {
    setUserActiveMock.mockResolvedValue({ ...mockUser, isActive: false });

    const res = await request(app)
      .patch('/api/v1/users/u1')
      .set('Authorization', `Bearer ${moderatorToken()}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('returns 400 when isActive is not boolean', async () => {
    const res = await request(app)
      .patch('/api/v1/users/u1')
      .set('Authorization', `Bearer ${moderatorToken()}`)
      .send({ isActive: 'yes' });

    expect(res.status).toBe(400);
    expect(setUserActiveMock).not.toHaveBeenCalled();
  });

  it('returns 403 for viewer', async () => {
    const res = await request(app)
      .patch('/api/v1/users/u1')
      .set('Authorization', `Bearer ${viewerToken()}`)
      .send({ isActive: false });

    expect(res.status).toBe(403);
  });
});
