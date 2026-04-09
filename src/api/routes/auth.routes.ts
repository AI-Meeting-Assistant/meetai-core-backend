import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

export const authRouter = Router();
const authController = new AuthController();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
