import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AlertService } from '../../src/core/services/alert.service';

const { findAlertsMock, findMeetingMock } = vi.hoisted(() => ({
  findAlertsMock: vi.fn(),
  findMeetingMock: vi.fn(),
}));

vi.mock('../../src/infrastructure/database/repositories/alert.repository', () => ({
  AlertRepository: vi.fn().mockImplementation(() => ({
    findAlertsByMeetingId: findAlertsMock,
  })),
}));

vi.mock('../../src/infrastructure/database/repositories/meeting.repository', () => ({
  MeetingRepository: vi.fn().mockImplementation(() => ({
    findByIdWithDetails: findMeetingMock,
  })),
}));

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(() => {
    findAlertsMock.mockClear();
    findMeetingMock.mockClear();
    service = new AlertService();
  });

  it('throws 400 when meetingId is empty', async () => {
    await expect(service.getAlertsByMeetingId('', 'org-test')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(findMeetingMock).not.toHaveBeenCalled();
  });

  it('throws 403 when meeting belongs to another organization', async () => {
    findMeetingMock.mockResolvedValue({ id: 'meet-1', organizationId: 'org-other' });

    await expect(service.getAlertsByMeetingId('meet-1', 'org-test')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(findAlertsMock).not.toHaveBeenCalled();
  });

  it('returns alerts from repository', async () => {
    const mockAlerts = [
      { id: 'a1', eventType: 'FOCUS_DROP', severity: 'HIGH', message: 'Low focus' },
    ];
    findMeetingMock.mockResolvedValue({ id: 'meet-1', organizationId: 'org-test' });
    findAlertsMock.mockResolvedValue(mockAlerts);

    const result = await service.getAlertsByMeetingId('meet-1', 'org-test');

    expect(findAlertsMock).toHaveBeenCalledWith('meet-1');
    expect(result).toEqual(mockAlerts);
  });
});
