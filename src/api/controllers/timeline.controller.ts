import { Request, Response, NextFunction } from 'express';
import { TimelineService } from '../../core/services/timeline.service';
import { AppError } from '../../utils/errors/AppError';

const timelineService = new TimelineService();

export class TimelineController {
  
  /**
   * GET /:meetingId
   * Gets all raw timeline data for a specific meeting.
   */
  async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { meetingId } = req.params;
      
      // Basic manual validation
      if (!meetingId) {
        throw new AppError('Meeting ID is required', 400);
      }

      const timelineData = await timelineService.getTimelineByMeetingId(meetingId);

      res.status(200).json({
        success: true,
        data: timelineData,
        message: 'Timeline data fetched successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
