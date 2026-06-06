import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Role } from '@prisma/client';
import { AuthService } from '../../src/core/services/auth.service';

const { findByEmailMock, findByIdOrgMock } = vi.hoisted(() => ({
  findByEmailMock: vi.fn(),
  findByIdOrgMock: vi.fn(),
}));

vi.mock('../../src/infrastructure/database/repositories/user.repository', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findByEmail: findByEmailMock,
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUsersByOrganization: vi.fn(),
  })),
}));

vi.mock('../../src/core/services/organization.service', () => ({
  OrganizationService: vi.fn().mockImplementation(() => ({
    createOrganization: vi.fn(),
    getOrganization: findByIdOrgMock,
  })),
}));

vi.mock('../../src/core/services/user.service', () => ({
  UserService: vi.fn().mockImplementation(() => ({
    createUser: vi.fn(),
    getUserById: vi.fn(),
    toSummary: vi.fn(),
  })),
}));

vi.mock('../../src/infrastructure/database/prisma.client', () => ({
  default: { $transaction: vi.fn() },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed'),
    compare: vi.fn(),
  },
}));

import bcrypt from 'bcryptjs';
const bcryptCompare = vi.mocked(bcrypt.compare);

const mockUser = {
  id: 'u1',
  organizationId: 'org-1',
  fullName: 'John Doe',
  email: 'john@acme.com',
  passwordHash: 'hashed',
  role: Role.MODERATOR,
  isActive: true,
  createdAt: new Date(),
};

describe('AuthService.login', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService();
  });

  it('throws 401 when email not found', async () => {
    findByEmailMock.mockResolvedValue(null);
    await expect(service.login('john@acme.com', 'pass')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 401 when password does not match', async () => {
    findByEmailMock.mockResolvedValue(mockUser);
    bcryptCompare.mockResolvedValue(false as never);
    await expect(service.login('john@acme.com', 'wrong')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 when account is inactive', async () => {
    findByEmailMock.mockResolvedValue({ ...mockUser, isActive: false });
    bcryptCompare.mockResolvedValue(true as never);
    await expect(service.login('john@acme.com', 'pass')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns token and user with org name on valid credentials', async () => {
    findByEmailMock.mockResolvedValue(mockUser);
    bcryptCompare.mockResolvedValue(true as never);
    findByIdOrgMock.mockResolvedValue({ id: 'org-1', name: 'Acme Corp' });

    const result = await service.login('john@acme.com', 'pass');

    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('john@acme.com');
    expect(result.user.organizationName).toBe('Acme Corp');
  });
});
