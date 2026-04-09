import { TimelineRepository } from '../../infrastructure/database/repositories/timeline.repository';
import { AppError } from '../../utils/errors/AppError';

export class TimelineService {
  private timelineRepository: TimelineRepository;

  constructor() {
    this.timelineRepository = new TimelineRepository();
  }

  async getMeetingTimeline(meetingId: string) {
    if (!meetingId) {
      throw new AppError('Meeting ID is required', 400);
    }
    return this.timelineRepository.findAllByMeetingId(meetingId);
  }
}
