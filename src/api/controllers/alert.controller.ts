import { Request, Response, NextFunction } from 'express';
import { AlertService } from '../../core/services/alert.service';
import { AppError } from '../../utils/errors/AppError';
import { Logger } from '../../utils/logger';

const alertService = new AlertService();
const log = new Logger('AlertController');

export class AlertController {

  /**
   * GET /:meetingId
   * Gets all alerts triggered during a specific meeting.
   */
  async getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new AppError('Organization context required', 403);

      const { meetingId } = req.params;

      if (!meetingId) {
        throw new AppError('Meeting ID is required', 400);
      }

      const alerts = await alertService.getAlertsByMeetingId(meetingId, orgId);

      log.info('Alerts fetched', { meetingId, count: alerts.length });
      res.status(200).json({
        success: true,
        data: alerts,
        message: 'Alerts fetched successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
