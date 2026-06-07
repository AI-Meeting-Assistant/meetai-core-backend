// @trace NFR-PERF-01 — ticket ensure hot path (micro-benchmark)
// @trace NFR-SEC-01 — Redis ticket lookup without network

import { performance } from 'node:perf_hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const WARMUP_ITERATIONS = 10;
const BENCHMARK_ITERATIONS = 2000;
const THRESHOLD_MS = 500;
const meetingId = 'meet-perf-ticket';

describe('StreamTicketService perf', () => {
  let svc: StreamTicketService;

  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.get.mockResolvedValue('existing-ticket');
    redisMock.ttl.mockResolvedValue(9000);
    svc = new StreamTicketService();
  });

  afterEach(async () => {
    await svc.clearTicket(meetingId);
  });

  it(`ensureTicket reuses ticket ${BENCHMARK_ITERATIONS} times within ${THRESHOLD_MS}ms`, async () => {
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      await svc.ensureTicket(meetingId);
    }

    const t0 = performance.now();
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      const result = await svc.ensureTicket(meetingId);
      expect(result.streamTicket).toBe('existing-ticket');
    }
    const elapsedMs = performance.now() - t0;

    expect(elapsedMs).toBeLessThan(THRESHOLD_MS);
    expect(redisMock.setex).not.toHaveBeenCalled();
  });
});
