import { Response } from 'express';
import { SseEventType } from '../../types/sse-events';

class SseManager {
  private clients: Map<string, Response[]> = new Map();

  subscribe(meetingId: string, res: Response): void {
    const existing = this.clients.get(meetingId) ?? [];
    existing.push(res);
    this.clients.set(meetingId, existing);
  }

  unsubscribe(meetingId: string, res: Response): void {
    const existing = this.clients.get(meetingId);
    if (!existing) return;
    const updated = existing.filter((r) => r !== res);
    if (updated.length === 0) {
      this.clients.delete(meetingId);
    } else {
      this.clients.set(meetingId, updated);
    }
  }

  unsubscribeAll(meetingId: string): void {
    const existing = this.clients.get(meetingId);
    if (!existing) return;
    for (const res of existing) {
      try { res.end(); } catch { /* already closed */ }
    }
    this.clients.delete(meetingId);
  }

  publish(meetingId: string, type: SseEventType, data: unknown): void {
    const existing = this.clients.get(meetingId);
    if (!existing || existing.length === 0) return;
    const payload = `data: ${JSON.stringify({ type, ...(typeof data === 'object' && data !== null ? data : { data }) })}\n\n`;
    for (const res of existing) {
      try { res.write(payload); } catch { /* client disconnected */ }
    }
  }
}

export const sseManager = new SseManager();
