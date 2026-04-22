import { Request, Response, NextFunction } from 'express';
import { TimelineService } from '../../core/services/timeline.service';
import { AppError } from '../../utils/errors/AppError';
import { Logger } from '../../utils/logger';

const timelineService = new TimelineService();
const log = new Logger('TimelineController');

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

      const timelineData = await timelineService.getMeetingTimeline(meetingId);

      log.info('Timeline fetched', { meetingId, count: timelineData.length });
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
