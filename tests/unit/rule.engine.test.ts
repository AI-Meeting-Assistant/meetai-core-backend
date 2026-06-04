// @trace UC-03-NF-2 — focus below threshold triggers alert
// @trace UC-03-ALT-2.1 — agenda deviation alert
// @trace SDD-DG1 — real-time rule evaluation on fused chunks

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SseEventType, type FusedChunk } from '../../src/types/sse-events';

const { publishMock, createAlertMock } = vi.hoisted(() => ({
  publishMock: vi.fn(),
  createAlertMock: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/infrastructure/websocket/sse.manager', () => ({
  sseManager: { publish: publishMock },
}));

vi.mock('../../src/infrastructure/database/repositories/alert.repository', () => ({
  AlertRepository: vi.fn().mockImplementation(() => ({
    createAlert: createAlertMock,
  })),
}));

import { ruleEngine } from '../../src/core/rule-engine/rule.engine';

function fusedChunk(overrides: Partial<FusedChunk> = {}): FusedChunk {
  return {
    meetingId: 'meet-rules',
    offsetMs: 0,
    audio: {
      vadSpeechMs: 1000,
      vadSilenceMs: 1000,
      vadSpeechRatioPercent: 10,
      transcript: null,
      transcriptLines: null,
      speakerTalkMs: null,
      speakerTalkRatioPercent: null,
      speakerLabelsWindow: null,
    },
    video: { focusScore: 0.3, persons: [] },
    speakerMapping: null,
    ...overrides,
  };
}

describe('RuleEngine', () => {
  const meetingId = 'meet-rules';

  beforeEach(() => {
    publishMock.mockClear();
    createAlertMock.mockClear();
    ruleEngine.cleanup(meetingId);
  });

  it('publishes FUSED_DATA on every chunk', () => {
    ruleEngine.evaluateFusedChunk(meetingId, fusedChunk({ video: { focusScore: 0.9, persons: [] } }));
    expect(publishMock).toHaveBeenCalledWith(meetingId, SseEventType.FUSED_DATA, expect.any(Object));
  });

  it('triggers FOCUS_DROP after window of low focus scores', () => {
    for (let i = 0; i < 6; i++) {
      ruleEngine.evaluateFusedChunk(
        meetingId,
        fusedChunk({ offsetMs: i * 2000, video: { focusScore: 0.2, persons: [] } }),
      );
    }
    const focusEvents = publishMock.mock.calls.filter((c) => c[1] === SseEventType.FOCUS_DROP);
    expect(focusEvents.length).toBeGreaterThanOrEqual(1);
    expect(createAlertMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'FOCUS_DROP', meetingId }),
    );
  });

  it('triggers AGENDA_DEVIATION when context fit is below threshold', () => {
    ruleEngine.evaluateContextResult(meetingId, {
      meetingId,
      offsetMs: 30000,
      contextFit: 0.2,
      onTopic: false,
      reason: 'Off topic',
      chunksAnalysed: 4,
    });

    const agendaEvents = publishMock.mock.calls.filter((c) => c[1] === SseEventType.AGENDA_DEVIATION);
    expect(agendaEvents).toHaveLength(1);
  });

  it('recovers AGENDA_FIT when context returns on track', () => {
    ruleEngine.evaluateContextResult(meetingId, {
      meetingId,
      offsetMs: 30000,
      contextFit: 0.2,
      onTopic: false,
      reason: 'Off topic',
      chunksAnalysed: 4,
    });
    ruleEngine.evaluateContextResult(meetingId, {
      meetingId,
      offsetMs: 60000,
      contextFit: 0.9,
      onTopic: true,
      reason: null,
      chunksAnalysed: 4,
    });

    const fitEvents = publishMock.mock.calls.filter((c) => c[1] === SseEventType.AGENDA_FIT);
    expect(fitEvents).toHaveLength(1);
  });

  it('skips agenda rule when contextFit is null', () => {
    ruleEngine.evaluateContextResult(meetingId, {
      meetingId,
      offsetMs: 0,
      contextFit: null,
      onTopic: null,
      reason: null,
      chunksAnalysed: 0,
    });
    const agendaEvents = publishMock.mock.calls.filter(
      (c) => c[1] === SseEventType.AGENDA_DEVIATION || c[1] === SseEventType.AGENDA_FIT,
    );
    expect(agendaEvents).toHaveLength(0);
  });
});
