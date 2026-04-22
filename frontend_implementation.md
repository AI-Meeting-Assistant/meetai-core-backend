# MeetAI Frontend Implementation Plan

## Context

The backend is complete through Phase 2 (auth + all CRUD endpoints live). The frontend is a net-new Electron desktop app that needs to be built from scratch in its own repository. It renders a real-time moderator dashboard (live AI metrics + SSE alerts), a post-meeting analysis view, and standard auth/meeting management flows. The client-side captures screen video and mixed audio (system + mic) and uploads it to Python ingest as 2-second HTTP batches protected by a Redis-backed stream ticket.

---

## Tech Stack

| Concern | Choice |
|---------|--------|
| Desktop shell | Electron.js |
| Build tool | electron-vite (official Electron + Vite scaffold) |
| UI | React + TypeScript |
| Routing | React Router DOM |
| State | useState + Context API only |
| Styling | Deferred |
| Charting | Deferred |
| Media capture | `getDisplayMedia` + `getUserMedia` + Web Audio API |
| Live data | `EventSource` (SSE alerts) + HTTP batch upload (media ingest) |

---



## Project Structure

```
meetai-frontend/                        ← standalone git repo
├── electron/
│   ├── main.ts                         # Electron main process (minimal)
│   └── preload.ts                      # contextBridge (empty for MVP)
├── src/
│   ├── main.tsx                        # React entry point
│   ├── router.tsx                      # All routes + guards
│   ├── contexts/
│   │   ├── AuthContext.tsx             # Token, user, login/logout
│   │   └── MeetingContext.tsx          # Active meeting state + live alerts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── MeetingListPage.tsx
│   │   ├── LiveDashboardPage.tsx       # MODERATOR only
│   │   ├── MeetingAnalysisPage.tsx     # Both roles
│   │   └── SettingsPage.tsx            # Placeholder
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── meetings/
│   │   │   ├── MeetingCard.tsx
│   │   │   ├── CreateMeetingModal.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── dashboard/
│   │   │   ├── LiveMetricPanel.tsx     # Placeholder panels for Phase 3 data
│   │   │   ├── AlertFeed.tsx           # SSE-received alerts list
│   │   │   └── MeetingControls.tsx     # Start / End meeting buttons
│   │   └── analysis/
│   │       ├── TimelineViewer.tsx      # offsetMs + payload entries
│   │       ├── AlertsLog.tsx
│   │       ├── AiSummaryPanel.tsx      # Null state until COMPLETED + LLM
│   │       └── ExportButton.tsx
│   ├── hooks/
│   │   ├── useSSE.ts                   # EventSource lifecycle for notifications
│   │   └── useMediaStream.ts           # Capture + HTTP chunk upload
│   └── services/
│       ├── api.ts                      # Base fetch wrapper with JWT injection
│       ├── auth.service.ts
│       ├── meeting.service.ts
│       ├── sse.service.ts              # EventSource connection helpers for alerts
│       └── media-upload.service.ts     # Python ingest upload helpers (ticket protected)
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## State Architecture

### AuthContext
```ts
interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: 'MODERATOR' | 'VIEWER';
  organizationId: string;
}
interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```
- Token persisted to `localStorage` on login, cleared on logout.
- On app boot, read both `token` and serialized `user` from `localStorage`.
- JWT payload is used only for auth/role context (`id`, `organizationId`, `role`); do not derive `fullName` or `email` from JWT.

### MeetingContext
```ts
interface MeetingContextValue {
  activeMeetingId: string | null;
  streamTicket: string | null;
  ticketExpiresAt: string | null;
  liveAlerts: MeetingAlert[];
  setActiveMeeting: (id: string | null) => void;
  setStreamTicket: (ticket: string | null, expiresAt: string | null) => void;
  pushAlert: (alert: MeetingAlert) => void;
}
```
- `liveAlerts` is an append-only array populated by `useSSE`.
- `streamTicket` and `ticketExpiresAt` are set when meeting status transitions to `IN_PROGRESS`.
- Reset on meeting end.

---

## Services Layer

### `services/api.ts`
Base `fetch` wrapper:
- Reads token from `AuthContext` (passed in or read from localStorage).
- Injects `Authorization: Bearer <token>` on every request.
- Parses the `{ success, data, error }` envelope.
- Throws `Error(error.message)` when `success: false`.
- If status is `401`, force logout and navigate to `/login`.

### `services/auth.service.ts`
- `login(email, password): Promise<{ token: string; user: AuthUser }>`
  → `POST /api/v1/auth/login`
- `register(data): Promise<{ token: string; user: AuthUser }>`
  → `POST /api/v1/auth/register`

### `services/meeting.service.ts`
- `listMeetings(): Promise<Meeting[]>`
  → `GET /api/v1/meetings`
- `createMeeting(data): Promise<Meeting>`
  → `POST /api/v1/meetings`
- `getMeetingAnalysis(id): Promise<{ meeting, timeline, alerts }>`
  → `GET /api/v1/meetings/:id`
- `updateStatus(id, status): Promise<{ meeting: Meeting; streamTicket?: string; ticketExpiresAt?: string }>`
  → `PATCH /api/v1/meetings/:id`
- `exportReport(id, format): Promise<string>`
  → `GET /api/v1/meetings/:id/export?format=pdf`

### `services/sse.service.ts`
- `connectAlertsStream(meetingId, token): EventSource`
- `disconnectAlertsStream(): void`
- `onAlert(callback): void`
- Backend notification endpoint is SSE (`GET /api/v1/meetings/:id/events`).
- Since native EventSource cannot send `Authorization` header directly, frontend must use one of:
  - authenticated cookie-based session mode, or
  - short-lived SSE token query strategy agreed with backend, or
  - an API gateway/proxy that injects auth header.

### `services/media-upload.service.ts`
- `uploadChunk(payload): Promise<void>`
- Payload includes `meetingId`, `streamTicket`, and `mediaChunk` (2-second blob/chunk).
- Upload target is Python ingest HTTP endpoint.
- If Python returns `401` (invalid/expired ticket), stop capture and force secure fallback UX.

---

## Hooks

### `hooks/useSSE.ts`
```
useSSE(meetingId: string | null, token: string | null)
  - Opens EventSource to GET /api/v1/meetings/:id/events when meetingId + token are available
  - On message: calls pushAlert() from MeetingContext
  - On unmount or meetingId → null: closes EventSource
  - Returns { connected: boolean }
