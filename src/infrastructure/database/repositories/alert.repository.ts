import prisma from '../prisma.client';
import { Prisma, MeetingAlert } from '@prisma/client';

export class AlertRepository {
  /**
   * Creates a new meeting alert.
   */
  async createAlert(data: Prisma.MeetingAlertUncheckedCreateInput): Promise<MeetingAlert> {
    return prisma.meetingAlert.create({ data });
  }

  /**
   * Fetches all alerts for a meeting, ordered by createdAt descending.
   */
  async findAlertsByMeetingId(meetingId: string): Promise<MeetingAlert[]> {
    return prisma.meetingAlert.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });
  }

}
