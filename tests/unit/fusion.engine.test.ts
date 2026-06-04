// @trace UC-02.3-NF — fusion aligns audio and video by offset bucket
// @trace UC-02.3-ALT-6.1 — no speaker mapping when video/audio inactive
// @trace NFR-REL-01 — partial streams buffered until pair available
// @trace NFR-PERF-01 — bucket uses timeline_resolution_ms (2s default)

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FusionEngine } from '../../src/core/fusion/fusion.engine';

const { upsertMock } = vi.hoisted(() => ({
  upsertMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/infrastructure/database/repositories/timeline.repository', () => ({
  TimelineRepository: vi.fn().mockImplementation(() => ({
    upsertPayloadSlice: upsertMock,
  })),
}));

describe('FusionEngine', () => {
  const meetingId = 'meet-fusion-1';
  const resolutionMs = 2000;

  beforeEach(() => {
    upsertMock.mockClear();
  });

  function audioChunk(offsetMs: number, speakerRatios?: Record<string, number>) {
    return {
      meetingId,
      offsetMs,
      transcript: 'Speaker 1: hello',
      transcriptLines: [{ speaker: 'Speaker 1', text: 'hello' }],
      speakerTalkMs: { 'Speaker 1': 1500 },
      speakerTalkRatioPercent: speakerRatios ?? { 'Speaker 1': 80 },
      vadSpeechMs: 1500,
      vadSilenceMs: 500,
      vadSpeechRatioPercent: 75,
      speakerLabelsWindow: null,
    };
  }

  function videoChunk(offsetMs: number, persons = [{ personId: 1, focusScore: 0.8, speakingRatio: 0.5, frameCount: 10 }]) {
    return {
      meetingId,
      offsetMs,
      focusScore: 0.75,
      persons,
    };
  }

  it('fuses audio and video in the same time bucket', () => {
    const fused: unknown[] = [];
    const engine = new FusionEngine(meetingId, resolutionMs, (c) => fused.push(c));

    engine.onAudio(audioChunk(0));
    expect(fused).toHaveLength(0);

    engine.onVideo(videoChunk(0));
    expect(fused).toHaveLength(1);

    const chunk = fused[0] as { offsetMs: number; speakerMapping: Record<string, number> | null };
    expect(chunk.offsetMs).toBe(0);
    expect(chunk.speakerMapping).toEqual({ 'Speaker 1': 1 });
    expect(upsertMock).toHaveBeenCalledOnce();
  });

  it('places offset 2500ms in same bucket as 2000ms when resolution is 2000', () => {
    const fused: unknown[] = [];
    const engine = new FusionEngine(meetingId, resolutionMs, (c) => fused.push(c));

    engine.onAudio(audioChunk(2000));
    engine.onVideo(videoChunk(2500));
    expect(fused).toHaveLength(1);
  });

  it('returns null speaker mapping when video persons inactive', () => {
    const fused: unknown[] = [];
    const engine = new FusionEngine(meetingId, resolutionMs, (c) => fused.push(c));

    engine.onAudio(audioChunk(0, { 'Speaker 1': 2 }));
    engine.onVideo(videoChunk(0, [{ personId: 1, focusScore: 0.5, speakingRatio: 0.01, frameCount: 5 }]));
    const chunk = fused[0] as { speakerMapping: null };
    expect(chunk.speakerMapping).toBeNull();
  });

  it('stores context slice without requiring video', async () => {
    const engine = new FusionEngine(meetingId, resolutionMs, () => {});
    engine.onContext({
      meetingId,
      offsetMs: 12000,
      contextFit: 0.65,
      onTopic: true,
      reason: null,
      chunksAnalysed: 4,
    });
    expect(upsertMock).toHaveBeenCalledWith(
      meetingId,
      12000,
      expect.objectContaining({
        context: expect.objectContaining({ contextFit: 0.65 }),
      }),
    );
  });
});
