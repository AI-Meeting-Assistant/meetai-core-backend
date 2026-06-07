import { MeetingRepository } from '../../infrastructure/database/repositories/meeting.repository';
import { OrganizationRepository } from '../../infrastructure/database/repositories/organization.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { TimelineRepository } from '../../infrastructure/database/repositories/timeline.repository';
import { AlertRepository } from '../../infrastructure/database/repositories/alert.repository';
import { AppError } from '../../utils/errors/AppError';
import { Prisma, MeetingStatus, Meeting, MeetingType } from '@prisma/client';
import { StreamTicketService, TicketIssueResult } from './ticket.service';
import { fusionEngineRegistry } from '../fusion/fusion.registry';
import { sseManager } from '../../infrastructure/websocket/sse.manager';
import { SseEventType } from '../../types/sse-events';

export interface CreateMeetingResult {
  meeting: Meeting;
  streamTicket?: string;
  ticketExpiresAt?: string;
}

export class MeetingService {
  private meetingRepository: MeetingRepository;
  private organizationRepository: OrganizationRepository;
  private userRepository: UserRepository;
  private timelineRepository: TimelineRepository;
  private alertRepository: AlertRepository;
  private streamTicketService: StreamTicketService;

  constructor() {
    this.meetingRepository = new MeetingRepository();
    this.organizationRepository = new OrganizationRepository();
    this.userRepository = new UserRepository();
    this.timelineRepository = new TimelineRepository();
    this.alertRepository = new AlertRepository();
    this.streamTicketService = new StreamTicketService();
  }

  async listMeetings(
    organizationId: string,
    opts: { page: number; limit: number; status?: string; meetingType?: string },
  ): Promise<{ items: Meeting[]; total: number; page: number; limit: number; totalPages: number }> {
    const { items, total } = await this.meetingRepository.findPaginated(organizationId, opts);
    return {
      items,
      total,
      page: opts.page,
      limit: opts.limit,
      totalPages: Math.ceil(total / opts.limit),
    };
  }

  async createMeeting(data: Prisma.MeetingUncheckedCreateInput): Promise<CreateMeetingResult> {
    if (!data.organizationId || !data.userId) {
      throw new AppError('Organization ID and User ID are required', 400);
    }

    const org = await this.organizationRepository.findById(data.organizationId);
    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    const user = await this.userRepository.findById(data.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.organizationId !== data.organizationId) {
      throw new AppError('User does not belong to the specified organization', 403);
    }

    const meetingType = data.meetingType ?? MeetingType.LIVE;
    const isRecorded = meetingType === MeetingType.RECORDED;

    const createData: Prisma.MeetingUncheckedCreateInput = {
      ...data,
      meetingType,
      status: isRecorded ? MeetingStatus.IN_PROGRESS : (data.status ?? MeetingStatus.SCHEDULED),
      startedAt: isRecorded ? new Date() : data.startedAt,
      timelineResolutionMs: isRecorded ? 0 : (data.timelineResolutionMs ?? 6000),
    };

    const meeting = await this.meetingRepository.create(createData);

    if (!isRecorded) {
      return { meeting };
    }

    const ticket = await this.streamTicketService.issueTicket(meeting.id);
    return {
      meeting,
      streamTicket: ticket.streamTicket,
      ticketExpiresAt: ticket.ticketExpiresAt,
    };
  }

  async getFullMeetingAnalysis(meetingId: string, organizationId: string) {
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

    const timeline = await this.timelineRepository.findAllByMeetingId(meetingId);
    const alerts = await this.alertRepository.findAlertsByMeetingId(meetingId);

    return {
      meeting,
      timeline,
      alerts
    };
  }

  async assertMeetingInOrganization(meetingId: string, organizationId: string): Promise<void> {
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
  }

  async updateMeetingFields(
    meetingId: string,
    orgId: string,
    userId: string,
    fields: { title?: string; agenda?: string | null },
  ): Promise<Meeting> {
    const meeting = await this.meetingRepository.findByIdWithDetails(meetingId);
    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    if (meeting.organizationId !== orgId) {
      throw new AppError('Forbidden: Meeting does not belong to your organization', 403);
    }

    if (meeting.userId !== userId) {
      throw new AppError('Forbidden: Only the meeting moderator can update this meeting', 403);
    }

    const hasTitle = fields.title !== undefined;
    const hasAgenda = fields.agenda !== undefined;
    if (!hasTitle && !hasAgenda) {
      throw new AppError('At least one field (title or agenda) must be provided', 400);
    }

    const patch: { title?: string; agenda?: string | null } = {};
    if (hasTitle) {
      const trimmed = (fields.title ?? '').trim();
      if (!trimmed) {
        throw new AppError('Title cannot be empty', 400);
      }
      patch.title = trimmed;
    }
    if (hasAgenda) {
      const trimmed = (fields.agenda ?? '').trim();
      patch.agenda = trimmed.length > 0 ? trimmed : null;
    }

    return this.meetingRepository.updateFields(meetingId, patch);
  }

