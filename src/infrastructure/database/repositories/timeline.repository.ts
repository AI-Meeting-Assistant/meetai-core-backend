import prisma from '../prisma.client';
import { Prisma, TimelineData } from '@prisma/client';

export class TimelineRepository {
  /**
   * Creates a single timeline data entry.
   */
  async create(data: Prisma.TimelineDataUncheckedCreateInput): Promise<TimelineData> {
    return prisma.timelineData.create({ data });
  }

  /**
   * Fetches records where offsetMs is between startMs and endMs.
   */
  async findDataInTimeWindow(meetingId: string, startMs: number, endMs: number): Promise<TimelineData[]> {
    return prisma.timelineData.findMany({
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
  async findAllByMeetingId(meetingId: string): Promise<TimelineData[]> {
    return prisma.timelineData.findMany({
      where: { meetingId },
      orderBy: { offsetMs: 'asc' },
    });
  }
}
