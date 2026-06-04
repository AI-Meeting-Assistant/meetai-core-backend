// @trace UC-01-NF-8 — stream ticket issued for live ingest
// @trace NFR-SEC-01 — ticket stored in Redis with TTL
// @trace SDD-DG2

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StreamTicketService } from '../../src/core/services/ticket.service';

const { redisMock } = vi.hoisted(() => ({
  redisMock: {
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn(),
    ttl: vi.fn(),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('../../src/infrastructure/redis/redis.client', () => ({
  redisClient: redisMock,
}));

describe('StreamTicketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('issues ticket and stores in Redis with TTL', async () => {
    const svc = new StreamTicketService();
    const result = await svc.issueTicket('meeting-abc');

    expect(result.streamTicket).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(redisMock.setex).toHaveBeenCalledWith(
      'meeting:meeting-abc:ticket',
      18000,
      result.streamTicket,
    );
    expect(new Date(result.ticketExpiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('reuses existing ticket on ensureTicket', async () => {
    redisMock.get.mockResolvedValueOnce('existing-ticket');
    redisMock.ttl.mockResolvedValueOnce(9000);

    const svc = new StreamTicketService();
    const result = await svc.ensureTicket('meeting-xyz');

    expect(result.streamTicket).toBe('existing-ticket');
    expect(redisMock.setex).not.toHaveBeenCalled();
  });

  it('clears ticket from Redis', async () => {
    const svc = new StreamTicketService();
    await svc.clearTicket('meeting-clear');

    expect(redisMock.del).toHaveBeenCalledWith('meeting:meeting-clear:ticket');
  });
});
