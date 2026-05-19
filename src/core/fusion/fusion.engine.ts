import { FusedChunk, ContextResult } from '../../types/sse-events';
import { AppError } from '../../utils/errors/AppError';
import { TimelineRepository } from '../../infrastructure/database/repositories/timeline.repository';

const timelineRepository = new TimelineRepository();

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

    timelineRepository.upsertPayloadSlice(this.meetingId, fused.offsetMs, {
      audio: fused.audio,
      video: fused.video,
    }).catch(err => {
      throw new AppError(`Failed to upsert timeline data for meeting ${this.meetingId} at offset ${fused.offsetMs}: ${err.message}`, 500);
    });

    this.onFused(fused);
  }

  onContext(data: ContextResult): void {
    timelineRepository.upsertPayloadSlice(this.meetingId, data.offsetMs, {
      context: {
        contextFit: data.contextFit,
        onTopic: data.onTopic,
        reason: data.reason,
        chunksAnalysed: data.chunksAnalysed,
      },
    }).catch(err => {
      throw new AppError(`Failed to upsert context for meeting ${this.meetingId} at offset ${data.offsetMs}: ${err.message}`, 500);
    });
  }

  destroy(): void {
    this.buffer.clear();
  }
}
