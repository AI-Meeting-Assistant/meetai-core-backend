import { AlertRepository } from '../../infrastructure/database/repositories/alert.repository';
import { MeetingRepository } from '../../infrastructure/database/repositories/meeting.repository';
import { AppError } from '../../utils/errors/AppError';

export class AlertService {
  private alertRepository: AlertRepository;
  private meetingRepository: MeetingRepository;

  constructor() {
    this.alertRepository = new AlertRepository();
    this.meetingRepository = new MeetingRepository();
  }

  async getAlertsByMeetingId(meetingId: string, organizationId: string) {
    if (!meetingId) {
      throw new AppError('Meeting ID is required', 400);
    }

    const meeting = await this.meetingRepository.findByIdWithDetails(meetingId);
    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    if (meeting.organizationId !== organizationId) {
      throw new AppError('Forbidden: Meeting does not belong to your organization', 403);
    }

    return this.alertRepository.findAlertsByMeetingId(meetingId);
  }
}
