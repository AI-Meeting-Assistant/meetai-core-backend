import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AlertService } from '../../src/core/services/alert.service';

const { findAlertsMock } = vi.hoisted(() => ({
  findAlertsMock: vi.fn(),
}));

vi.mock('../../src/infrastructure/database/repositories/alert.repository', () => ({
  AlertRepository: vi.fn().mockImplementation(() => ({
    findAlertsByMeetingId: findAlertsMock,
  })),
}));

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(() => {
    findAlertsMock.mockClear();
    service = new AlertService();
  });

  it('throws 400 when meetingId is empty', async () => {
    await expect(service.getAlertsByMeetingId('')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(findAlertsMock).not.toHaveBeenCalled();
  });

  it('returns alerts from repository', async () => {
    const mockAlerts = [
      { id: 'a1', eventType: 'FOCUS_DROP', severity: 'HIGH', message: 'Low focus' },
    ];
    findAlertsMock.mockResolvedValue(mockAlerts);

    const result = await service.getAlertsByMeetingId('meet-1');

    expect(findAlertsMock).toHaveBeenCalledWith('meet-1');
    expect(result).toEqual(mockAlerts);
  });
});
