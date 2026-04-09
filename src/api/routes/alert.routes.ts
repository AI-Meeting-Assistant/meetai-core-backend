import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller';
import { requireAuth } from '../middlewares/requireAuth';

export const alertRouter = Router();
const alertController = new AlertController();

alertRouter.use(requireAuth);

alertRouter.get('/:meetingId', alertController.getAlerts);
