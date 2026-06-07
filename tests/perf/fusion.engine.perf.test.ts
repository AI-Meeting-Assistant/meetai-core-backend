// @trace NFR-PERF-01 — fusion bucket CPU path (micro-benchmark)
// @trace SDD-DG1 — low-latency fusion hot path

import { performance } from 'node:perf_hooks';
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

const WARMUP_ITERATIONS = 10;
const BENCHMARK_ITERATIONS = 500;
const THRESHOLD_MS = 500;
const RESOLUTION_MS = 6000;
const meetingId = 'meet-perf-fusion';

function audioChunk(offsetMs: number) {
  return {
    meetingId,
    offsetMs,
    transcript: 'Speaker 1: hello',
    transcriptLines: [{ speaker: 'Speaker 1', text: 'hello' }],
    speakerTalkMs: { 'Speaker 1': 4500 },
    speakerTalkRatioPercent: { 'Speaker 1': 80 },
    vadSpeechMs: 4500,
    vadSilenceMs: 1500,
    vadSpeechRatioPercent: 75,
    speakerLabelsWindow: null,
  };
}

function videoChunk(offsetMs: number) {
  return {
    meetingId,
    offsetMs,
    focusScore: 0.75,
    persons: [{ personId: 1, focusScore: 0.8, speakingRatio: 0.5, frameCount: 10 }],
  };
}

describe('FusionEngine perf', () => {
  beforeEach(() => {
    upsertMock.mockClear();
  });

  it(`fuses ${BENCHMARK_ITERATIONS} audio+video buckets within ${THRESHOLD_MS}ms`, () => {
    const fused: unknown[] = [];
    const engine = new FusionEngine(meetingId, RESOLUTION_MS, (c) => fused.push(c));

    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      const offsetMs = i * RESOLUTION_MS;
      engine.onAudio(audioChunk(offsetMs));
      engine.onVideo(videoChunk(offsetMs));
    }
    fused.length = 0;
    upsertMock.mockClear();

    const t0 = performance.now();
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      const offsetMs = i * RESOLUTION_MS;
      engine.onAudio(audioChunk(offsetMs));
      engine.onVideo(videoChunk(offsetMs));
    }
    const elapsedMs = performance.now() - t0;

    expect(fused).toHaveLength(BENCHMARK_ITERATIONS);
    expect(elapsedMs).toBeLessThan(THRESHOLD_MS);
  });
});
