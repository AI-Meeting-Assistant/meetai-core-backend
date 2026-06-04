// @trace UC-06-NF-2 — list meetings
// @trace UC-06-EXC-2.0.E1 — empty list returns success with empty items
// @trace UC-01-EXC-3.0.E1 — missing title on create

import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { moderatorToken } from '../helpers/tokens';

const { listMeetingsMock, createMeetingMock, deleteMeetingMock } = vi.hoisted(() => ({
  listMeetingsMock: vi.fn(),
  createMeetingMock: vi.fn(),
  deleteMeetingMock: vi.fn(),
}));

vi.mock('../../src/core/services/meeting.service', () => ({
  MeetingService: vi.fn().mockImplementation(() => ({
    listMeetings: listMeetingsMock,
    createMeeting: createMeetingMock,
    deleteMeeting: deleteMeetingMock,
    startMeeting: vi.fn(),
    endMeeting: vi.fn(),
    getMeetingById: vi.fn(),
    updateMeeting: vi.fn(),
    completeRecordedMeeting: vi.fn(),
    failRecordedMeeting: vi.fn(),
  })),
}));

vi.mock('../../src/infrastructure/websocket/sse.manager', () => ({
  sseManager: { publish: vi.fn() },
}));

describe('Meeting CRUD routes', () => {
  const token = moderatorToken();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty meeting list', async () => {
    listMeetingsMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });

    const res = await request(app)
      .get('/api/v1/meetings')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toEqual([]);
  });

  it('rejects create without title', async () => {
    const res = await request(app)
      .post('/api/v1/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send({ agenda: 'Sprint planning' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(createMeetingMock).not.toHaveBeenCalled();
  });

  it('creates meeting with optional empty agenda', async () => {
    createMeetingMock.mockResolvedValue({
      meeting: {
        id: 'm1',
        title: 'Standup',
        agenda: null,
        status: 'SCHEDULED',
        meetingType: 'LIVE',
      },
      streamTicket: 'ticket-1',
      ticketExpiresAt: new Date().toISOString(),
    });

    const res = await request(app)
      .post('/api/v1/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Standup', agenda: '' });

    expect(res.status).toBe(201);
    expect(createMeetingMock).toHaveBeenCalled();
  });
});