```

### `hooks/useMediaStream.ts`
```
useMediaStream()
  1. getDisplayMedia({ video: true, audio: true })   → screen video + system audio
  2. getUserMedia({ audio: true })                   → moderator mic
  3. AudioContext: merge system audio + mic into one destination stream
  4. Combine: screen video track + merged audio track → single MediaStream
  5. MediaRecorder emits 2-second chunks from combined stream
  6. For each chunk → POST to Python ingest with { meetingId, streamTicket, mediaChunk }
  - Returns { start(meetingId, streamTicket), stop(), isCapturing: boolean }
```

---

## Routing

```
/              → redirect → /meetings (authed) or /login
/login         → LoginPage
/register      → RegisterPage
/meetings      → MeetingListPage          [PrivateRoute]
/meetings/:id/live      → LiveDashboardPage     [ModeratorRoute]
/meetings/:id/analysis  → MeetingAnalysisPage   [PrivateRoute]
/settings      → SettingsPage             [PrivateRoute]
```

**`PrivateRoute`**: if no token → redirect to `/login`  
**`ModeratorRoute`**: if no token → `/login`, if role !== MODERATOR → `/meetings`

### Navigation logic in MeetingListPage
When a meeting card is clicked:
- `status === IN_PROGRESS` AND `role === MODERATOR` → `/meetings/:id/live`
- All other cases → `/meetings/:id/analysis`

---

## Page Details

### LoginPage / RegisterPage
- Form → call service → store result in `AuthContext` → navigate to `/meetings`

### MeetingListPage
- On mount: `meeting.service.listMeetings()`
- Renders list of `MeetingCard` components with `StatusBadge`
- MODERATOR only: "New Meeting" button → `CreateMeetingModal` (title + agenda fields)
- After create: refresh list

### LiveDashboardPage (MODERATOR only)
- On mount: `setActiveMeeting(id)`, `useSSE(id, token)`
- On "Start Meeting":
  - `updateStatus(id, 'IN_PROGRESS')` returns `streamTicket` + `ticketExpiresAt`
  - Save ticket in `MeetingContext`
  - Start media upload: `useMediaStream().start(id, streamTicket)`
- On unmount: `useMediaStream().stop()`, `setActiveMeeting(null)`
- `LiveMetricPanel` × N: placeholder panels labeled "Focus", "Emotion", "Audio" (empty until Phase 3 AI pipeline delivers real data)
- `AlertFeed`: renders `liveAlerts` from MeetingContext
- `MeetingControls`: 
  - "End Meeting" → `updateStatus(id, 'COMPLETED')` → clear ticket → navigate to `/meetings/:id/analysis`

### MeetingAnalysisPage (both roles)
- On mount: `getMeetingAnalysis(id)`
- `TimelineViewer`: list of timeline entries (offsetMs + raw payload JSON for now, charts deferred)
- `AlertsLog`: full alerts list with severity + eventType + createdAt
- `AiSummaryPanel`: shows `aiSummary` text, or "Summary not yet generated" if null
- `ExportButton`: deferred to next phase (activate after real PDF export is finalized)

### SettingsPage
- Placeholder page for Phase 4+

---

## Implementation Order

1. **Scaffold** — `npm create electron-vite@latest meetai-frontend`, add `react-router-dom`
2. **`services/api.ts`** — base fetch wrapper
3. **`services/auth.service.ts`** + **`services/meeting.service.ts`**
4. **`AuthContext`** — login/logout/localStorage persist (token + user)
5. **`router.tsx`** — all routes, `PrivateRoute`, `ModeratorRoute`
6. **LoginPage + RegisterPage** — first end-to-end working flow
7. **MeetingListPage** + **`MeetingCard`** + **`CreateMeetingModal`** + **`StatusBadge`**
8. **MeetingAnalysisPage** — full data display (`TimelineViewer`, `AlertsLog`, `AiSummaryPanel`)
9. **`MeetingContext`**
10. **`useSSE`** hook
11. **`media-upload.service.ts`** — Python ingest upload + ticket-aware error handling
12. **LiveDashboardPage** — `AlertFeed` + `MeetingControls` + placeholder metric panels
13. **`useMediaStream`** hook — screen capture + audio merge + HTTP chunk upload
14. **SettingsPage** — placeholder
15. **Electron wiring** — `main.ts` creates `BrowserWindow`, loads the Vite dev server in dev mode
16. **ExportButton** — enable when backend real PDF export is ready

---

## Dependencies

```json
{
  "electron": "latest",
  "electron-vite": "latest",
  "react": "^18",
  "react-dom": "^18",
  "react-router-dom": "^6",
  "@types/react": "^18",
  "@types/react-dom": "^18",
  "typescript": "^5"
}
```
No other third-party dependencies for MVP.

---

## Backend API Base URL

During development: `http://localhost:3000/api/v1`  
Store in `.env` as `VITE_API_BASE_URL` — Vite exposes `import.meta.env.VITE_*` to the renderer.

