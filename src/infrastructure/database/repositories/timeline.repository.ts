import prisma from '../prisma.client';
import { Prisma, TimelineData } from '@prisma/client';

export class TimelineRepository {
  /**
   * Creates a single timeline data entry.
   */
  async create(data: Prisma.TimelineDataUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<TimelineData> {
    return (tx ?? prisma).timelineData.create({ data });
  }

  /**
   * Fetches records where offsetMs is between startMs and endMs.
   */
  async findDataInTimeWindow(meetingId: string, startMs: number, endMs: number, tx?: Prisma.TransactionClient): Promise<TimelineData[]> {
    return (tx ?? prisma).timelineData.findMany({
      where: {
        meetingId,
        offsetMs: {
          gte: startMs,
          lte: endMs,
        },
      },
      orderBy: { offsetMs: 'asc' },
    });
  }

  /**
   * Fetches all timeline data for a specific meeting, ordered by offsetMs ascending.
   */
  async findAllByMeetingId(meetingId: string, tx?: Prisma.TransactionClient): Promise<TimelineData[]> {
    return (tx ?? prisma).timelineData.findMany({
      where: { meetingId },
      orderBy: { offsetMs: 'asc' },
    });
  }
}
