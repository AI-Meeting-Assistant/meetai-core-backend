// @trace UC-01-NF-7 — start meeting issues stream ticket
// @trace UC-02-NF-1 — IN_PROGRESS enables ingest path

import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { moderatorToken, viewerToken } from '../helpers/tokens';

const { startMeetingMock } = vi.hoisted(() => ({
  startMeetingMock: vi.fn(),
}));

vi.mock('../../src/core/services/meeting.service', () => ({
  MeetingService: vi.fn().mockImplementation(() => ({
    listMeetings: vi.fn(),
    createMeeting: vi.fn(),
    deleteMeeting: vi.fn(),
    startMeeting: startMeetingMock,
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

vi.mock('../../src/core/fusion/fusion.registry', () => ({
  fusionEngineRegistry: {
    start: vi.fn(),
    stop: vi.fn(),
    initialize: vi.fn(),
  },
}));

describe('POST /meetings/:id/start', () => {
  beforeEach(() => {
    startMeetingMock.mockClear();
  });

  it('returns stream ticket for moderator', async () => {
    startMeetingMock.mockResolvedValue({
      streamTicket: 'stream-uuid',
      ticketExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    const res = await request(app)
      .post('/api/v1/meetings/meet-1/start')
      .set('Authorization', `Bearer ${moderatorToken()}`);

    expect(res.status).toBe(202);
    expect(res.body.data.streamTicket).toBe('stream-uuid');
  });

  it('forbids viewer from starting meeting', async () => {
    const res = await request(app)
      .post('/api/v1/meetings/meet-1/start')
      .set('Authorization', `Bearer ${viewerToken()}`);

    expect(res.status).toBe(403);
    expect(startMeetingMock).not.toHaveBeenCalled();
  });
});
