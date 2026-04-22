import { MeetingRepository } from '../../infrastructure/database/repositories/meeting.repository';
import { OrganizationRepository } from '../../infrastructure/database/repositories/organization.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { TimelineRepository } from '../../infrastructure/database/repositories/timeline.repository';
import { AlertRepository } from '../../infrastructure/database/repositories/alert.repository';
import { AppError } from '../../utils/errors/AppError';
import { Prisma, MeetingStatus, Meeting } from '@prisma/client';
import { StreamTicketService, TicketIssueResult } from './ticket.service';

interface MeetingStatusUpdateResult {
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

  async listMeetings(organizationId?: string, queryParams?: any) {
    let meetings = await this.meetingRepository.findAll();

    // Basic filtering based on organizationId if provided
    if (organizationId) {
      meetings = meetings.filter(m => m.organizationId === organizationId);
    }

    return meetings;
  }

  async createMeeting(data: Prisma.MeetingUncheckedCreateInput) {
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

    const createData: Prisma.MeetingUncheckedCreateInput = {
      ...data,
      status: data.status ?? MeetingStatus.SCHEDULED,
    };

    const meeting = await this.meetingRepository.create(createData);

    return meeting;
  }

  async getFullMeetingAnalysis(meetingId: string) {
    if (!meetingId) {
      throw new AppError('Meeting ID is required', 400);
    }

    const meeting = await this.meetingRepository.findByIdWithDetails(meetingId);
    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    const timeline = await this.timelineRepository.findAllByMeetingId(meetingId);
    const alerts = await this.alertRepository.findAlertsByMeetingId(meetingId);

    return {
      meeting,
      timeline,
      alerts
    };
  }

  async updateMeetingStatus(meetingId: string, status: MeetingStatus, preferences?: any): Promise<MeetingStatusUpdateResult> {
    if (!meetingId || !status) {
      throw new AppError('Meeting ID and Status are required', 400);
    }

    const meeting = await this.meetingRepository.findByIdWithDetails(meetingId);
    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    // Basic state transition validation
    if (meeting.status === 'COMPLETED' && status !== 'COMPLETED') {
      throw new AppError('Cannot change status of a COMPLETED meeting', 400);
    }

    if (meeting.status === 'SCHEDULED' && status === 'COMPLETED') {
      throw new AppError('Invalid status transition: SCHEDULED cannot move directly to COMPLETED', 400);
    }

    const timestamps: { startedAt?: Date | null; endedAt?: Date | null } = {};
    if (status === 'IN_PROGRESS' && !meeting.startedAt) {
      timestamps.startedAt = new Date();
    }
    if (status === 'COMPLETED') {
      timestamps.endedAt = new Date();
    }

    const updatedMeeting = await this.meetingRepository.updateStatus(meetingId, status, timestamps);
    const result: MeetingStatusUpdateResult = { meeting: updatedMeeting };

    if (status === 'IN_PROGRESS') {
      const ticket = await this.streamTicketService.ensureTicket(meetingId);
      result.streamTicket = ticket.streamTicket;
      result.ticketExpiresAt = ticket.ticketExpiresAt;
    }

    if (status === 'COMPLETED') {
      await this.streamTicketService.clearTicket(meetingId);
    }

    return result;
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

    if (meeting.status !== 'SCHEDULED') {
      throw new AppError(`Meeting cannot be started from status: ${meeting.status}`, 409);
    }

    await this.meetingRepository.updateStatus(meetingId, 'IN_PROGRESS', { startedAt: new Date() });

    return this.streamTicketService.issueTicket(meetingId);
  }

  async exportMeetingReport(meetingId: string, format: string) {
    if (!meetingId) {
      throw new AppError('Meeting ID is required', 400);
    }

    const analysis = await this.getFullMeetingAnalysis(meetingId);

    // Mock export behavior
    const mockReportData = `
      Meeting Report
      --------------
      Title: ${analysis.meeting.title}
      Status: ${analysis.meeting.status}
      Alerts Triggered: ${analysis.alerts.length}
      Recorded Events: ${analysis.timeline.length}
    `;

    return Buffer.from(mockReportData).toString('base64');
  }
}
