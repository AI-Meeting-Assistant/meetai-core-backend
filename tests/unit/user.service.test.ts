import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Role } from '@prisma/client';
import { UserService } from '../../src/core/services/user.service';

const { findByIdMock, findByEmailMock, findByOrgMock, createMock, updateMock } = vi.hoisted(() => ({
  findByIdMock: vi.fn(),
  findByEmailMock: vi.fn(),
  findByOrgMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('../../src/infrastructure/database/repositories/user.repository', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findById: findByIdMock,
    findByEmail: findByEmailMock,
    findUsersByOrganization: findByOrgMock,
    create: createMock,
    update: updateMock,
  })),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
}));

const mockUser = {
  id: 'u1',
  organizationId: 'org-1',
  fullName: 'Jane Doe',
  email: 'jane@acme.com',
  passwordHash: 'hashed',
  role: Role.MODERATOR,
  isActive: true,
  createdAt: new Date('2026-01-01'),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService();
  });

  describe('getUserById', () => {
    it('returns user when found', async () => {
      findByIdMock.mockResolvedValue(mockUser);
      const result = await service.getUserById('u1');
      expect(result).toEqual(mockUser);
    });

    it('throws 404 when user not found', async () => {
      findByIdMock.mockResolvedValue(null);
      await expect(service.getUserById('u-x')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('toSummary', () => {
    it('maps user to summary shape without passwordHash', () => {
      const summary = service.toSummary(mockUser);
      expect(summary).toEqual({
        id: 'u1',
        fullName: 'Jane Doe',
        email: 'jane@acme.com',
        role: Role.MODERATOR,
        isActive: true,
        createdAt: mockUser.createdAt,
      });
      expect(summary).not.toHaveProperty('passwordHash');
    });
  });

  describe('listOrganizationUsers', () => {
    it('returns mapped summaries for all org users', async () => {
      findByOrgMock.mockResolvedValue([mockUser]);
      const result = await service.listOrganizationUsers('org-1');
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('jane@acme.com');
      expect(result[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('createOrganizationUser', () => {
    it('throws 400 when fullName is blank', async () => {
      await expect(
        service.createOrganizationUser('org-1', '  ', 'jane@acme.com', 'pass123', Role.VIEWER),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 when email is blank', async () => {
      await expect(
        service.createOrganizationUser('org-1', 'Jane', '  ', 'pass123', Role.VIEWER),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 when password is shorter than 6 chars', async () => {
      await expect(
        service.createOrganizationUser('org-1', 'Jane', 'jane@acme.com', '123', Role.VIEWER),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 409 when email already in use', async () => {
      findByEmailMock.mockResolvedValue(mockUser);
      await expect(
        service.createOrganizationUser('org-1', 'Jane', 'jane@acme.com', 'pass123', Role.VIEWER),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(createMock).not.toHaveBeenCalled();
    });

    it('creates user and returns summary on valid input', async () => {
      findByEmailMock.mockResolvedValue(null);
      createMock.mockResolvedValue(mockUser);

      const result = await service.createOrganizationUser(
        'org-1', 'Jane Doe', 'jane@acme.com', 'pass123', Role.MODERATOR,
      );

      expect(createMock).toHaveBeenCalled();
      expect(result.email).toBe('jane@acme.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('lowercases and trims email before saving', async () => {
      findByEmailMock.mockResolvedValue(null);
      createMock.mockResolvedValue({ ...mockUser, email: 'jane@acme.com' });

      await service.createOrganizationUser('org-1', 'Jane', '  Jane@ACME.com  ', 'pass123', Role.VIEWER);

      expect(findByEmailMock).toHaveBeenCalledWith('jane@acme.com');
    });
  });

  describe('setUserActive', () => {
    it('throws 400 when user tries to change their own status', async () => {
      await expect(
        service.setUserActive('org-1', 'u1', 'u1', false),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 403 when target user belongs to a different org', async () => {
      findByIdMock.mockResolvedValue({ ...mockUser, organizationId: 'org-other' });
      await expect(
        service.setUserActive('org-1', 'u1', 'u2', false),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('updates and returns summary on valid call', async () => {
      findByIdMock.mockResolvedValue(mockUser);
      updateMock.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.setUserActive('org-1', 'u1', 'u2', false);

      expect(updateMock).toHaveBeenCalledWith('u1', { isActive: false });
      expect(result.isActive).toBe(false);
    });
  });
});
