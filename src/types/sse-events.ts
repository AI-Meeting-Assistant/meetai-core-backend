export enum SseEventType {
  CONNECTED               = 'CONNECTED',
  FUSED_DATA              = 'FUSED_DATA',
  FOCUS_DROP              = 'FOCUS_DROP',
  FOCUS_RECOVERED         = 'FOCUS_RECOVERED',
  SPEAKING_RATE_DROP      = 'SPEAKING_RATE_DROP',
  SPEAKING_RATE_RECOVERED = 'SPEAKING_RATE_RECOVERED',
  AGENDA_DEVIATION        = 'AGENDA_DEVIATION',
  AGENDA_FIT              = 'AGENDA_FIT',
  MEETING_COMPLETED       = 'MEETING_COMPLETED',
  MEETING_FAILED          = 'MEETING_FAILED',
  SUMMARY_READY           = 'SUMMARY_READY',
}

export interface FusedChunk {
  meetingId: string
  offsetMs: number
  audio: {
    vadSpeechMs: number | null
    vadSilenceMs: number | null
    vadSpeechRatioPercent: number | null
    transcript: string | null
    transcriptLines: Array<{ speaker: string; text: string }> | null
    speakerTalkMs: Record<string, number> | null
    speakerTalkRatioPercent: Record<string, number> | null
    speakerLabelsWindow: unknown[] | null
  }
  video: {
    focusScore: number
    persons: Array<{
      personId: number
      focusScore: number
      speakingRatio: number
      frameCount: number
    }>
  }
}

export interface ContextResult {
  meetingId: string
  offsetMs: number
  contextFit: number | null
  onTopic: boolean | null
  reason: string | null
  chunksAnalysed: number
}

export interface RecordedTranscriptLine {
  speaker: string
  startMs: number
  endMs: number
  text: string
}

export interface RecordedSpeaker {
  label: string
  talkMs: number
  ratioPercent: number
}

export interface RecordedMeetingPayload {
  meetingId: string
  offsetMs: number
  aiSummary?: string | null
  audio: {
    vadSpeechMs: number | null
    vadSilenceMs: number | null
    vadSpeechRatioPercent: number | null
    transcript: string | null
    speakerLabelsWindow: unknown[] | null
    speakerTalkMs?: Record<string, number> | null
    speakerTalkRatioPercent?: Record<string, number> | null
  }
  video: null
  recorded: {
    durationMs: number
    transcriptLines: RecordedTranscriptLine[]
    speakers: RecordedSpeaker[]
    adherence: {
      score: number | null
      onTopic: boolean | null
      reason: string | null
    }
  }
}
