import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TimelineService } from '../../src/core/services/timeline.service';

const { findAllMock, findMeetingMock } = vi.hoisted(() => ({
  findAllMock: vi.fn(),
  findMeetingMock: vi.fn(),
}));

vi.mock('../../src/infrastructure/database/repositories/timeline.repository', () => ({
  TimelineRepository: vi.fn().mockImplementation(() => ({
    findAllByMeetingId: findAllMock,
  })),
}));

vi.mock('../../src/infrastructure/database/repositories/meeting.repository', () => ({
  MeetingRepository: vi.fn().mockImplementation(() => ({
    findByIdWithDetails: findMeetingMock,
  })),
}));

describe('TimelineService', () => {
  let service: TimelineService;

  beforeEach(() => {
    findAllMock.mockClear();
    findMeetingMock.mockClear();
    service = new TimelineService();
  });

  it('throws 400 when meetingId is empty', async () => {
    await expect(service.getMeetingTimeline('', 'org-test')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(findMeetingMock).not.toHaveBeenCalled();
  });

  it('throws 404 when meeting is missing', async () => {
    findMeetingMock.mockResolvedValue(null);

    await expect(service.getMeetingTimeline('meet-1', 'org-test')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 403 when meeting belongs to another organization', async () => {
    findMeetingMock.mockResolvedValue({ id: 'meet-1', organizationId: 'org-other' });

    await expect(service.getMeetingTimeline('meet-1', 'org-test')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(findAllMock).not.toHaveBeenCalled();
  });

  it('returns timeline entries from repository', async () => {
    const mockEntries = [
      { id: 't1', meetingId: 'meet-1', offsetMs: 0, payload: {} },
      { id: 't2', meetingId: 'meet-1', offsetMs: 6000, payload: {} },
    ];
    findMeetingMock.mockResolvedValue({ id: 'meet-1', organizationId: 'org-test' });
    findAllMock.mockResolvedValue(mockEntries);

    const result = await service.getMeetingTimeline('meet-1', 'org-test');

    expect(findAllMock).toHaveBeenCalledWith('meet-1');
    expect(result).toEqual(mockEntries);
  });
});
