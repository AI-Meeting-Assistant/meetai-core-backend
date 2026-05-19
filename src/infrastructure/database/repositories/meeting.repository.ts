import prisma from '../prisma.client';
import { Prisma, MeetingStatus, MeetingType, Meeting, User, Organization } from '@prisma/client';

export class MeetingRepository {
  async findPaginated(
    organizationId: string,
    opts: { page: number; limit: number; status?: string; meetingType?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<{ items: Meeting[]; total: number }> {
    const client = tx ?? prisma;
    const where: Prisma.MeetingWhereInput = {
      organizationId,
      ...(opts.status ? { status: opts.status as MeetingStatus } : {}),
      ...(opts.meetingType ? { meetingType: opts.meetingType as MeetingType } : {}),
    };
    const [items, total] = await Promise.all([
      client.meeting.findMany({
        where,
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        orderBy: { startedAt: 'desc' },
      }),
      client.meeting.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * Creates a new meeting.
   */
  async create(data: Prisma.MeetingUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Meeting> {
    return (tx ?? prisma).meeting.create({ data });
  }

  /**
   * Returns the meeting including its relations (moderator and organization).
   */
  async findByIdWithDetails(id: string, tx?: Prisma.TransactionClient): Promise<(Meeting & { user: User; organization: Organization }) | null> {
    return (tx ?? prisma).meeting.findUnique({
      where: { id },
      include: {
        user: true, // This is the moderator
        organization: true,
      },
    });
  }

  /**
   * Updates the meeting status.
   */
  async updateStatus(
    id: string,
    status: MeetingStatus,
    timestamps?: { startedAt?: Date | null; endedAt?: Date | null },
    tx?: Prisma.TransactionClient,
  ): Promise<Meeting> {
    return (tx ?? prisma).meeting.update({
      where: { id },
      data: {
        status,
        ...(timestamps?.startedAt !== undefined ? { startedAt: timestamps.startedAt } : {}),
        ...(timestamps?.endedAt !== undefined ? { endedAt: timestamps.endedAt } : {}),
      },
    });
  }

  /**
   * Updates mutable meeting fields (title, agenda).
   */
  async updateFields(
    id: string,
    fields: { title?: string; agenda?: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<Meeting> {
    return (tx ?? prisma).meeting.update({
      where: { id },
      data: fields,
    });
  }

  /**
   * Updates the aiSummary text field.
   */
  async updateAiSummary(id: string, summary: string, tx?: Prisma.TransactionClient): Promise<Meeting> {
    return (tx ?? prisma).meeting.update({
      where: { id },
      data: { aiSummary: summary },
    });
  }

  /**
   * Permanently deletes a meeting. Child timeline and alert rows are removed via DB cascade.
   */
  async delete(id: string, tx?: Prisma.TransactionClient): Promise<Meeting> {
    return (tx ?? prisma).meeting.delete({ where: { id } });
  }
}
