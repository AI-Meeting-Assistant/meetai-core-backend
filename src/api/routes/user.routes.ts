import { Router } from 'express';
import { Role } from '@prisma/client';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middlewares/requireAuth';
import { requireRole } from '../middlewares/requireRole';

export const userRouter = Router();
const userController = new UserController();

userRouter.use(requireAuth);
userRouter.use(requireRole([Role.MODERATOR]));

userRouter.get('/', userController.listUsers);
userRouter.post('/', userController.createUser);
userRouter.patch('/:id', userController.updateUser);
