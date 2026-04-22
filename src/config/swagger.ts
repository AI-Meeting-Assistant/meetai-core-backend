import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MeetAI Core Backend API',
      version: '1.0.0',
      description: 'AI Assisted Online Meeting Optimization and Analytics Tool — Backend API',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'integer', example: 400 },
                message: { type: 'string', example: 'Human-readable error message' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fullName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['MODERATOR', 'VIEWER'] },
            organizationId: { type: 'string', format: 'uuid' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Meeting: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            agenda: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
            timelineResolutionMs: { type: 'integer', example: 2000 },
            aiSummary: { type: 'string', nullable: true },
            startedAt: { type: 'string', format: 'date-time', nullable: true },
            endedAt: { type: 'string', format: 'date-time', nullable: true },
            organizationId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
          },
        },
        MeetingAlert: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            meetingId: { type: 'string', format: 'uuid' },
            eventType: { type: 'string', example: 'LOW_FOCUS' },
            severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            message: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        TimelineData: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            meetingId: { type: 'string', format: 'uuid' },
            offsetMs: { type: 'integer', example: 2000 },
            payload: {
              type: 'object',
              description: 'JSONB payload containing focus, emotion, and audio metrics from AI workers',
            },
          },
        },
        TicketIssueResult: {
          type: 'object',
          properties: {
            streamTicket: { type: 'string', format: 'uuid' },
            ticketExpiresAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResult: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        MeetingAnalysis: {
          type: 'object',
          properties: {
            meeting: { $ref: '#/components/schemas/Meeting' },
            timeline: {
              type: 'array',
              items: { $ref: '#/components/schemas/TimelineData' },
            },
            alerts: {
              type: 'array',
              items: { $ref: '#/components/schemas/MeetingAlert' },
            },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, '../api/routes/*.ts'), path.join(__dirname, '../api/routes/*.js')],
};

export const swaggerSpec = swaggerJsdoc(options);
