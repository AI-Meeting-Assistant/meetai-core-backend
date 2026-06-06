import { Router } from 'express';
import { SuperAdminAuthController } from '../controllers/super-admin-auth.controller';

export const adminRouter = Router();
const adminAuthController = new SuperAdminAuthController();

adminRouter.post('/auth/login', adminAuthController.login);
