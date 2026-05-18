import { FusedChunk } from '../../types/sse-events';
import { prisma } from '../../infrastructure/database/prisma.client';
import { AppError } from '../../utils/errors/AppError';

interface AudioChunk {
  meetingId: string
  offsetMs: number
  transcript: string | null
  vadSpeechMs: number | null
  vadSilenceMs: number | null
  vadSpeechRatioPercent: number | null
  speakerLabelsWindow: unknown[] | null
}

interface VideoChunk {
  meetingId: string
  offsetMs: number
  focusScore: number
  persons: Array<{ personId: number; focusScore: number; speakingRatio: number; frameCount: number }>
}

interface AlignmentBucket {
  audio?: AudioChunk
  video?: VideoChunk
}

export class FusionEngine {
  private buffer: Map<number, AlignmentBucket> = new Map();
  private readonly meetingId: string;
  private readonly timeResolutionMs: number;
  private readonly onFused: (chunk: FusedChunk) => void;

  constructor(meetingId: string, timeResolutionMs: number, onFused: (chunk: FusedChunk) => void) {
    this.meetingId = meetingId;
    this.timeResolutionMs = timeResolutionMs;
    this.onFused = onFused;
  }

  onAudio(data: AudioChunk): void {
    const bucket = Math.floor(data.offsetMs / this.timeResolutionMs);
    const entry = this.buffer.get(bucket) ?? {};
    entry.audio = data;
    this.buffer.set(bucket, entry);
    this.tryFuse(bucket);
  }

  onVideo(data: VideoChunk): void {
    const bucket = Math.floor(data.offsetMs / this.timeResolutionMs);
    const entry = this.buffer.get(bucket) ?? {};
    entry.video = data;
    this.buffer.set(bucket, entry);
    this.tryFuse(bucket);
  }

  private tryFuse(bucket: number): void {
    const entry = this.buffer.get(bucket);
    if (!entry?.audio || !entry?.video) return;

    const { audio, video } = entry;
    const fused: FusedChunk = {
      meetingId: this.meetingId,
      offsetMs: audio.offsetMs,
      audio: {
        vadSpeechMs: audio.vadSpeechMs,
        vadSilenceMs: audio.vadSilenceMs,
        vadSpeechRatioPercent: audio.vadSpeechRatioPercent,
        transcript: audio.transcript,
        speakerLabelsWindow: audio.speakerLabelsWindow,
      },
      video: {
        focusScore: video.focusScore,
        persons: video.persons,
      },
    };

    this.buffer.delete(bucket);

    prisma.timelineData.create({
      data: {
        meetingId: this.meetingId,
        offsetMs: fused.offsetMs,
        payload: fused as any,
      }
    }).catch(err => {
      throw new AppError(`Failed to save timeline data for meeting ${this.meetingId} at offset ${fused.offsetMs}: ${err.message}`, 500);
    });

    this.onFused(fused);
  }

  destroy(): void {
    this.buffer.clear();
  }
}
