'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useCall } from '@/lib/hooks/use-calls'
import { useContacts } from '@/lib/hooks/use-contacts'
import { useTemplates } from '@/lib/hooks/use-templates'
import { CallStatusBadge } from '@/components/calls/call-status-badge'
import { ArrowLeft, User, FileText, Clock, RefreshCw, Phone, Sparkles, MessageSquare, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function CallDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: callDetail, isLoading, error } = useCall(id)
  const { data: contacts } = useContacts()
  const { data: templates } = useTemplates()

  const contact = contacts?.find((c) => c.id === callDetail?.call.contact_id)
  const template = templates?.find((t) => t.id === callDetail?.call.template_id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/calls"
            className="p-2 rounded-xl hover:bg-[#F5EBD8] text-[#2A3A5A] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Call Details</h1>
        </div>
        <div className="text-[#2A3A5A]">Loading...</div>
      </div>
    )
  }

  if (error || !callDetail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/calls"
            className="p-2 rounded-xl hover:bg-[#F5EBD8] text-[#2A3A5A] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Call Details</h1>
        </div>
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          {error?.message || 'Call not found'}
        </div>
      </div>
    )
  }

  const { call, records, extracted_data } = callDetail
  const latestRecord = records[records.length - 1]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/calls"
            className="p-2 rounded-xl hover:bg-[#F5EBD8] text-[#2A3A5A] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Call Details</h1>
            <p className="text-[#2A3A5A] mt-1">
              {contact?.name || contact?.phone || call.contact_id}
            </p>
          </div>
        </div>
        <CallStatusBadge status={call.status} />
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Call Info */}
        <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
          <div className="p-5 border-b border-[#F5EBD8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C75C3B] to-[#D4A853] flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <h2 className="font-display font-semibold text-[#1A2744]">Call Information</h2>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#2A3A5A] mb-1">Scheduled</p>
                <p className="font-medium text-[#1A2744]">
                  {format(new Date(call.scheduled_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#2A3A5A] mb-1">Priority</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${
                  call.priority === 'high'
                    ? 'bg-[#C75C3B]/10 text-[#C75C3B]'
                    : call.priority === 'low'
                    ? 'bg-[#2A3A5A]/10 text-[#2A3A5A]'
                    : 'bg-[#D4A853]/10 text-[#D4A853]'
                }`}>
                  {call.priority}
                </span>
              </div>
              <div>
                <p className="text-sm text-[#2A3A5A] mb-1">Retries</p>
                <p className="font-medium text-[#1A2744]">{call.retry_count} / {call.max_retries}</p>
              </div>
              <div>
                <p className="text-sm text-[#2A3A5A] mb-1">Created</p>
                <p className="font-medium text-[#1A2744]">
                  {format(new Date(call.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Template */}
        <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
          <div className="p-5 border-b border-[#F5EBD8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A2744] to-[#2A3A5A] flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <h2 className="font-display font-semibold text-[#1A2744]">Contact & Template</h2>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-sm text-[#2A3A5A] mb-1">Contact</p>
              <p className="font-medium text-[#1A2744]">{contact?.name || 'Unknown'}</p>
              <p className="text-sm text-[#2A3A5A]">{contact?.phone}</p>
            </div>
            <div>
              <p className="text-sm text-[#2A3A5A] mb-1">Template</p>
              <p className="font-medium text-[#1A2744]">{template?.name || 'Unknown'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call Outcome */}
      {latestRecord && (
        <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
          <div className="p-5 border-b border-[#F5EBD8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8FA382] to-[#6B8A5E] flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
              <h2 className="font-display font-semibold text-[#1A2744]">Call Outcome</h2>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-[#2A3A5A] mb-1">Outcome</p>
                <p className="font-medium text-[#1A2744] capitalize">
                  {latestRecord.outcome?.replace('_', ' ') || 'Pending'}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#2A3A5A] mb-1">Duration</p>
                <p className="font-medium text-[#1A2744]">
                  {latestRecord.duration_seconds
                    ? `${Math.floor(latestRecord.duration_seconds / 60)}m ${latestRecord.duration_seconds % 60}s`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#2A3A5A] mb-1">Started</p>
                <p className="font-medium text-[#1A2744]">
                  {latestRecord.started_at
                    ? format(new Date(latestRecord.started_at), 'h:mm:ss a')
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#2A3A5A] mb-1">Ended</p>
                <p className="font-medium text-[#1A2744]">
                  {latestRecord.ended_at
                    ? format(new Date(latestRecord.ended_at), 'h:mm:ss a')
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transcript */}
      {latestRecord?.transcript && latestRecord.transcript.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
          <div className="p-5 border-b border-[#F5EBD8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4A853] to-[#C49543] flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <h2 className="font-display font-semibold text-[#1A2744]">Transcript</h2>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {latestRecord.transcript.map((entry, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-4 rounded-xl max-w-[80%]',
                    entry.speaker === 'agent'
                      ? 'bg-[#C75C3B]/10 ml-auto'
                      : 'bg-[#F5EBD8]'
                  )}
                >
                  <div className="text-xs text-[#2A3A5A] mb-1 flex items-center gap-2">
                    {entry.speaker === 'agent' ? (
                      <>
                        <Phone className="h-3 w-3" />
                        AI Agent
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        Contact
                      </>
                    )}
                    {entry.timestamp !== undefined && (
                      <span className="ml-auto">{entry.timestamp}s</span>
                    )}
                  </div>
                  <p className="text-sm text-[#1A2744]">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Extracted Insights */}
      {extracted_data && extracted_data.structured_data && (
        <div className="space-y-6">
          {/* Summary & Sentiment */}
          <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
            <div className="p-5 border-b border-[#F5EBD8]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8FA382] to-[#6B8A5E] flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="font-display font-semibold text-[#1A2744]">AI Insights</h2>
                </div>
                {extracted_data.structured_data.sentiment && (
                  <div className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                    extracted_data.structured_data.sentiment === 'positive' && 'bg-[#8FA382]/10 text-[#6B8A5E]',
                    extracted_data.structured_data.sentiment === 'negative' && 'bg-[#C75C3B]/10 text-[#C75C3B]',
                    extracted_data.structured_data.sentiment === 'neutral' && 'bg-[#D4A853]/10 text-[#D4A853]'
                  )}>
                    {extracted_data.structured_data.sentiment === 'positive' && <TrendingUp className="h-3 w-3" />}
                    {extracted_data.structured_data.sentiment === 'negative' && <TrendingDown className="h-3 w-3" />}
                    {extracted_data.structured_data.sentiment === 'neutral' && <Minus className="h-3 w-3" />}
                    {extracted_data.structured_data.sentiment.charAt(0).toUpperCase() + extracted_data.structured_data.sentiment.slice(1)} Sentiment
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Summary */}
              {extracted_data.structured_data.summary && (
                <div>
                  <p className="text-sm text-[#2A3A5A] mb-2">Summary</p>
                  <p className="text-[#1A2744]">{extracted_data.structured_data.summary}</p>
                </div>
              )}

              {/* Key Points */}
              {extracted_data.structured_data.key_points && extracted_data.structured_data.key_points.length > 0 && (
                <div>
                  <p className="text-sm text-[#2A3A5A] mb-2">Key Points</p>
                  <ul className="space-y-2">
                    {extracted_data.structured_data.key_points.map((point: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-[#1A2744]">
                        <CheckCircle2 className="h-4 w-4 text-[#8FA382] mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up Needed */}
              {extracted_data.structured_data.follow_up_needed && (
                <div className="p-4 rounded-xl bg-[#D4A853]/10 border border-[#D4A853]/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-[#D4A853] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-[#1A2744]">Follow-up Recommended</p>
                      {extracted_data.structured_data.follow_up_reason && (
                        <p className="text-sm text-[#2A3A5A] mt-1">{extracted_data.structured_data.follow_up_reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Confidence Score */}
              {extracted_data.confidence_score !== undefined && (
                <div className="flex items-center gap-2 text-sm text-[#2A3A5A]">
                  <span>Extraction confidence:</span>
                  <div className="flex-1 max-w-32 h-2 bg-[#F5EBD8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#8FA382] rounded-full"
                      style={{ width: `${extracted_data.confidence_score * 100}%` }}
                    />
                  </div>
                  <span className="font-medium text-[#1A2744]">{Math.round(extracted_data.confidence_score * 100)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Answers */}
          {extracted_data.structured_data.answers && Object.keys(extracted_data.structured_data.answers).length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
              <div className="p-5 border-b border-[#F5EBD8]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4A853] to-[#C49543] flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="font-display font-semibold text-[#1A2744]">Extracted Answers</h2>
                </div>
              </div>
              <div className="divide-y divide-[#F5EBD8]">
                {Object.entries(extracted_data.structured_data.answers).map(([questionId, answer]: [string, any]) => (
                  <div key={questionId} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-[#2A3A5A] mb-1">Question: {questionId}</p>
                        <p className="font-medium text-[#1A2744]">
                          {answer.value !== null ? answer.value : <span className="text-[#2A3A5A] italic">Not answered</span>}
                        </p>
                        {answer.source_quote && (
                          <p className="text-sm text-[#2A3A5A] mt-2 italic border-l-2 border-[#D4A853] pl-3">
                            "{answer.source_quote}"
                          </p>
                        )}
                      </div>
                      {answer.confidence !== undefined && (
                        <div className={cn(
                          'px-2 py-1 rounded-lg text-xs font-medium',
                          answer.confidence >= 0.8 && 'bg-[#8FA382]/10 text-[#6B8A5E]',
                          answer.confidence >= 0.5 && answer.confidence < 0.8 && 'bg-[#D4A853]/10 text-[#D4A853]',
                          answer.confidence < 0.5 && 'bg-[#C75C3B]/10 text-[#C75C3B]'
                        )}>
                          {Math.round(answer.confidence * 100)}% confident
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