SSE alert endpoint base uses API URL: `http://localhost:3000/api/v1`.
Python ingest base URL: `http://localhost:8000` (store as `VITE_PYTHON_INGEST_BASE_URL`).

---

## Verification

1. `npm run dev` starts Electron window loading the Vite dev server
2. Register a new user → JWT stored → redirected to `/meetings`
3. Create a meeting → appears in list
4. Start meeting (`PATCH /meetings/:id` with `status=IN_PROGRESS`) returns `streamTicket` + `ticketExpiresAt`
5. Click meeting (MODERATOR) → `/live` route loads, SSE alert stream opens and media chunks upload every 2s with ticket
6. Click "End Meeting" → status → COMPLETED → ticket cleared → redirected to `/analysis`
7. Analysis page shows timeline entries, alerts, null AI summary
8. Login as VIEWER → cannot access `/live` routes → redirected to `/meetings`
9. Invalid ticket test: Python returns `401`, frontend stops capture and surfaces unauthorized stream warning
10. Expired ticket test: after TTL, Python returns `401` until moderator re-starts meeting and gets new ticket
11. Wrong-meeting ticket test: using ticket from meeting A on meeting B returns `401`

---

## Backend Alignment Notes

- Auth `user` object uses `organizationId` (not `orgId`).
- JWT payload currently includes `id`, `organizationId`, `role`; keep profile fields from stored auth response.
- `GET /api/v1/meetings/:id/events` (SSE) is the notification/alert channel from backend.
- Media ingest is HTTP upload to Python and must include `meetingId` + `streamTicket` in every request body.
- Stream ticket fields are standardized as `streamTicket` and `ticketExpiresAt`.
- Backend stores ticket in Redis key pattern `meeting:<meetingId>:ticket` with TTL `18000` seconds.
- Ticket refresh ownership is Node backend (not frontend, not Python).
- Refresh cadence sweet spot: every `300` seconds (5 minutes), Node refreshes TTL to `18000` via `EXPIRE`.

## Application Development Standards (Our Rules)

4.1. Global Error Handling & Interception (Mirrors Backend 4.1)
RULE: The frontend must natively intercept and handle standardized backend errors ({ success: false, error: ... }) globally. UI components should not be wrapped in massive, repetitive try/catch blocks for standard API failures.

IMPLEMENTATION: The services/api.ts base fetcher must handle global error events (e.g., triggering a global toast notification). If a 401 Unauthorized is returned, the API service must automatically trigger a forced logout sequence and route the user to /login.

UI FALLBACK: A React <ErrorBoundary> must wrap the main router to prevent the entire Electron shell from white-screening if a sub-component crashes.

4.2. Component Isolation & State Delegation (Mirrors Backend 4.4)
RULE: UI Components (src/components and src/pages) must be "dumb". They are strictly responsible for rendering the UI and capturing user input.

IMPLEMENTATION: Components must never contain raw fetch calls, complex data parsing, or direct stream management. All business logic, state orchestration, and API communication must be delegated to Custom Hooks (hooks/) and the Service Layer (services/).

4.3. Hardware Resource & Stream Lifecycle Management (Mirrors Backend 4.3)
RULE: Because the client captures raw media (screen/mic) to stream to backend Python workers, hardware locks must be explicitly managed to prevent ghosting (e.g., the user's camera/mic light remaining on after a meeting ends).

IMPLEMENTATION: The isolated streaming service/manager must expose strict .start() and .stop() methods. When a meeting is terminated or aborted, the service must explicitly iterate through the MediaStream and call .stop() on every single track, followed by closing the transmission socket.