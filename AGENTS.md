# AI Assisted Online Meeting Optimization and Analytics Tool
**Project Status:** Phase 2 Complete — Starting Phase 3 (Core AI Pipeline)
**Last Updated:** April 10, 2026

---

## 1. Executive Summary

This project, developed as a senior year graduation project, is a multimodal AI-supported meeting assistant aimed at solving inefficiencies in online meetings. The system does not solely rely on text; it combines computer vision (emotion and focus analysis via computer camera) and audio processing (speaking times and silence) data to provide the meeting moderator with real-time feedback (via Dashboard) and post-meeting AI (LLM) supported summaries.

**Primary Goal:** To replace the traditional "gut feeling" approach to meeting evaluation with data-driven and measurable metrics.

---

## 2. System Architecture and Tech Stack

Our system uses an **Event-Driven architecture** to manage asymmetric data flows and a **Layered Monolith** structure that gives a microservice feel.

- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL (to be hosted via Supabase), Prisma ORM
- **Real-Time Communication / Message Broker:** Redis (with Pub/Sub architecture to receive data from Python AI services)
- **Client Communication:** Server-Sent Events (SSE) and WebSocket
- **Artificial Intelligence (AI/ML) Layer:** A separate Python service (Computer Vision and Audio processing models — Out of scope for this document)

---

## 3. Backend Folder Structure (Layered Architecture)

Our backend project is built according to the **Separation of Concerns** principle.

```
grad-project-backend/
├── prisma/
│   └── schema.prisma              # Database modeling
├── src/
│   ├── api/                       # Presentation Layer
│   │   ├── controllers/           # HTTP Request/Response management (No business logic)
│   │   ├── middlewares/           # Global Error Handler, JWT, RBAC, etc.
│   │   └── routes/                # Endpoint definitions and centralized (index) routing
│   ├── core/                      # Business Logic & Domain Layer
│   │   ├── services/              # Core operations called from Controllers (CRUD, etc.)
│   │   ├── fusion/                # SDD: Data Fusion Engine (Merges data from Redis via Sliding Window)
│   │   └── rule-engine/           # SDD: Anomaly detection and notification rule sets
│   ├── infrastructure/            # External Dependencies (Data & Services Layer)
│   │   ├── database/              # Prisma Client (Singleton Pattern)
│   │   ├── redis/                 # Pub/Sub client configurations
│   │   ├── websocket/             # WS & SSE gateway setup
│   │   └── llm-client/            # Layer for external LLM API requests like Groq/OpenAI
│   ├── utils/                     # Utility Tools
│   │   └── errors/                # Custom Error Classes (e.g., AppError)
│   └── app.ts                     # Express.js application and Middleware wrapper
├── .env                           # Environment variables (Must be kept secret)
├── package.json
└── tsconfig.json
```

---

## 4. Application Development Standards (Our Rules)

The following mandatory rules apply to all Agents and developers:

### 4.1. Global Error Handling

- **RULE:** Successful or unsuccessful HTTP responses (e.g., `res.status(500).json(...)`) must **never** be constructed manually in any Controller or Service file.
- **IMPLEMENTATION:** When an error is detected, throw it using our custom error class: `throw new AppError("Message", 404)`.
- **ARCHITECTURE:** The `globalErrorHandler` middleware at the end of `app.ts` standardizes the format: `{ success: false, error: { code, message } }`.
- **ASYNC STRUCTURE:** Use `try-catch` blocks and pass errors to the middleware via `next(new AppError(...))`. (No async wrapper).

### 4.2. Routing and Isolation (Facade Pattern)

- **RULE:** Keep `app.ts` clean. Direct routes (e.g., `app.get('/users', ...)`) are **prohibited** within this file.
- **IMPLEMENTATION:** Write routes modularly in `src/api/routes/` and export them via `index.ts` (Facade) to connect to `app.ts`.

### 4.3. Database and Prisma (Singleton Pattern)

- **RULE:** Do **not** create a new Prisma Client instance for every request (prevents Connection Leaks).
- **IMPLEMENTATION:** Use the Singleton instance from `src/infrastructure/database/prisma.client.ts`.

### 4.4. Clean Code Principles

- **SOLID & DRY:** Shared logic (like validation) must be extracted into utilities or middleware.
- **Controller Isolation:** Controllers only handle Requests, call Services, and return Responses. No database queries or business logic in Controllers.

---

## 5. Critical System Components (SDD References)