  async startMeeting(meetingId: string, orgId: string, userId: string): Promise<TicketIssueResult> {
    const meeting = await this.meetingRepository.findByIdWithDetails(meetingId);
    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    if (meeting.organizationId !== orgId) {
      throw new AppError('Forbidden: Meeting does not belong to your organization', 403);
    }

    if (meeting.userId !== userId) {
      throw new AppError('Forbidden: Only the meeting moderator can start this meeting', 403);
    }

    if (meeting.meetingType === MeetingType.RECORDED) {
      throw new AppError('Recorded meetings cannot be started manually', 409);
    }

    if (meeting.status !== 'SCHEDULED') {
      throw new AppError(`Meeting cannot be started from status: ${meeting.status}`, 409);
    }

    await this.meetingRepository.updateStatus(meetingId, 'IN_PROGRESS', { startedAt: new Date() });

    fusionEngineRegistry.start(meetingId, meeting.timelineResolutionMs);

    return this.streamTicketService.issueTicket(meetingId);
  }

  async endMeeting(meetingId: string, orgId: string, userId: string): Promise<{ meeting: Meeting; transcript: string }> {
    const meeting = await this.meetingRepository.findByIdWithDetails(meetingId);
    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    if (meeting.organizationId !== orgId) {
      throw new AppError('Forbidden: Meeting does not belong to your organization', 403);
    }

    if (meeting.userId !== userId) {
      throw new AppError('Forbidden: Only the meeting moderator can end this meeting', 403);
    }

    if (meeting.status !== 'IN_PROGRESS') {
      throw new AppError(`Meeting cannot be ended from status: ${meeting.status}`, 409);
    }

    const updatedMeeting = await this.meetingRepository.updateStatus(meetingId, 'COMPLETED', { endedAt: new Date() });

    fusionEngineRegistry.stop(meetingId);
    // SSE connection intentionally kept alive — SUMMARY_READY event will close it via completeWithSummary

    const timeline = await this.timelineRepository.findAllByMeetingId(meetingId);
    const transcript = timeline
      .sort((a, b) => a.offsetMs - b.offsetMs)
      .map(row => (row.payload as Record<string, unknown> & { audio?: { transcript?: string } })?.audio?.transcript)
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .join(' ');

    return { meeting: updatedMeeting, transcript };
  }

  async completeWithSummary(meetingId: string, summary: string): Promise<void> {
    await this.meetingRepository.updateAiSummary(meetingId, summary);
    await this.streamTicketService.clearTicket(meetingId);
    sseManager.publish(meetingId, SseEventType.SUMMARY_READY, { meetingId, aiSummary: summary });
    sseManager.unsubscribeAll(meetingId);
  }

  async deleteMeeting(meetingId: string, orgId: string, userId: string): Promise<void> {
    const meeting = await this.meetingRepository.findByIdWithDetails(meetingId);
    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    if (meeting.organizationId !== orgId) {
      throw new AppError('Forbidden: Meeting does not belong to your organization', 403);
    }

    if (meeting.userId !== userId) {
      throw new AppError('Forbidden: Only the meeting moderator can delete this meeting', 403);
    }

    if (meeting.status === 'IN_PROGRESS') {
      const isRecordedProcessing =
        meeting.meetingType === MeetingType.RECORDED;
      if (isRecordedProcessing) {
        const timeline = await this.timelineRepository.findAllByMeetingId(meetingId);
        if (timeline.length > 0) {
          throw new AppError('Meeting cannot be deleted while processing has produced results', 409);
        }
      } else {
        throw new AppError('Meeting cannot be deleted while in progress. End the meeting first.', 409);
      }
    }

    await this.streamTicketService.clearTicket(meetingId);
    await this.meetingRepository.delete(meetingId);
  }

  async completeRecordedMeeting(meetingId: string, payload: Record<string, unknown>): Promise<void> {
    const aiSummary = (payload['aiSummary'] as string | null | undefined) ?? null;

    await this.timelineRepository.upsertPayloadSlice(meetingId, 0, payload);

    await this.meetingRepository.updateStatus(meetingId, MeetingStatus.COMPLETED, { endedAt: new Date() });
    await this.meetingRepository.updateAiSummary(meetingId, aiSummary ?? '');

    await this.streamTicketService.clearTicket(meetingId);
    sseManager.publish(meetingId, SseEventType.MEETING_COMPLETED, { meetingId });
  }

  async failRecordedMeeting(meetingId: string, payload: Record<string, unknown>): Promise<void> {
    const reason = (payload['reason'] as string | undefined) ?? 'Unknown processing error';

    await this.meetingRepository.updateStatus(meetingId, MeetingStatus.COMPLETED, { endedAt: new Date() });
    await this.meetingRepository.updateAiSummary(meetingId, `Processing failed: ${reason}`);

    await this.streamTicketService.clearTicket(meetingId);
    sseManager.publish(meetingId, SseEventType.MEETING_FAILED, { meetingId, reason });
  }
}
