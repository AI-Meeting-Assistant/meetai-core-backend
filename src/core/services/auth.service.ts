import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../infrastructure/database/prisma.client';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { OrganizationService } from './organization.service';
import { UserService } from './user.service';
import { AppError } from '../../utils/errors/AppError';
import { JwtPayload } from '../../api/middlewares/requireAuth';

interface AuthResult {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    organizationId: string;
  };
}

export class AuthService {
  private userRepository: UserRepository;
  private organizationService: OrganizationService;
  private userService: UserService;

  constructor() {
    this.userRepository = new UserRepository();
    this.organizationService = new OrganizationService();
    this.userService = new UserService();
  }

  async register(
    fullName: string,
    email: string,
    password: string,
    organizationName: string,
  ): Promise<AuthResult> {
    // Hash outside the transaction — bcrypt is slow IO with no DB interaction needed
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const existing = await this.userRepository.findByEmail(email, tx);
      if (existing) {
        throw new AppError('Email already in use', 409);
      }

      const org = await this.organizationService.createOrganization(organizationName, tx);

      return this.userService.createUser(
        { organizationId: org.id, fullName, email, passwordHash },
        tx,
      );
    });

    const token = this.signToken({ id: user.id, organizationId: user.organizationId, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = this.signToken({ id: user.id, organizationId: user.organizationId, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  private signToken(payload: JwtPayload): string {
    if (!process.env.JWT_SECRET) {
      throw new AppError('Server Configuration Error: JWT_SECRET not found', 500);
    }
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  }
}
