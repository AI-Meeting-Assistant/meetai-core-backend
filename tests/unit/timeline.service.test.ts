import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TimelineService } from '../../src/core/services/timeline.service';

const { findAllMock } = vi.hoisted(() => ({
  findAllMock: vi.fn(),
}));

vi.mock('../../src/infrastructure/database/repositories/timeline.repository', () => ({
  TimelineRepository: vi.fn().mockImplementation(() => ({
    findAllByMeetingId: findAllMock,
  })),
}));

describe('TimelineService', () => {
  let service: TimelineService;

  beforeEach(() => {
    findAllMock.mockClear();
    service = new TimelineService();
  });

  it('throws 400 when meetingId is empty', async () => {
    await expect(service.getMeetingTimeline('')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(findAllMock).not.toHaveBeenCalled();
  });

  it('returns timeline entries from repository', async () => {
    const mockEntries = [
      { id: 't1', meetingId: 'meet-1', offsetMs: 0, payload: {} },
      { id: 't2', meetingId: 'meet-1', offsetMs: 6000, payload: {} },
    ];
    findAllMock.mockResolvedValue(mockEntries);

    const result = await service.getMeetingTimeline('meet-1');

    expect(findAllMock).toHaveBeenCalledWith('meet-1');
    expect(result).toEqual(mockEntries);
  });
});
