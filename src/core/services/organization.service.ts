import { Organization, Prisma } from '@prisma/client';
import { OrganizationRepository } from '../../infrastructure/database/repositories/organization.repository';
import { AppError } from '../../utils/errors/AppError';

export class OrganizationService {
  private organizationRepository: OrganizationRepository;

  constructor() {
    this.organizationRepository = new OrganizationRepository();
  }

  async createOrganization(name: string, tx?: Prisma.TransactionClient): Promise<Organization> {
    if (!name || !name.trim()) {
      throw new AppError('Organization name is required', 400);
    }

    return this.organizationRepository.create({ name: name.trim() }, tx);
  }
}
