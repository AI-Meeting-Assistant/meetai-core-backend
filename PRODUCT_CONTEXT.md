# MeetAI — Product Context

## What It Is

MeetAI is a multimodal AI meeting analytics platform for B2B teams. It replaces the traditional "gut feeling" approach to meeting evaluation with real-time, data-driven feedback and post-meeting AI summaries.

It is not a video conferencing tool. It sits on top of existing meetings and observes — capturing audio and video from the participant's device, processing them through AI pipelines, and surfacing actionable insights to the meeting moderator.

---

## Core Problem

Online meetings are expensive and often ineffective. Teams have no objective measure of:
- Whether participants are engaged and focused
- Whether the conversation is staying on agenda
- Who is speaking too much or too little
- How meeting quality changes over time

Current tools either do nothing (raw video calls) or generate transcripts after the fact. MeetAI acts during the meeting.

---

## What It Does

**During a meeting (live):**
- Tracks participant focus in real time using computer vision (face mesh, gaze, head pose)
- Monitors speaking ratios and silence through audio VAD + diarization
- Evaluates agenda adherence using an on-device LLM analyzing the live transcript
- Fires alerts to the moderator dashboard when focus drops, speaking rate drops, or the conversation drifts off-topic
- Recovers and clears alerts when metrics return to normal

**After a meeting:**
- Generates an AI summary of the full transcript
- Shows per-participant stats: talk time, focus score
- Provides a full timeline of the session with audio/video/context data per chunk
- Logs all alert events with timestamps for review

---

## Who It's For

**Primary buyer:** B2B — team leads, engineering managers, HR, operations teams at mid-to-large companies who run a lot of internal meetings and want to improve meeting culture with data.

**Primary user:** The meeting moderator — the person who starts and ends the meeting and sees the live dashboard.

**Secondary user:** Participants are passively observed; they do not interact with the product during the meeting.

---

## Product Focus & Design Philosophy

**B2B, not consumer.** The product is purchased by a company, not an individual. The experience should feel like enterprise tooling — functional, trustworthy, and professional. No gamification, no frivolous UI.

**Minimal enterprise aesthetic.** Clean, data-forward design. Dense information without clutter. Think Linear, Vercel dashboard, or Notion — not a colorful SaaS landing page tool. Dark/light modes. Neutral color palette with purposeful use of color only for status (green = good, yellow = caution, red = alert).

**Moderator-centric.** The live dashboard is the core product surface. Everything else (analysis page, meeting list) is secondary. The moderator should understand the room's state at a glance without reading.

**Non-intrusive.** The tool should not distract from the meeting itself. Alerts appear but don't demand immediate action. The interface is ambient during the meeting, detailed after.

**Privacy-aware.** All AI processing runs locally (on-device Whisper, Ollama LLM, MediaPipe). No audio or video leaves the user's machine to a third party. This is a competitive differentiator for enterprise buyers with data compliance requirements.

---

## Key Metrics Tracked

| Metric | Source | How |
|--------|--------|-----|
| Focus score | Video (MediaPipe Face Mesh) | Gaze vector + head pose per face per chunk |
| Speaking ratio | Audio (VAD) | Fraction of chunk duration with voice activity |
| Speaker talk time | Audio (pyannote diarization) | Per-speaker ms accumulated |
| Agenda context fit | Text (Ollama LLM) | 0–1 score per N transcript chunks |
| Participant mapping | Fusion engine | Diarization speaker labels ↔ video person IDs |

---

## Technical Architecture (Summary)

Three separate services:

1. **meetai-ai-workers** (Python/FastAPI) — AI pipeline: audio (VAD, ASR, diarization), video (MediaPipe), text (LLM). Publishes results to Redis.
2. **meetai-core-backend** (Node.js/TypeScript) — Business logic, data fusion, rule engine, SSE delivery, database persistence (PostgreSQL via Supabase).
3. **meetai-frontend** (React/TypeScript, Electron) — Live dashboard, post-meeting analysis, meeting management.

Data flows: Browser → Python (media chunks) → Redis → Node.js (fusion + rules) → Browser (SSE events).

---

## Current State (Graduation Project)

This is a senior year graduation project demonstrating a full production-grade AI pipeline. The scope is intentionally scoped to prove the concept end-to-end:

- Live meeting monitoring with real AI models (not mocked)
- Post-meeting analytics and AI summary
- Two meeting types: Live (real-time streaming) and Recorded (upload for batch analysis)
- Single organization, role-based access (Moderator / Viewer)

Known limitations acknowledged for demo:
- Single organization per deployment
- No mobile support (Electron desktop app)
- Summary generation depends on Python worker availability
