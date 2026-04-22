import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller';
import { requireAuth } from '../middlewares/requireAuth';

export const alertRouter = Router();
const alertController = new AlertController();

alertRouter.use(requireAuth);

/**
 * @openapi
 * /alerts/{meetingId}:
 *   get:
 *     tags:
 *       - Alerts
 *     summary: Get all alerts for a meeting
 *     description: Returns all anomaly alerts triggered by the rule engine during a specific meeting, ordered by createdAt descending.
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
 *         description: Alerts fetched successfully
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
 *                         $ref: '#/components/schemas/MeetingAlert'
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
alertRouter.get('/:meetingId', alertController.getAlerts);
