import { Router } from 'express';
import { healthRouter } from './health.routes';
import { meetingRouter } from './meeting.routes';
import { timelineRouter } from './timeline.routes';
import { alertRouter } from './alert.routes';

/**
 * API Router — Facade
 *
 * All sub-routers are mounted here and exported as a single `apiRouter`.
 * app.ts mounts this at '/api/v1', keeping app.ts free of direct route definitions.
 */
export const apiRouter = Router();

// ── Sub-Routers ───────────────────────────────────────────────────────────────
apiRouter.use('/health', healthRouter);
apiRouter.use('/meetings', meetingRouter);
apiRouter.use('/timeline', timelineRouter);
apiRouter.use('/alerts', alertRouter);
