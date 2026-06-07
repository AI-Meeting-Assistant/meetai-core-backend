import { TimelineRepository } from '../../infrastructure/database/repositories/timeline.repository';
import { MeetingRepository } from '../../infrastructure/database/repositories/meeting.repository';
import { AppError } from '../../utils/errors/AppError';

export class TimelineService {
  private timelineRepository: TimelineRepository;
  private meetingRepository: MeetingRepository;

  constructor() {
    this.timelineRepository = new TimelineRepository();
    this.meetingRepository = new MeetingRepository();
  }

  async getMeetingTimeline(meetingId: string, organizationId: string) {
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

    return this.timelineRepository.findAllByMeetingId(meetingId);
  }
}
