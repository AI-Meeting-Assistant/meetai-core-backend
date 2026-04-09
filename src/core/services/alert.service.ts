import { AlertRepository } from '../../infrastructure/database/repositories/alert.repository';
import { AppError } from '../../utils/errors/AppError';

export class AlertService {
  private alertRepository: AlertRepository;

  constructor() {
    this.alertRepository = new AlertRepository();
  }

  async getAlertsByMeetingId(meetingId: string) {
    if (!meetingId) {
      throw new AppError('Meeting ID is required', 400);
    }
    return this.alertRepository.findAlertsByMeetingId(meetingId);
  }
}
