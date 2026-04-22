import { Router } from 'express';
import { MeetingController } from '../controllers/meeting.controller';
import { requireAuth } from '../middlewares/requireAuth';
import { requireRole } from '../middlewares/requireRole';
import { Role } from '@prisma/client';

export const meetingRouter = Router();
const meetingController = new MeetingController();

meetingRouter.use(requireAuth);

/**
 * @openapi
 * /meetings:
 *   get:
 *     tags:
 *       - Meetings
 *     summary: List meetings
 *     description: Returns all meetings belonging to the authenticated user's organization.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, IN_PROGRESS, COMPLETED]
 *     responses:
 *       200:
 *         description: Meetings fetched successfully
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
 *                         $ref: '#/components/schemas/Meeting'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
meetingRouter.get('/', meetingController.getMeetings);

/**
 * @openapi
 * /meetings:
 *   post:
 *     tags:
 *       - Meetings
 *     summary: Create a new meeting
 *     description: Creates a new meeting with SCHEDULED status under the authenticated user's organization.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Q2 Planning Session
 *               agenda:
 *                 type: string
 *                 nullable: true
 *                 example: Review OKRs, assign owners, set deadlines
 *     responses:
 *       201:
 *         description: Meeting created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Meeting'
 *       400:
 *         description: Title is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
meetingRouter.post('/', meetingController.createMeeting);

/**
 * @openapi
 * /meetings/{id}:
 *   get:
 *     tags:
 *       - Meetings
 *     summary: Get full meeting analysis
 *     description: Returns the meeting record along with its full timeline data and alert history.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The meeting ID
 *     responses:
 *       200:
 *         description: Meeting details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MeetingAnalysis'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
meetingRouter.get('/:id', meetingController.getMeetingById);

/**
 * @openapi
 * /meetings/{id}:
 *   patch:
 *     tags:
 *       - Meetings
 *     summary: Update meeting fields
 *     description: Updates mutable meeting fields (title, agenda). Does not accept status — use /start or /end for status transitions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The meeting ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated Meeting Title
 *               agenda:
 *                 type: string
 *                 example: Updated agenda items
 *     responses:
 *       200:
 *         description: Meeting updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Meeting'
 *       400:
 *         description: At least one field must be provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Meeting does not belong to your organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
meetingRouter.patch('/:id', meetingController.updateMeeting);

/**
 * @openapi
 * /meetings/{id}/start:
 *   post:
 *     tags:
 *       - Meetings
 *     summary: Start a meeting
 *     description: Transitions meeting from SCHEDULED to IN_PROGRESS, stamps startedAt, and issues a stream ticket for WebSocket media authentication. MODERATOR only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The meeting ID
 *     responses:
 *       202:
 *         description: Meeting started — stream ticket issued
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TicketIssueResult'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a MODERATOR, or not the meeting's moderator
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Meeting is not in SCHEDULED status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
meetingRouter.post('/:id/start', requireRole([Role.MODERATOR]), meetingController.startMeeting);

/**
 * @openapi
 * /meetings/{id}/end:
 *   post:
 *     tags:
 *       - Meetings
 *     summary: End a meeting
 *     description: Transitions meeting from IN_PROGRESS to COMPLETED, stamps endedAt, and clears the stream ticket from Redis. MODERATOR only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The meeting ID
 *     responses:
 *       200:
 *         description: Meeting ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Meeting'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a MODERATOR, or not the meeting's moderator
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Meeting is not in IN_PROGRESS status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
meetingRouter.post('/:id/end', requireRole([Role.MODERATOR]), meetingController.endMeeting);

/**
 * @openapi
 * /meetings/{id}/export:
 *   get:
 *     tags:
 *       - Meetings
 *     summary: Export meeting report
 *     description: Exports the meeting analysis data as a base64-encoded report.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The meeting ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf]
 *           default: pdf
 *         description: Export format
 *     responses:
 *       200:
 *         description: Export generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: string
 *                       description: Base64-encoded report
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
meetingRouter.get('/:id/export', meetingController.exportMeeting);

/**
 * @openapi
 * /meetings/{id}/events:
 *   get:
 *     tags:
 *       - Meetings
 *     summary: SSE stream for live anomaly events
 *     description: Opens a Server-Sent Events stream that pushes real-time anomaly alerts from the rule engine to the moderator's dashboard. MODERATOR only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The meeting ID
 *     responses:
 *       200:
 *         description: SSE stream established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: "data: {\"type\":\"CONNECTED\",\"meetingId\":\"uuid\"}\n\n"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
meetingRouter.get('/:id/events', meetingController.streamEvents);
