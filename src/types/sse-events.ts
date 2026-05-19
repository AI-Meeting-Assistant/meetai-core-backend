export enum SseEventType {
  CONNECTED               = 'CONNECTED',
  FUSED_DATA              = 'FUSED_DATA',
  FOCUS_DROP              = 'FOCUS_DROP',
  FOCUS_RECOVERED         = 'FOCUS_RECOVERED',
  SPEAKING_RATE_DROP      = 'SPEAKING_RATE_DROP',
  SPEAKING_RATE_RECOVERED = 'SPEAKING_RATE_RECOVERED',
  AGENDA_DEVIATION        = 'AGENDA_DEVIATION',
  AGENDA_FIT              = 'AGENDA_FIT',
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
  adherenceScore: number | null
  onTopic: boolean | null
  reason: string | null
  chunksAnalysed: number
}
