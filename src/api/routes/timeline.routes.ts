import { Router } from 'express';
import { TimelineController } from '../controllers/timeline.controller';
import { requireAuth } from '../middlewares/requireAuth';

export const timelineRouter = Router();
const timelineController = new TimelineController();

timelineRouter.use(requireAuth);

/**
 * @openapi
 * /timeline/{meetingId}:
 *   get:
 *     tags:
 *       - Timeline
 *     summary: Get all timeline data for a meeting
 *     description: Returns all time-series analytics entries for a meeting ordered by offsetMs ascending. Each entry contains a JSONB payload with focus, emotion, and audio metrics from AI workers.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The meeting ID
 *     responses:
 *       200:
 *         description: Timeline data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TimelineData'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Meeting ID missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
timelineRouter.get('/:meetingId', timelineController.getTimeline);
