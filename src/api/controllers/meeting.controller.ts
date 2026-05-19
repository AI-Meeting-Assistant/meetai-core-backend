import { Request, Response, NextFunction } from 'express';
import { MeetingType } from '@prisma/client';
import { MeetingService } from '../../core/services/meeting.service';
import { AppError } from '../../utils/errors/AppError';
import { Logger } from '../../utils/logger';
import { sseManager } from '../../infrastructure/websocket/sse.manager';
import { SseEventType } from '../../types/sse-events';

const meetingService = new MeetingService();
const log = new Logger('MeetingController');

export class MeetingController {

  /**
   * GET /
   * Lists past/active meetings belonging to the organization
   */
  async getMeetings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new AppError('Organization context required', 403);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;

      const meetings = await meetingService.listMeetings(orgId, { page, limit, status });

      log.info('Meetings fetched', { orgId, count: meetings.length });
      res.status(200).json({
        success: true,
        data: meetings,
        message: 'Meetings fetched successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /
   * Creates a new meeting record, initiates the session
   */
  async createMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      const userId = req.user?.id;

      if (!orgId || !userId) throw new AppError('User context required', 403);

      const { title, agenda, meetingType: meetingTypeRaw } = req.body;
      let { timelineResolutionMs } = req.body;
      if (!title) throw new AppError('Title is required', 400);

      const meetingType =
        meetingTypeRaw === 'RECORDED' ? MeetingType.RECORDED : MeetingType.LIVE;

      if (meetingType === MeetingType.RECORDED) {
        timelineResolutionMs = 0;
      } else {
        timelineResolutionMs = Number.isFinite(timelineResolutionMs) ? timelineResolutionMs : 2000;
      }

      const result = await meetingService.createMeeting({
        organizationId: orgId,
        userId,
        title,
        agenda,
        timelineResolutionMs,
        meetingType,
      });

      log.info('Meeting created', {
        meetingId: result.meeting.id,
        orgId,
        userId,
        title,
        meetingType,
      });
      res.status(201).json({
        success: true,
        data: {
          ...result.meeting,
          streamTicket: result.streamTicket,
          ticketExpiresAt: result.ticketExpiresAt,
        },
        message: 'Meeting created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /:id
   * Fetches all analysis data (Timeline, Alert History, AI Summary)
   */
  async getMeetingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new AppError('Organization context required', 403);

      const { id } = req.params;
      if (!id) throw new AppError('Meeting ID is required', 400);

      const meetingDetails = await meetingService.getFullMeetingAnalysis(id);

      log.info('Meeting analysis fetched', { meetingId: id, orgId });
      res.status(200).json({
        success: true,
        data: meetingDetails,
        message: 'Meeting details fetched successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /:id
   * Updates mutable meeting fields (title, agenda)
   */
  async updateMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new AppError('Organization context required', 403);

      const { id } = req.params;
      if (!id) throw new AppError('Meeting ID is required', 400);

      const userId = req.user?.id;
      if (!userId) throw new AppError('User context required', 403);

      const { title, agenda } = req.body as { title?: string; agenda?: string | null };

      const updatedMeeting = await meetingService.updateMeetingFields(id, orgId, userId, {
        ...(title !== undefined ? { title } : {}),
        ...(agenda !== undefined ? { agenda } : {}),
      });

      log.info('Meeting fields updated', { meetingId: id });
      res.status(200).json({
        success: true,
        data: updatedMeeting,
        message: 'Meeting updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /:id
   * Permanently deletes a meeting and its related data. MODERATOR only; not allowed while IN_PROGRESS.
   */
  async deleteMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!orgId || !userId) throw new AppError('User context required', 403);

      const { id } = req.params;
      if (!id) throw new AppError('Meeting ID is required', 400);

      await meetingService.deleteMeeting(id, orgId, userId);

      log.info('Meeting deleted', { meetingId: id, userId });
      res.status(200).json({
        success: true,
        message: 'Meeting deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /:id/end
   * Validates org/user/status, transitions meeting to COMPLETED, clears stream ticket.
   */
  async endMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!orgId || !userId) throw new AppError('User context required', 403);

      const { id } = req.params;
      if (!id) throw new AppError('Meeting ID is required', 400);

      const updatedMeeting = await meetingService.endMeeting(id, orgId, userId);

      log.info('Meeting ended', { meetingId: id, userId });
      res.status(200).json({
        success: true,
        data: updatedMeeting,
        message: 'Meeting ended successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /:id/export
   * Exports the data of a completed meeting as a report
   */
  async exportMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new AppError('Organization context required', 403);

      const { id } = req.params;
      if (!id) throw new AppError('Meeting ID is required', 400);

      const format = req.query.format as string || 'pdf';

      const exportData = await meetingService.exportMeetingReport(id, format);

      log.info('Meeting export generated', { meetingId: id, format });
      res.status(200).json({
        success: true,
        data: exportData,
        message: 'Export generated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /:id/start
   * Validates org/user/status, transitions meeting to IN_PROGRESS, issues a stream ticket.
   */
  async startMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!orgId || !userId) throw new AppError('User context required', 403);

      const { id } = req.params;
      if (!id) throw new AppError('Meeting ID is required', 400);

      const result = await meetingService.startMeeting(id, orgId, userId);

      log.info('Meeting started', { meetingId: id, userId });
      res.status(202).json({
        success: true,
        data: result,
        message: 'Meeting started — stream ticket issued',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /:id/events
   * SSE Endpoint. Pushes anomaly events instantly and continuously
   */
  async streamEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new AppError('Organization context required', 403);

      const { id } = req.params;
      if (!id) throw new AppError('Meeting ID is required', 400);

      // Set headers for Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Flush headers so client connects immediately
      res.flushHeaders();

      log.info('SSE client connected', { meetingId: id, orgId });
      sseManager.subscribe(id, res);
      sseManager.publish(id, SseEventType.CONNECTED, { meetingId: id });

      req.on('close', () => {
        sseManager.unsubscribe(id, res);
        log.info('SSE client disconnected', { meetingId: id });
      });
    } catch (error) {
      next(error);
    }
  }
}
