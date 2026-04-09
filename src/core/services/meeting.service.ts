import { MeetingRepository } from '../../infrastructure/database/repositories/meeting.repository';
import { OrganizationRepository } from '../../infrastructure/database/repositories/organization.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { TimelineRepository } from '../../infrastructure/database/repositories/timeline.repository';
import { AlertRepository } from '../../infrastructure/database/repositories/alert.repository';
import { AppError } from '../../utils/errors/AppError';
import { Prisma, MeetingStatus } from '@prisma/client';

export class MeetingService {
  private meetingRepository: MeetingRepository;
  private organizationRepository: OrganizationRepository;
  private userRepository: UserRepository;
  private timelineRepository: TimelineRepository;
  private alertRepository: AlertRepository;

  constructor() {
    this.meetingRepository = new MeetingRepository();
    this.organizationRepository = new OrganizationRepository();
    this.userRepository = new UserRepository();
    this.timelineRepository = new TimelineRepository();
    this.alertRepository = new AlertRepository();
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

    const meeting = await this.meetingRepository.create(data);

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

  async updateMeetingStatus(meetingId: string, status: MeetingStatus, preferences?: any) {
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

    const updatedMeeting = await this.meetingRepository.updateStatus(meetingId, status);

    return updatedMeeting;
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
