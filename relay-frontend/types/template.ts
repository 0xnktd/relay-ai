export interface Question {
  id: string
  question: string
  type: 'open_ended' | 'yes_no' | 'multiple_choice'
  required: boolean
  follow_up?: Record<string, unknown>
}

export interface Template {
  id: string
  user_id: string
  name: string
  description: string | null
  voice_id: string
  initial_message: string
  questions: Question[]
  closing_message: string | null
  extraction_schema: Record<string, unknown>
  max_duration_seconds: number
  created_at: string
  updated_at: string
}

export interface CreateTemplateInput {
  name: string
  description?: string
  voice_id: string
  initial_message: string
  questions?: Question[]
  closing_message?: string
  extraction_schema?: Record<string, unknown>
  max_duration_seconds?: number
}

export interface UpdateTemplateInput {
  name?: string
  description?: string
  voice_id?: string
  initial_message?: string
  questions?: Question[]
  closing_message?: string
  extraction_schema?: Record<string, unknown>
  max_duration_seconds?: number
}
