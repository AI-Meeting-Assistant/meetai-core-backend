import { Router } from 'express';
import { MeetingController } from '../controllers/meeting.controller';
import { requireAuth } from '../middlewares/requireAuth';
import { requireRole } from '../middlewares/requireRole';
import { Role } from '@prisma/client';

export const meetingRouter = Router();
const meetingController = new MeetingController();

meetingRouter.use(requireAuth);

meetingRouter.get('/', meetingController.getMeetings);
meetingRouter.post('/', meetingController.createMeeting);

meetingRouter.get('/:id', meetingController.getMeetingById);
meetingRouter.patch('/:id', meetingController.updateMeeting);
meetingRouter.post('/:id/start', requireRole([Role.MODERATOR]), meetingController.startMeeting);
meetingRouter.get('/:id/export', meetingController.exportMeeting);
meetingRouter.get('/:id/events', meetingController.streamEvents);
