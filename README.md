# MeetAI Core Backend

AI-powered meeting assistant backend. Combines computer vision (focus/emotion) and audio (VAD/diarization) data from a Python AI service to provide real-time feedback and post-meeting analytics to a meeting moderator.

> Senior year graduation project.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| Cache / Broker | Redis (Pub/Sub from Python AI services) |
| Real-Time | Server-Sent Events + WebSocket |
| Auth | JWT + bcryptjs |
| LLM | Groq / OpenAI (planned) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or a Supabase project)
- Redis instance

### Setup

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, JWT_SECRET

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot-reload (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output |

---

## API

Base URL: `http://localhost:3000/api/v1`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Liveness check |
| POST | `/auth/register` | No | Register user + create organization |
| POST | `/auth/login` | No | Login, receive JWT |
| GET | `/meetings` | Yes | List org meetings |
| POST | `/meetings` | Yes | Create a meeting |
| GET | `/meetings/:id` | Yes | Full meeting analysis |
| PATCH | `/meetings/:id` | Yes | Update meeting status |
| GET | `/meetings/:id/export` | Yes | Export meeting report |
| GET | `/meetings/:id/events` | Yes | SSE stream for live alerts |
| GET | `/timeline/:meetingId` | Yes | Meeting timeline data |
| GET | `/alerts/:meetingId` | Yes | Meeting alerts |

Protected routes require `Authorization: Bearer <token>`.

---

## Project Structure

```
src/
├── api/
│   ├── controllers/     # HTTP request/response handlers
│   ├── middlewares/     # requireAuth, requireRole, errorHandler
│   └── routes/          # Route definitions, exported via index.ts facade
├── core/
│   ├── services/        # Business logic
│   ├── fusion/          # Data Fusion Engine (sliding window — Phase 3)
│   └── rule-engine/     # Anomaly detection rules (Phase 3)
├── infrastructure/
│   ├── database/        # Prisma singleton + repositories
│   ├── redis/           # Redis client + Pub/Sub subscriber
│   ├── websocket/       # WebSocket gateway (Phase 4)
│   └── llm-client/      # LLM API integration (Phase 5)
└── utils/
    └── errors/          # AppError custom error class
```

---

## Roadmap

| Phase | Status | Focus |
|-------|--------|-------|
| 1 — Infrastructure | Done | Express app, Prisma schema, repositories, routes |
| 2 — Authentication | Done | JWT auth, RBAC, register/login flow |
| 3 — Core AI Pipeline | In Progress | Fusion Engine, Rule Engine, alert creation |
| 4 — Real-Time Delivery | Planned | WebSocket gateway, live SSE alerts |
| 5 — LLM Integration | Planned | Post-meeting summary generation |
