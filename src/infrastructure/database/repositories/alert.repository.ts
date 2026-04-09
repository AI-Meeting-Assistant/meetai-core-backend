import prisma from '../prisma.client';
import { Prisma, MeetingAlert } from '@prisma/client';

export class AlertRepository {
  /**
   * Creates a new meeting alert.
   */
  async createAlert(data: Prisma.MeetingAlertUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<MeetingAlert> {
    return (tx ?? prisma).meetingAlert.create({ data });
  }

  /**
   * Fetches all alerts for a meeting, ordered by createdAt descending.
   */
  async findAlertsByMeetingId(meetingId: string, tx?: Prisma.TransactionClient): Promise<MeetingAlert[]> {
    return (tx ?? prisma).meetingAlert.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
