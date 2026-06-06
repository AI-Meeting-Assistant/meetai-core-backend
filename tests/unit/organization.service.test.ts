import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OrganizationService } from '../../src/core/services/organization.service';

const { createOrgMock, findByIdMock } = vi.hoisted(() => ({
  createOrgMock: vi.fn(),
  findByIdMock: vi.fn(),
}));

vi.mock('../../src/infrastructure/database/repositories/organization.repository', () => ({
  OrganizationRepository: vi.fn().mockImplementation(() => ({
    create: createOrgMock,
    findById: findByIdMock,
  })),
}));

const mockOrg = { id: 'org-1', name: 'Acme', isActive: true, createdAt: new Date() };

describe('OrganizationService', () => {
  let service: OrganizationService;

  beforeEach(() => {
    createOrgMock.mockClear();
    findByIdMock.mockClear();
    service = new OrganizationService();
  });

  describe('createOrganization', () => {
    it('throws 400 when name is empty string', async () => {
      await expect(service.createOrganization('')).rejects.toMatchObject({ statusCode: 400 });
      expect(createOrgMock).not.toHaveBeenCalled();
    });

    it('throws 400 when name is only whitespace', async () => {
      await expect(service.createOrganization('   ')).rejects.toMatchObject({ statusCode: 400 });
      expect(createOrgMock).not.toHaveBeenCalled();
    });

    it('trims name before creating', async () => {
      createOrgMock.mockResolvedValue({ ...mockOrg, name: 'Acme' });

      await service.createOrganization('  Acme  ');

      expect(createOrgMock).toHaveBeenCalledWith({ name: 'Acme' }, undefined);
    });

    it('returns created organization', async () => {
      createOrgMock.mockResolvedValue(mockOrg);

      const result = await service.createOrganization('Acme');

      expect(result).toEqual(mockOrg);
    });
  });

  describe('getOrganization', () => {
    it('returns organization when found', async () => {
      findByIdMock.mockResolvedValue(mockOrg);

      const result = await service.getOrganization('org-1');

      expect(findByIdMock).toHaveBeenCalledWith('org-1');
      expect(result).toEqual(mockOrg);
    });

    it('throws 404 when organization not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expect(service.getOrganization('org-x')).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
