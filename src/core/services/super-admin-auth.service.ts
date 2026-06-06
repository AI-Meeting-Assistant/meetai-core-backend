import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SuperAdminRepository } from '../../infrastructure/database/repositories/super-admin.repository';
import { AppError } from '../../utils/errors/AppError';
import { AdminJwtPayload } from '../../api/middlewares/requireSuperAdmin';

interface AdminAuthResult {
  token: string;
  admin: {
    id: string;
    fullName: string;
    email: string;
  };
}

export class SuperAdminAuthService {
  private superAdminRepository: SuperAdminRepository;

  constructor() {
    this.superAdminRepository = new SuperAdminRepository();
  }

  async login(email: string, password: string): Promise<AdminAuthResult> {
    const admin = await this.superAdminRepository.findByEmail(email);
    if (!admin) {
      throw new AppError('Invalid credentials', 401);
    }

    const passwordMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!admin.isActive) {
      throw new AppError('This account has been deactivated', 403);
    }

    const token = this.signToken({ id: admin.id, type: 'super_admin' });

    return {
      token,
      admin: {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
      },
    };
  }

  private signToken(payload: AdminJwtPayload): string {
    if (!process.env.JWT_SECRET) {
      throw new AppError('Server Configuration Error: JWT_SECRET not found', 500);
    }
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  }
}
