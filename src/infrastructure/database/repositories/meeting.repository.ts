import prisma from '../prisma.client';
import { Prisma, MeetingStatus, Meeting, User, Organization } from '@prisma/client';

export class MeetingRepository {
  /**
   * Returns all meetings.
   */
  async findAll(tx?: Prisma.TransactionClient): Promise<Meeting[]> {
    return (tx ?? prisma).meeting.findMany();
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
  async updateStatus(id: string, status: MeetingStatus, tx?: Prisma.TransactionClient): Promise<Meeting> {
    return (tx ?? prisma).meeting.update({
      where: { id },
      data: { status },
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
}
