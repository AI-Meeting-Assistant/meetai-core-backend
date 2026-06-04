// @trace UC-02.4-NF — text channel feeds rule engine
// @trace NFR-MAINT-01 — Redis channel naming contract

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { evaluateContextMock, onAudioMock } = vi.hoisted(() => ({
  evaluateContextMock: vi.fn(),
  onAudioMock: vi.fn(),
}));

vi.mock('../../src/core/rule-engine/rule.engine', () => ({
  ruleEngine: {
    evaluateContextResult: evaluateContextMock,
    evaluateFusedChunk: vi.fn(),
    cleanup: vi.fn(),
  },
}));

vi.mock('../../src/core/fusion/fusion.engine', () => ({
  FusionEngine: vi.fn().mockImplementation(() => ({
    onAudio: onAudioMock,
    onVideo: vi.fn(),
    onContext: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('../../src/infrastructure/redis/pubsub', () => ({
  subscriber: {
    connect: vi.fn(),
    psubscribe: vi.fn(),
    on: vi.fn(),
  },
}));

import { fusionEngineRegistry } from '../../src/core/fusion/fusion.registry';

describe('FusionEngineRegistry message routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evaluateContextMock.mockClear();
    onAudioMock.mockClear();
    fusionEngineRegistry.stop('meet-redis-1');
    fusionEngineRegistry.start('meet-redis-1', 2000);
  });

  afterEach(() => {
    fusionEngineRegistry.stop('meet-redis-1');
  });

  it('routes :audio messages to fusion engine when started', () => {
    const handler = (fusionEngineRegistry as unknown as { onMessage: Function }).onMessage.bind(
      fusionEngineRegistry,
    );

    handler(
      'meeting:*:audio',
      'meeting:meet-redis-1:audio',
      JSON.stringify({
        meetingId: 'meet-redis-1',
        offsetMs: 0,
        transcript: 'hello',
        transcriptLines: null,
        speakerTalkMs: null,
        speakerTalkRatioPercent: null,
        vadSpeechMs: 100,
        vadSilenceMs: 900,
        vadSpeechRatioPercent: 10,
        speakerLabelsWindow: null,
      }),
    );

    expect(onAudioMock).toHaveBeenCalledWith(
      expect.objectContaining({ meetingId: 'meet-redis-1', transcript: 'hello' }),
    );
  });

  it('routes :text messages to rule engine without fusion engine video', () => {
    const handler = (fusionEngineRegistry as unknown as { onMessage: Function }).onMessage.bind(
      fusionEngineRegistry,
    );

    handler(
      'meeting:*:text',
      'meeting:meet-redis-1:text',
      JSON.stringify({
        meetingId: 'meet-redis-1',
        offsetMs: 30000,
        contextFit: 0.4,
        onTopic: false,
        reason: 'Tangent',
        chunksAnalysed: 4,
      }),
    );

    expect(evaluateContextMock).toHaveBeenCalledWith(
      'meet-redis-1',
      expect.objectContaining({ contextFit: 0.4 }),
    );
  });

  it('ignores audio for unknown meeting without engine', () => {
    const handler = (fusionEngineRegistry as unknown as { onMessage: Function }).onMessage.bind(
      fusionEngineRegistry,
    );

    handler(
      'meeting:*:audio',
      'meeting:unknown-meeting:audio',
      JSON.stringify({ meetingId: 'unknown-meeting', offsetMs: 0, transcript: 'x' }),
    );

    expect(onAudioMock).not.toHaveBeenCalled();
  });
});
