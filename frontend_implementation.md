# MeetAI Frontend Implementation Plan

## Context

The backend is complete through Phase 2 (auth + all CRUD endpoints live). The frontend is a net-new Electron desktop app that needs to be built from scratch in its own repository. It renders a real-time moderator dashboard (live AI metrics + SSE alerts), a post-meeting analysis view, and standard auth/meeting management flows. The client-side captures screen video and mixed audio (system + mic) and streams it to the backend via WebSocket.

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
| Live data | `EventSource` (SSE) + `WebSocket` |

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
│   │   ├── useSSE.ts                   # EventSource lifecycle
│   │   └── useMediaStream.ts           # Capture + WebSocket send
│   └── services/
│       ├── api.ts                      # Base fetch wrapper with JWT injection
│       ├── auth.service.ts
│       └── meeting.service.ts
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
  orgId: string;
}
interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```
- Token persisted to `localStorage` on login, cleared on logout.
- On app boot, read token from `localStorage` and rehydrate `user` from JWT payload (decode without verify — backend validates on each request).

### MeetingContext
```ts
interface MeetingContextValue {
  activeMeetingId: string | null;
  liveAlerts: MeetingAlert[];
  setActiveMeeting: (id: string | null) => void;
  pushAlert: (alert: MeetingAlert) => void;
}
```
- `liveAlerts` is an append-only array populated by `useSSE`.
- Reset on meeting end.

---

## Services Layer

### `services/api.ts`
Base `fetch` wrapper:
- Reads token from `AuthContext` (passed in or read from localStorage).
- Injects `Authorization: Bearer <token>` on every request.
- Parses the `{ success, data, error }` envelope.
- Throws `Error(error.message)` when `success: false`.

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
- `updateStatus(id, status): Promise<Meeting>`
  → `PATCH /api/v1/meetings/:id`
- `exportReport(id, format): Promise<string>`
  → `GET /api/v1/meetings/:id/export?format=pdf`

---

## Hooks

### `hooks/useSSE.ts`
```
useSSE(meetingId: string | null)
  - Opens EventSource to GET /api/v1/meetings/:id/events when meetingId is set
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
  5. Open WebSocket to backend ws://…/meetings/:id/stream
  6. MediaRecorder on combined stream → ondataavailable → ws.send(blob)
  - Returns { start(meetingId), stop(), isCapturing: boolean }
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
- On mount: `setActiveMeeting(id)`, `useSSE(id)`, `useMediaStream().start(id)`
- On unmount: `useMediaStream().stop()`, `setActiveMeeting(null)`
- `LiveMetricPanel` × N: placeholder panels labeled "Focus", "Emotion", "Audio" (empty until Phase 3 AI pipeline delivers real data)
- `AlertFeed`: renders `liveAlerts` from MeetingContext
- `MeetingControls`: 
  - "End Meeting" → `updateStatus(id, 'COMPLETED')` → navigate to `/meetings/:id/analysis`

### MeetingAnalysisPage (both roles)
- On mount: `getMeetingAnalysis(id)`
- `TimelineViewer`: list of timeline entries (offsetMs + raw payload JSON for now, charts deferred)
- `AlertsLog`: full alerts list with severity + eventType + createdAt
- `AiSummaryPanel`: shows `aiSummary` text, or "Summary not yet generated" if null
- `ExportButton`: calls `exportReport(id, 'pdf')`, decodes base64, triggers download via Blob URL

### SettingsPage
- Placeholder page for Phase 4+

---

## Implementation Order

1. **Scaffold** — `npm create electron-vite@latest meetai-frontend`, add `react-router-dom`
2. **`services/api.ts`** — base fetch wrapper
3. **`services/auth.service.ts`** + **`services/meeting.service.ts`**
4. **`AuthContext`** — login/logout/localStorage persist + JWT decode for user hydration
5. **`router.tsx`** — all routes, `PrivateRoute`, `ModeratorRoute`
6. **LoginPage + RegisterPage** — first end-to-end working flow
7. **MeetingListPage** + **`MeetingCard`** + **`CreateMeetingModal`** + **`StatusBadge`**
8. **MeetingAnalysisPage** — full data display (`TimelineViewer`, `AlertsLog`, `AiSummaryPanel`, `ExportButton`)
9. **`MeetingContext`**
10. **`useSSE`** hook
11. **LiveDashboardPage** — `AlertFeed` + `MeetingControls` + placeholder metric panels
12. **`useMediaStream`** hook — screen capture + audio merge + WebSocket send
13. **SettingsPage** — placeholder
14. **Electron wiring** — `main.ts` creates `BrowserWindow`, loads the Vite dev server in dev mode

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

---

## Verification

1. `npm run dev` starts Electron window loading the Vite dev server
2. Register a new user → JWT stored → redirected to `/meetings`
3. Create a meeting → appears in list
4. Click meeting (MODERATOR) → `/live` route loads, SSE connection opens
5. Click "End Meeting" → status → COMPLETED → redirected to `/analysis`
6. Analysis page shows timeline entries, alerts, null AI summary
7. Export button → downloads base64-decoded file
8. Login as VIEWER → cannot access `/live` routes → redirected to `/meetings`