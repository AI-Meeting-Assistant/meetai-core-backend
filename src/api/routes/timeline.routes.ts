import { Router } from 'express';
import { TimelineController } from '../controllers/timeline.controller';
import { requireAuth } from '../middlewares/requireAuth';

export const timelineRouter = Router();
const timelineController = new TimelineController();

timelineRouter.use(requireAuth);

timelineRouter.get('/:meetingId', timelineController.getTimeline);
