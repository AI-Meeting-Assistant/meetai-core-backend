import { sseManager } from '../../infrastructure/websocket/sse.manager';
import { SseEventType, FusedChunk, ContextResult } from '../../types/sse-events';
import { Logger } from '../../utils/logger';

const log = new Logger('RuleEngine');
// import { AlertRepository } from '../../infrastructure/database/repositories/alert.repository';

const FOCUS_THRESHOLD = 0.5;
const SPEAKING_RATE_THRESHOLD = 0.4;
const AGENDA_DEVIATION_THRESHOLD = 0.5;
const WINDOW_SIZE = 6;

// const alertRepository = new AlertRepository();

class RuleEngine {
  private static instance: RuleEngine;

  // "meetingId:FOCUS" | "meetingId:SPEAKING_RATE" → last N chunk values
  private history: Map<string, number[]> = new Map();

  // "meetingId:FOCUS_DROP" | "meetingId:SPEAKING_RATE_DROP" → alert currently active
  private alertActive: Map<string, boolean> = new Map();

  static getInstance(): RuleEngine {
    if (!RuleEngine.instance) {
      RuleEngine.instance = new RuleEngine();
    }
    return RuleEngine.instance;
  }

  evaluateFusedChunk(meetingId: string, chunk: FusedChunk): void {
    sseManager.publish(meetingId, SseEventType.FUSED_DATA, chunk);

    this.evaluateFocusRule(meetingId, chunk);
    this.evaluateSpeakingRateRule(meetingId, chunk);
  }

  evaluateContextResult(meetingId: string, result: ContextResult): void {
    if (result.onTopic === false) {
      log.info('AGENDA_DEVIATION triggered', { meetingId, contextFit: result.contextFit, onTopic: result.onTopic, offsetMs: result.offsetMs });
      sseManager.publish(meetingId, SseEventType.AGENDA_DEVIATION, {
        contextFit: result.contextFit,
        onTopic: result.onTopic,
        reason: result.reason,
        offsetMs: result.offsetMs,
      });
      // await alertRepository.createAlert({
      //   meetingId,
      //   eventType: 'AGENDA_DEVIATION',
      //   severity: 'MEDIUM',
      //   message: `Meeting is deviating from the agenda (context fit: ${(result.contextFit * 100).toFixed(0)}%)`,
      // });
    } else if (result.onTopic === true) {
      log.info('AGENDA_FIT triggered', { meetingId, contextFit: result.contextFit, offsetMs: result.offsetMs });
      sseManager.publish(meetingId, SseEventType.AGENDA_FIT, {
        contextFit: result.contextFit,
        onTopic: result.onTopic,
        offsetMs: result.offsetMs,
      });
    }
    // onTopic === null means LLM returned an error — emit nothing
  }

  cleanup(meetingId: string): void {
    for (const key of this.history.keys()) {
      if (key.startsWith(`${meetingId}:`)) this.history.delete(key);
    }
    for (const key of this.alertActive.keys()) {
      if (key.startsWith(`${meetingId}:`)) this.alertActive.delete(key);
    }
  }

  private evaluateFocusRule(meetingId: string, chunk: FusedChunk): void {
    const historyKey = `${meetingId}:FOCUS`;
    const alertKey = `${meetingId}:FOCUS_DROP`;

    const scores = this.history.get(historyKey) ?? [];
    scores.push(chunk.video.focusScore);
    if (scores.length > WINDOW_SIZE) scores.shift();
    this.history.set(historyKey, scores);

    if (scores.length < WINDOW_SIZE) return;

    const avg = scores.reduce((a, b) => a + b, 0) / WINDOW_SIZE;
    const active = this.alertActive.get(alertKey) ?? false;

    if (avg < FOCUS_THRESHOLD && !active) {
      log.info('FOCUS_DROP triggered', { meetingId, avg, offsetMs: chunk.offsetMs });
      sseManager.publish(meetingId, SseEventType.FOCUS_DROP, {
        avg: parseFloat(avg.toFixed(4)),
        offsetMs: chunk.offsetMs,
      });
      this.alertActive.set(alertKey, true);
      // await alertRepository.createAlert({
      //   meetingId,
      //   eventType: 'FOCUS_DROP',
      //   severity: 'HIGH',
      //   message: `Average focus dropped below threshold (avg: ${(avg * 100).toFixed(0)}%)`,
      // });
    } else if (avg >= FOCUS_THRESHOLD && active) {
      log.info('FOCUS_RECOVERED triggered', { meetingId, avg, offsetMs: chunk.offsetMs });
      sseManager.publish(meetingId, SseEventType.FOCUS_RECOVERED, {
        avg: parseFloat(avg.toFixed(4)),
        offsetMs: chunk.offsetMs,
      });
      this.alertActive.set(alertKey, false);
    }
  }

  private evaluateSpeakingRateRule(meetingId: string, chunk: FusedChunk): void {
    const ratio = chunk.audio.vadSpeechRatioPercent;
    if (ratio === null) return;
    const ratioPoint = ratio / 100;

    const historyKey = `${meetingId}:SPEAKING_RATE`;
    const alertKey = `${meetingId}:SPEAKING_RATE_DROP`;

    const scores = this.history.get(historyKey) ?? [];
    scores.push(ratioPoint);
    if (scores.length > WINDOW_SIZE) scores.shift();
    this.history.set(historyKey, scores);

    if (scores.length < WINDOW_SIZE) return;

    const avg = scores.reduce((a, b) => a + b, 0) / WINDOW_SIZE;
    const active = this.alertActive.get(alertKey) ?? false;

    if (avg < SPEAKING_RATE_THRESHOLD && !active) {
      log.info('SPEAKING_RATE_DROP triggered', { meetingId, avg, offsetMs: chunk.offsetMs });
      sseManager.publish(meetingId, SseEventType.SPEAKING_RATE_DROP, {
        avg: parseFloat(avg.toFixed(4)),
        offsetMs: chunk.offsetMs,
      });
      this.alertActive.set(alertKey, true);
      // await alertRepository.createAlert({
      //   meetingId,
      //   eventType: 'SPEAKING_RATE_DROP',
      //   severity: 'MEDIUM',
      //   message: `Average speaking rate dropped below threshold (avg: ${avg.toFixed(1)}%)`,
      // });
    } else if (avg >= SPEAKING_RATE_THRESHOLD && active) {
      log.info('SPEAKING_RATE_RECOVERED triggered', { meetingId, avg, offsetMs: chunk.offsetMs });
      sseManager.publish(meetingId, SseEventType.SPEAKING_RATE_RECOVERED, {
        avg: parseFloat(avg.toFixed(4)),
        offsetMs: chunk.offsetMs,
      });
      this.alertActive.set(alertKey, false);
    }
  }
}

export const ruleEngine = RuleEngine.getInstance();
