import { CallStatus } from '@/types/call'

const statusConfig: Record<CallStatus, { label: string; className: string }> = {
  scheduled: {
    label: 'Scheduled',
    className: 'bg-[#D4A853]/15 text-[#D4A853] border-[#D4A853]/30',
  },
  queued: {
    label: 'Queued',
    className: 'bg-[#1A2744]/10 text-[#1A2744] border-[#1A2744]/20',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-[#C75C3B]/15 text-[#C75C3B] border-[#C75C3B]/30 animate-pulse',
  },
  completed: {
    label: 'Completed',
    className: 'bg-[#8FA382]/15 text-[#6B8A5E] border-[#8FA382]/30',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[#2A3A5A]/10 text-[#2A3A5A] border-[#2A3A5A]/20',
  },
}

interface CallStatusBadgeProps {
  status: CallStatus
}

export function CallStatusBadge({ status }: CallStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.scheduled
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  )
}
