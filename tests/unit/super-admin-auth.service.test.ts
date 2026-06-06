import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SuperAdminAuthService } from '../../src/core/services/super-admin-auth.service';

const { findByEmailMock } = vi.hoisted(() => ({
  findByEmailMock: vi.fn(),
}));

vi.mock('../../src/infrastructure/database/repositories/super-admin.repository', () => ({
  SuperAdminRepository: vi.fn().mockImplementation(() => ({
    findByEmail: findByEmailMock,
  })),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import bcrypt from 'bcryptjs';
const bcryptCompare = vi.mocked(bcrypt.compare);

const mockAdmin = {
  id: 'admin-1',
  fullName: 'Admin User',
  email: 'admin@meetai.com',
  passwordHash: 'hashed',
  isActive: true,
  createdAt: new Date(),
};

describe('SuperAdminAuthService', () => {
  let service: SuperAdminAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SuperAdminAuthService();
  });

  it('throws 401 when email not found', async () => {
    findByEmailMock.mockResolvedValue(null);
    await expect(service.login('admin@meetai.com', 'pass')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 401 when password does not match', async () => {
    findByEmailMock.mockResolvedValue(mockAdmin);
    bcryptCompare.mockResolvedValue(false as never);
    await expect(service.login('admin@meetai.com', 'wrong')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 when account is inactive', async () => {
    findByEmailMock.mockResolvedValue({ ...mockAdmin, isActive: false });
    bcryptCompare.mockResolvedValue(true as never);
    await expect(service.login('admin@meetai.com', 'pass')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns token and admin payload on valid credentials', async () => {
    findByEmailMock.mockResolvedValue(mockAdmin);
    bcryptCompare.mockResolvedValue(true as never);

    const result = await service.login('admin@meetai.com', 'pass');

    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.admin).toEqual({
      id: 'admin-1',
      fullName: 'Admin User',
      email: 'admin@meetai.com',
    });
  });
});
