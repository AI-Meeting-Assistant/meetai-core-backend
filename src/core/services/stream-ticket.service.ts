import { randomUUID } from 'crypto';
import { redisClient } from '../../infrastructure/redis/redis.client';
import { AppError } from '../../utils/errors/AppError';

interface TicketIssueResult {
  streamTicket: string;
  ticketExpiresAt: string;
}

export class StreamTicketService {
  private static readonly TICKET_TTL_SECONDS = 18000;
  private static readonly REFRESH_INTERVAL_MS = 300000;
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();

  private getTicketKey(meetingId: string): string {
    return `meeting:${meetingId}:ticket`;
  }

  async issueTicket(meetingId: string): Promise<TicketIssueResult> {
    try {
      const streamTicket = randomUUID();
      const key = this.getTicketKey(meetingId);

      await redisClient.setex(key, StreamTicketService.TICKET_TTL_SECONDS, streamTicket);
      this.startRefreshLoop(meetingId);

      const ticketExpiresAt = new Date(Date.now() + StreamTicketService.TICKET_TTL_SECONDS * 1000).toISOString();
      return { streamTicket, ticketExpiresAt };
    } catch (error) {
      throw new AppError('Failed to issue stream ticket', 500);
    }
  }

  async ensureTicket(meetingId: string): Promise<TicketIssueResult> {
    try {
      const key = this.getTicketKey(meetingId);
      const existingTicket = await redisClient.get(key);

      if (!existingTicket) {
        return this.issueTicket(meetingId);
      }

      let ttlSeconds = await redisClient.ttl(key);
      if (ttlSeconds <= 0) {
        await redisClient.expire(key, StreamTicketService.TICKET_TTL_SECONDS);
        ttlSeconds = StreamTicketService.TICKET_TTL_SECONDS;
      }

      this.startRefreshLoop(meetingId);

      return {
        streamTicket: existingTicket,
        ticketExpiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      };
    } catch (error) {
      throw new AppError('Failed to ensure stream ticket', 500);
    }
  }

  async clearTicket(meetingId: string): Promise<void> {
    try {
      const key = this.getTicketKey(meetingId);
      await redisClient.del(key);
      this.stopRefreshLoop(meetingId);
    } catch (error) {
      throw new AppError('Failed to clear stream ticket', 500);
    }
  }

  private startRefreshLoop(meetingId: string): void {
    const existingTimer = this.refreshTimers.get(meetingId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timer = setInterval(async () => {
      try {
        const key = this.getTicketKey(meetingId);
        const exists = await redisClient.exists(key);
        if (exists === 0) {
          this.stopRefreshLoop(meetingId);
          return;
        }
        await redisClient.expire(key, StreamTicketService.TICKET_TTL_SECONDS);
      } catch (error) {
        // Keep the loop alive; temporary Redis failures should not crash process.
      }
    }, StreamTicketService.REFRESH_INTERVAL_MS);

    this.refreshTimers.set(meetingId, timer);
  }

  private stopRefreshLoop(meetingId: string): void {
    const timer = this.refreshTimers.get(meetingId);
    if (!timer) {
      return;
    }
    clearInterval(timer);
    this.refreshTimers.delete(meetingId);
  }
}
