import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { moderatorToken, viewerToken } from '../helpers/tokens';

const {
  getMeetingByIdMock,
  updateMeetingFieldsMock,
  deleteMeetingMock,
  endMeetingMock,
  exportMeetingMock,
} = vi.hoisted(() => ({
  getMeetingByIdMock: vi.fn(),
  updateMeetingFieldsMock: vi.fn(),
  deleteMeetingMock: vi.fn(),
  endMeetingMock: vi.fn(),
  exportMeetingMock: vi.fn(),
}));

vi.mock('../../src/core/services/meeting.service', () => ({
  MeetingService: vi.fn().mockImplementation(() => ({
    listMeetings: vi.fn(),
    createMeeting: vi.fn(),
    startMeeting: vi.fn(),
    endMeeting: endMeetingMock,
    getFullMeetingAnalysis: getMeetingByIdMock,
    updateMeetingFields: updateMeetingFieldsMock,
    deleteMeeting: deleteMeetingMock,
    exportMeetingReport: exportMeetingMock,
    completeRecordedMeeting: vi.fn(),
    failRecordedMeeting: vi.fn(),
  })),
}));

vi.mock('../../src/infrastructure/websocket/sse.manager', () => ({
  sseManager: { publish: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() },
}));

const mockMeeting = { id: 'meet-1', title: 'Standup', status: 'SCHEDULED', organizationId: 'org-test' };

describe('GET /api/v1/meetings/:id', () => {
  beforeEach(() => getMeetingByIdMock.mockClear());

  it('returns 200 with meeting analysis', async () => {
    getMeetingByIdMock.mockResolvedValue({ meeting: mockMeeting, timeline: [], alerts: [] });

    const res = await request(app)
      .get('/api/v1/meetings/meet-1')
      .set('Authorization', `Bearer ${moderatorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(getMeetingByIdMock).toHaveBeenCalledWith('meet-1');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/meetings/meet-1');
    expect(res.status).toBe(401);
  });

});

describe('PATCH /api/v1/meetings/:id', () => {
  beforeEach(() => updateMeetingFieldsMock.mockClear());

  it('returns 200 with updated meeting', async () => {
    updateMeetingFieldsMock.mockResolvedValue({ ...mockMeeting, title: 'Updated' });

    const res = await request(app)
      .patch('/api/v1/meetings/meet-1')
      .set('Authorization', `Bearer ${moderatorToken()}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated');
  });

  it('returns 403 for viewer', async () => {
    const res = await request(app)
      .patch('/api/v1/meetings/meet-1')
      .set('Authorization', `Bearer ${viewerToken()}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(403);
    expect(updateMeetingFieldsMock).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/meetings/:id', () => {
  beforeEach(() => deleteMeetingMock.mockClear());

  it('returns 200 on successful delete', async () => {
    deleteMeetingMock.mockResolvedValue(undefined);

    const res = await request(app)
      .delete('/api/v1/meetings/meet-1')
      .set('Authorization', `Bearer ${moderatorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(deleteMeetingMock).toHaveBeenCalledWith('meet-1', 'org-test', 'user-mod');
  });

  it('returns 403 for viewer', async () => {
    const res = await request(app)
      .delete('/api/v1/meetings/meet-1')
      .set('Authorization', `Bearer ${viewerToken()}`);

    expect(res.status).toBe(403);
    expect(deleteMeetingMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/meetings/:id/end', () => {
  beforeEach(() => endMeetingMock.mockClear());

  it('returns 200 with ended meeting', async () => {
    endMeetingMock.mockResolvedValue({
      meeting: { ...mockMeeting, status: 'COMPLETED' },
      transcript: 'Speaker 1: Hello',
    });

    const res = await request(app)
      .post('/api/v1/meetings/meet-1/end')
      .set('Authorization', `Bearer ${moderatorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.transcript).toBe('Speaker 1: Hello');
  });

  it('returns 403 for viewer', async () => {
    const res = await request(app)
      .post('/api/v1/meetings/meet-1/end')
      .set('Authorization', `Bearer ${viewerToken()}`);

    expect(res.status).toBe(403);
    expect(endMeetingMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/meetings/:id/export', () => {
  beforeEach(() => exportMeetingMock.mockClear());

  it('returns 200 with export data', async () => {
    exportMeetingMock.mockResolvedValue('base64encodedpdf==');

    const res = await request(app)
      .get('/api/v1/meetings/meet-1/export')
      .set('Authorization', `Bearer ${moderatorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBe('base64encodedpdf==');
    expect(exportMeetingMock).toHaveBeenCalledWith('meet-1', 'pdf');
  });

  it('passes format query param to service', async () => {
    exportMeetingMock.mockResolvedValue('data');

    await request(app)
      .get('/api/v1/meetings/meet-1/export?format=pdf')
      .set('Authorization', `Bearer ${moderatorToken()}`);

    expect(exportMeetingMock).toHaveBeenCalledWith('meet-1', 'pdf');
  });
});
