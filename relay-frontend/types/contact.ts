export interface Contact {
  id: string
  user_id: string
  phone: string
  name: string | null
  email: string | null
  timezone: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface CreateContactInput {
  phone: string
  name?: string
  email?: string
  timezone?: string
  metadata?: Record<string, unknown>
}

export interface UpdateContactInput {
  phone?: string
  name?: string
  email?: string
  timezone?: string
  metadata?: Record<string, unknown>
}

export interface BulkContactInput {
  phone: string
  name?: string
  email?: string
  timezone?: string
}

export interface BulkImportRequest {
  contacts: BulkContactInput[]
  skip_duplicates?: boolean
}

export interface BulkImportError {
  row: number
  phone: string
  error: string
}

export interface BulkImportResult {
  total: number
  imported: number
  skipped: number
  errors: BulkImportError[]
}
