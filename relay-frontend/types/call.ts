export type CallStatus = 'scheduled' | 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
export type CallPriority = 'low' | 'normal' | 'high'
export type CallOutcome = 'successful' | 'no_answer' | 'busy' | 'voicemail' | 'failed' | 'human_hangup'

export interface ScheduledCall {
  id: string
  user_id: string
  contact_id: string
  template_id: string
  status: CallStatus
  priority: CallPriority
  scheduled_at: string
  retry_count: number
  max_retries: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface CallRecord {
  id: string
  scheduled_call_id: string
  provider_call_id: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  outcome: CallOutcome | null
  recording_url: string | null
  transcript: Array<{ speaker: string; text: string; timestamp: number }>
  created_at: string
}

export interface ExtractedAnswer {
  value: string | null
  confidence: number
  source_quote?: string
}

export interface ExtractedData {
  structured_data: {
    answers: Record<string, ExtractedAnswer>
    summary: string
    sentiment: 'positive' | 'neutral' | 'negative' | 'unknown'
    key_points: string[]
    follow_up_needed: boolean
    follow_up_reason?: string
  }
  confidence_score: number
  extraction_model: string
  created_at: string
}

export interface CallDetail {
  call: ScheduledCall
  records: CallRecord[]
  extracted_data: ExtractedData | null
}

export interface ScheduleCallInput {
  contact_id: string
  template_id: string
  scheduled_at: string
  priority?: CallPriority
  max_retries?: number
  metadata?: Record<string, unknown>
}
