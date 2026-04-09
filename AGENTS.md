# AI Assisted Online Meeting Optimization and Analytics Tool
**Project Status:** Phase 1 (Infrastructure and Boilerplate Setup)
**Last Updated:** April 9, 2026

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