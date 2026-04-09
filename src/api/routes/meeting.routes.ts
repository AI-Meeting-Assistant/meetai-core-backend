import { Router } from 'express';
import { MeetingController } from '../controllers/meeting.controller';
import { requireAuth } from '../middlewares/requireAuth';

export const meetingRouter = Router();
const meetingController = new MeetingController();

meetingRouter.use(requireAuth);

meetingRouter.get('/', meetingController.getMeetings);
meetingRouter.post('/', meetingController.createMeeting);

meetingRouter.get('/:id', meetingController.getMeetingById);
meetingRouter.patch('/:id', meetingController.updateMeeting);
meetingRouter.get('/:id/export', meetingController.exportMeeting);
meetingRouter.get('/:id/events', meetingController.streamEvents);
