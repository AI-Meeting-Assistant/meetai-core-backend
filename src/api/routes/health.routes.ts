import { Router, Request, Response } from 'express';

export const healthRouter = Router();

/**
 * GET /api/v1/health
 * Simple liveness check — no DB or Redis dependency.
 */
healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'OK',
    timestamp: new Date().toISOString(),
  });
});
