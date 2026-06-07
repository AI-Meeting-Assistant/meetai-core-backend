import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { moderatorToken } from '../helpers/tokens';

const { getTimelineMock } = vi.hoisted(() => ({
  getTimelineMock: vi.fn(),
}));

vi.mock('../../src/core/services/timeline.service', () => ({
  TimelineService: vi.fn().mockImplementation(() => ({
    getMeetingTimeline: getTimelineMock,
  })),
}));

describe('GET /api/v1/timeline/:meetingId', () => {
  beforeEach(() => {
    getTimelineMock.mockClear();
  });

  it('returns 200 with timeline entries', async () => {
    getTimelineMock.mockResolvedValue([
      { id: 't1', meetingId: 'meet-1', offsetMs: 0, payload: {} },
      { id: 't2', meetingId: 'meet-1', offsetMs: 6000, payload: {} },
    ]);

    const res = await request(app)
      .get('/api/v1/timeline/meet-1')
      .set('Authorization', `Bearer ${moderatorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(getTimelineMock).toHaveBeenCalledWith('meet-1', 'org-test');
  });

  it('returns 200 with empty array when no data', async () => {
    getTimelineMock.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/timeline/meet-1')
      .set('Authorization', `Bearer ${moderatorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/timeline/meet-1');

    expect(res.status).toBe(401);
    expect(getTimelineMock).not.toHaveBeenCalled();
  });
});