Pay special attention to these two systems during core logic configuration:

**Data Fusion Engine** (`src/core/fusion/`)
- Listens to Image (Focus) and Audio (VAD) data from Redis.
- Uses **Sliding Time Window** logic (e.g., 2 seconds) to align and merge asynchronous data streams.

**Rule Engine** (`src/core/rule-engine/`)
- Processes merged Fusion data.
- Checks against **Thresholds** (e.g., "Focus < 40% for 3 minutes").
- Fires notifications to the Moderator's Dashboard via SSE/WebSocket if anomalies are detected.

---

## 6. HTTP Response Format Contract

All HTTP responses in this project follow a strict, standardized format. **Never deviate from these shapes.**

**Success Response:**
```json
{ "success": true, "data": <payload>, "message": "Human-readable string" }
```

**Error Response** (emitted automatically by `globalErrorHandler`):
```json
{ "success": false, "error": { "code": <httpStatusCode>, "message": "Human-readable string" } }
```

- `data` may be an object, array, or primitive depending on the endpoint.
- Never add extra top-level keys (e.g., no `meta`, `pagination`, `status` fields at the root level).
- Never construct error responses manually in controllers or services. Always `throw new AppError(...)`.

---

## 7. API Endpoint Reference

All routes are mounted under `/api/v1`. Protected routes require a `Authorization: Bearer <token>` header.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Liveness check |
| POST | `/auth/register` | No | Register a new user and auto-create their organization |
| POST | `/auth/login` | No | Login and receive a JWT token |
| GET | `/meetings` | Yes | List meetings for the authenticated org |
| POST | `/meetings` | Yes | Create a new meeting |
| GET | `/meetings/:id` | Yes | Get full meeting analysis (meeting + timeline + alerts) |
| PATCH | `/meetings/:id` | Yes | Update mutable meeting fields (`title`, `agenda`) — does not accept `status` |
| POST | `/meetings/:id/start` | Yes (MODERATOR) | Transition `SCHEDULED → IN_PROGRESS`, stamp `startedAt`, issue stream ticket — returns 202 |
| POST | `/meetings/:id/end` | Yes (MODERATOR) | Transition `IN_PROGRESS → COMPLETED`, stamp `endedAt`, clear stream ticket — returns 200 |
| GET | `/meetings/:id/export` | Yes | Export meeting report (base64, format via `?format=pdf`) |
| GET | `/meetings/:id/events` | Yes | SSE stream for live anomaly events |
| GET | `/timeline/:meetingId` | Yes | Get all timeline data entries for a meeting |
| GET | `/alerts/:meetingId` | Yes | Get all alerts triggered during a meeting |

---

## 8. Environment Variables Reference

All environment variables are loaded via `dotenv` in `app.ts` and `server.ts`. The `.env` file must never be committed.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Supabase) |
| `REDIS_URL` | Yes | Redis connection string (default: `redis://localhost:6379`) |
| `PORT` | No | HTTP server port (default: `3000`) |
| `NODE_ENV` | No | Runtime environment (`development` / `production`) |
| `JWT_SECRET` | Yes | Secret key for signing/verifying JWTs (used when real auth is implemented) |
| `LLM_API_KEY` | Yes | API key for the LLM provider (Groq / OpenAI) |
| `LLM_BASE_URL` | No | Base URL for the LLM provider (enables provider-agnostic setup via OpenAI SDK) |

---

## 8.1 Stream Ticket Security Contract

To protect Python AI workers from asymmetric compute attacks, media ingest is guarded by a server-issued stream ticket.

- Moderator starts a meeting via `POST /api/v1/meetings/:id/start`.
- Backend transitions status `SCHEDULED → IN_PROGRESS`, stamps `startedAt`, and issues a fresh UUID stream ticket.
- Backend stores it in Redis with TTL:
  - key: `meeting:<meetingId>:ticket`
  - command: `SETEX meeting:<meetingId>:ticket 18000 <streamTicket>`
- While meeting is `IN_PROGRESS`, backend auto-refreshes ticket TTL every `300` seconds via `EXPIRE meeting:<meetingId>:ticket 18000`.
- Backend returns ticket fields in the `/start` 202 response.
- Frontend includes `meetingId` + `streamTicket` in each media upload request to Python ingest.
- Python worker validates ticket in Redis before model inference:
  - mismatch/expired → immediate `401 Unauthorized`
  - valid → continue media processing
