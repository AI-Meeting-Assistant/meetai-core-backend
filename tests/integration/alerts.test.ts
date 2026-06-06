import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { moderatorToken } from '../helpers/tokens';

const { getAlertsMock } = vi.hoisted(() => ({
  getAlertsMock: vi.fn(),
}));

vi.mock('../../src/core/services/alert.service', () => ({
  AlertService: vi.fn().mockImplementation(() => ({
    getAlertsByMeetingId: getAlertsMock,
  })),
}));

describe('GET /api/v1/alerts/:meetingId', () => {
  beforeEach(() => {
    getAlertsMock.mockClear();
  });

  it('returns 200 with alerts array', async () => {
    getAlertsMock.mockResolvedValue([
      { id: 'a1', eventType: 'FOCUS_DROP', severity: 'HIGH', message: 'Focus dropped' },
    ]);

    const res = await request(app)
      .get('/api/v1/alerts/meet-1')
      .set('Authorization', `Bearer ${moderatorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(getAlertsMock).toHaveBeenCalledWith('meet-1');
  });

  it('returns 200 with empty array when no alerts', async () => {
    getAlertsMock.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/alerts/meet-1')
      .set('Authorization', `Bearer ${moderatorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/alerts/meet-1');

    expect(res.status).toBe(401);
    expect(getAlertsMock).not.toHaveBeenCalled();
  });
});
