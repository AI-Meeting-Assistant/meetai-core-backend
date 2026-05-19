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

  /**
   * Merges a partial payload slice into the TimelineData row at (meetingId, offsetMs).
   * Creates the row if it does not exist yet. Used for out-of-order audio/video/context arrival.
   */
  async upsertPayloadSlice(
    meetingId: string,
    offsetMs: number,
    slice: Record<string, unknown>,
    tx?: Prisma.TransactionClient,
  ): Promise<TimelineData> {
    const client = tx ?? prisma;
    const existing = await client.timelineData.findFirst({ where: { meetingId, offsetMs } });
    const merged = { ...(existing?.payload as Record<string, unknown> ?? {}), ...slice } as Prisma.InputJsonValue;
    if (existing) {
      return client.timelineData.update({ where: { id: existing.id }, data: { payload: merged } });
    }
    return client.timelineData.create({ data: { meetingId, offsetMs, payload: merged } });
  }
}