- Moderator ends a meeting via `POST /api/v1/meetings/:id/end`.
- Backend transitions status `IN_PROGRESS → COMPLETED`, stamps `endedAt`, and deletes the ticket from Redis.

**Why this exists:**
- Prevent unauthorized users from sending high-rate fake media to expensive GPU/CPU workers.
- Keep validation latency low (Redis lookup) and avoid per-request DB checks in Python.

**`/start` success response (202):**
```json
{
  "success": true,
  "data": {
    "streamTicket": "ticket_uuid",
    "ticketExpiresAt": "2026-04-23T18:00:00.000Z"
  },
  "message": "Meeting started — stream ticket issued"
}
```

---

## 9. File & Module Naming Conventions

Follow the existing patterns exactly. Do not introduce new naming styles.

| Layer | Pattern | Example |
|-------|---------|---------|
| Controller | `<domain>.controller.ts` | `meeting.controller.ts` |
| Service | `<domain>.service.ts` | `meeting.service.ts` |
| Repository | `<domain>.repository.ts` | `meeting.repository.ts` |
| Routes | `<domain>.routes.ts` | `meeting.routes.ts` |
| Infrastructure client | `<name>.client.ts` | `redis.client.ts`, `llm.client.ts` |

**Additional rules:**
- One class per file. The class name must match the file name (PascalCase of the filename).
- Services are instantiated at the module level inside controllers (`const meetingService = new MeetingService()`), not injected via constructor.
- Infrastructure clients (Redis, Prisma, LLM) are **singletons** — exported as a single instance from their module file.

---

## 10. TypeScript Standards

- **No `any`.** Use `unknown` and narrow with type guards, or define a proper interface/type.
- **Always annotate return types** on service and repository methods explicitly (e.g., `Promise<Meeting>`, not inferred).
- **Prisma-generated types are the source of truth.** Do not define manual interfaces that duplicate `Meeting`, `MeetingAlert`, `TimelineData`, etc. Import them directly from `@prisma/client`.
- **Use `Prisma.XxxCreateInput` / `Prisma.XxxUncheckedCreateInput`** for create payloads passed into repositories.
- Keep `tsconfig.json` in strict mode. Do not relax compiler options to silence errors.

---

## 11. MeetingStatus State Machine

Valid status transitions are enforced in `MeetingService.updateMeetingStatus`. Respect this state machine in all future code:

```
SCHEDULED → IN_PROGRESS → COMPLETED
```

- A `COMPLETED` meeting **cannot** transition to any other status.
- The `startedAt` field should be set when transitioning to `IN_PROGRESS`.
- On `IN_PROGRESS` transition, backend must issue a `streamTicket` and persist it in Redis using `meeting:<meetingId>:ticket` with TTL `18000` seconds.
- While `IN_PROGRESS`, backend should refresh ticket TTL every `300` seconds to keep long meetings alive without per-chunk Redis writes.
- The `endedAt` field should be set when transitioning to `COMPLETED`.

---

## 12. Layer Responsibility Contract

Each layer has a strict, single responsibility. Do not let logic bleed across layers.

| Layer | Responsibility | Must NOT |
|-------|---------------|----------|
| **Repository** | Raw Prisma/DB calls only | Contain business rules, throw `AppError`, call other repositories |
| **Service** | Orchestrate repositories, enforce business rules, emit events | Make direct `res`/`req` references, contain raw Prisma queries |
| **Controller** | Parse `req`, call one service method, send one `res` | Contain business logic, query the DB, throw errors that bypass `globalErrorHandler` |
| **Middleware** | Cross-cutting concerns (auth, error handling, logging) | Contain domain/business logic |

---

## 13. Phase Roadmap

Implement phases in order. Do not implement a later phase before its dependencies are in place.

| Phase | Focus | Key Deliverables |
|-------|-------|-----------------|
| **1** *(Done)* | Infrastructure & Boilerplate | Express app, Prisma schema, repositories, services, routes, Redis clients |
| **2** *(Done)* | Real Authentication | JWT validation in `requireAuth`, RBAC enforcement (`MODERATOR` vs `VIEWER`) |
| **3** | Core AI Pipeline | Fusion Engine (sliding window), Rule Engine (threshold rules + `MeetingAlert` creation) |
| **4** | Real-Time Delivery | WebSocket Gateway wired to Rule Engine output; SSE `/:id/events` wired to live alerts |
| **5** | LLM Integration | LLM Client, post-meeting summary generation triggered on `COMPLETED` status |