import { subscriber } from '../../infrastructure/redis/pubsub';
import { FusionEngine } from './fusion.engine';
import { ruleEngine } from '../rule-engine/rule.engine';

type RecordedHandler = (meetingId: string, data: Record<string, unknown>) => Promise<void>;

class FusionEngineRegistry {
  private static instance: FusionEngineRegistry;
  private engines: Map<string, FusionEngine> = new Map();
  private onRecordedComplete: RecordedHandler = async () => {};
  private onRecordedError: RecordedHandler = async () => {};

  static getInstance(): FusionEngineRegistry {
    if (!FusionEngineRegistry.instance) {
      FusionEngineRegistry.instance = new FusionEngineRegistry();
    }
    return FusionEngineRegistry.instance;
  }

  initialize(handlers: { onRecordedComplete: RecordedHandler; onRecordedError: RecordedHandler }): void {
    this.onRecordedComplete = handlers.onRecordedComplete;
    this.onRecordedError = handlers.onRecordedError;
    subscriber.connect();
    subscriber.psubscribe(
      'meeting:*:audio',
      'meeting:*:vision',
      'meeting:*:text',
      'meeting:*:recorded-complete',
      'meeting:*:recorded-error',
    );
    subscriber.on('pmessage', this.onMessage.bind(this));
    console.log('[fusion-registry] Subscribed to meeting Redis channels');
  }

  start(meetingId: string, timeResolutionMs: number): void {
    if (this.engines.has(meetingId)) return;
    const engine = new FusionEngine(meetingId, timeResolutionMs, (chunk) => {
      ruleEngine.evaluateFusedChunk(meetingId, chunk);
    });
    this.engines.set(meetingId, engine);
    console.log(`[fusion-registry] Engine started for meeting ${meetingId}`);
  }

  stop(meetingId: string): void {
    const engine = this.engines.get(meetingId);
    if (!engine) return;
    engine.destroy();
    this.engines.delete(meetingId);
    ruleEngine.cleanup(meetingId);
    console.log(`[fusion-registry] Engine stopped for meeting ${meetingId}`);
  }

  private onMessage(_pattern: string, channel: string, message: string): void {
    const parts = channel.split(':');
    const meetingId = parts[1];
    if (!meetingId) return;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(message) as Record<string, unknown>;
    } catch (err) {
      console.error(`[fusion-registry] Failed to parse message on channel ${channel}`, err);
      return;
    }

    const engine = this.engines.get(meetingId);

    if (channel.endsWith(':recorded-complete')) {
      this.onRecordedComplete(meetingId, data).catch((err) => {
        console.error(`[fusion-registry] completeRecordedMeeting failed for ${meetingId}`, err);
      });
      return;
    }

    if (channel.endsWith(':recorded-error')) {
      this.onRecordedError(meetingId, data).catch((err) => {
        console.error(`[fusion-registry] failRecordedMeeting failed for ${meetingId}`, err);
      });
      return;
    }

    if (channel.endsWith(':audio')) {
      if (!engine) return;
      engine.onAudio({
        meetingId: data['meetingId'] as string,
        offsetMs: data['offsetMs'] as number,
        transcript: (data['transcript'] as string | null) ?? null,
        transcriptLines: (data['transcriptLines'] as Array<{ speaker: string; text: string }> | null) ?? null,
        speakerTalkMs: (data['speakerTalkMs'] as Record<string, number> | null) ?? null,
        speakerTalkRatioPercent: (data['speakerTalkRatioPercent'] as Record<string, number> | null) ?? null,
        vadSpeechMs: (data['vadSpeechMs'] as number | null) ?? null,
        vadSilenceMs: (data['vadSilenceMs'] as number | null) ?? null,
        vadSpeechRatioPercent: (data['vadSpeechRatioPercent'] as number | null) ?? null,
        speakerLabelsWindow: (data['speakerLabelsWindow'] as unknown[] | null) ?? null,
      });
      return;
    }

    if (channel.endsWith(':vision')) {
      if (!engine) return;
      engine.onVideo({
        meetingId: data['meetingId'] as string,
        offsetMs: data['offsetMs'] as number,
        focusScore: data['focusScore'] as number,
        persons: (data['persons'] as Array<{ personId: number; focusScore: number; speakingRatio: number; frameCount: number }>) ?? [],
      });
      return;
    }

    if (channel.endsWith(':text')) {
      const contextResult = {
        meetingId: data['meetingId'] as string,
        offsetMs: data['offsetMs'] as number,
        contextFit: (data['contextFit'] as number | null) ?? null,
        onTopic: (data['onTopic'] as boolean | null) ?? null,
        reason: (data['reason'] as string | null) ?? null,
        chunksAnalysed: data['chunksAnalysed'] as number,
      };
      ruleEngine.evaluateContextResult(meetingId, contextResult);
      if (engine) engine.onContext(contextResult);
    }
  }
}

export const fusionEngineRegistry = FusionEngineRegistry.getInstance();
