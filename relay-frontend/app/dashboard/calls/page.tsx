'use client'

import { useState } from 'react'
import { useCalls, useScheduleCall, useCancelCall } from '@/lib/hooks/use-calls'
import { useContacts } from '@/lib/hooks/use-contacts'
import { useTemplates } from '@/lib/hooks/use-templates'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Phone, X, Eye, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { ScheduleForm } from '@/components/calls/schedule-form'
import { CallStatusBadge } from '@/components/calls/call-status-badge'
import { CallStatus } from '@/types/call'
import Link from 'next/link'

const statusOptions = [
  { value: 'all', label: 'All Calls' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'queued', label: 'Queued' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function CallsPage() {
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all')

  const { data: calls, isLoading, error } = useCalls(
    statusFilter === 'all' ? undefined : statusFilter
  )
  const { data: contacts } = useContacts()
  const { data: templates } = useTemplates()
  const scheduleCall = useScheduleCall()
  const cancelCall = useCancelCall()

  const handleSchedule = (data: Parameters<typeof scheduleCall.mutate>[0]) => {
    scheduleCall.mutate(data, {
      onSuccess: () => setScheduleOpen(false),
    })
  }

  const handleCancel = (id: string) => {
    cancelCall.mutate(id)
  }

  const contactMap = new Map(contacts?.map((c) => [c.id, c.name || c.phone]) || [])
  const templateMap = new Map(templates?.map((t) => [t.id, t.name]) || [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Calls</h1>
        </div>
        <div className="text-[#2A3A5A]">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Calls</h1>
        </div>
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          Error loading calls: {error.message}
        </div>
      </div>
    )
  }

  const canSchedule = contacts && contacts.length > 0 && templates && templates.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Calls</h1>
          <p className="text-[#2A3A5A] mt-1">Schedule and manage your calls</p>
        </div>
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogTrigger asChild>
            <button
              disabled={!canSchedule}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C75C3B] text-white font-medium text-sm hover:bg-[#A34830] transition-all duration-300 shadow-lg shadow-[#C75C3B]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Plus className="h-4 w-4" />
              Schedule Call
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-white border-[#E8DFD0]">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Schedule a Call</DialogTitle>
            </DialogHeader>
            {contacts && templates && (
              <ScheduleForm
                contacts={contacts}
                templates={templates}
                onSubmit={handleSchedule}
                isLoading={scheduleCall.isPending}
              />
            )}
            {scheduleCall.error && (
              <p className="text-sm text-red-600">{scheduleCall.error.message}</p>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-[#2A3A5A]" />
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value as CallStatus | 'all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                statusFilter === option.value
                  ? 'bg-[#1A2744] text-white'
                  : 'bg-white text-[#2A3A5A] border border-[#E8DFD0] hover:border-[#1A2744]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Warning */}
      {!canSchedule && (
        <div className="p-4 rounded-xl bg-[#D4A853]/10 border border-[#D4A853]/30 text-[#1A2744]">
          <p className="text-sm">
            You need at least one contact and one template to schedule calls.
          </p>
        </div>
      )}

      {/* Calls Table */}
      {calls && calls.length > 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#F5EBD8]">
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-[#2A3A5A] py-4 px-6">
                  Contact
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-[#2A3A5A] py-4 px-6">
                  Template
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-[#2A3A5A] py-4 px-6">
                  Scheduled
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-[#2A3A5A] py-4 px-6">
                  Status
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-[#2A3A5A] py-4 px-6">
                  Priority
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-[#2A3A5A] py-4 px-6 w-[100px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr key={call.id} className="border-b border-[#F5EBD8] hover:bg-[#FDF6E9]/50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-medium text-[#1A2744]">
                      {contactMap.get(call.contact_id) || call.contact_id}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-[#2A3A5A]">
                    {templateMap.get(call.template_id) || call.template_id}
                  </td>
                  <td className="py-4 px-6 text-[#2A3A5A]">
                    {format(new Date(call.scheduled_at), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="py-4 px-6">
                    <CallStatusBadge status={call.status} />
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      call.priority === 'high'
                        ? 'bg-[#C75C3B]/10 text-[#C75C3B]'
                        : call.priority === 'low'
                        ? 'bg-[#2A3A5A]/10 text-[#2A3A5A]'
                        : 'bg-[#D4A853]/10 text-[#D4A853]'
                    }`}>
                      {call.priority}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/calls/${call.id}`}>
                        <button className="p-2 rounded-lg hover:bg-[#F5EBD8] text-[#2A3A5A] hover:text-[#1A2744] transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>
                      {(call.status === 'scheduled' || call.status === 'queued') && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-2 rounded-lg hover:bg-red-50 text-[#2A3A5A] hover:text-red-600 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white border-[#E8DFD0]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-display">Cancel call?</AlertDialogTitle>
                              <AlertDialogDescription className="text-[#2A3A5A]">
                                This will cancel the scheduled call. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-full border-[#E8DFD0]">Keep</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancel(call.id)}
                                className="rounded-full bg-red-600 hover:bg-red-700"
                              >
                                Cancel Call
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 border border-[#E8DFD0] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#F5EBD8] flex items-center justify-center">
            <Phone className="h-7 w-7 text-[#2A3A5A]" />
          </div>
          <h3 className="font-display text-lg font-semibold text-[#1A2744] mb-2">
            No calls yet
          </h3>
          <p className="text-[#2A3A5A] mb-6">
            Schedule your first call to get started
          </p>
          {canSchedule && (
            <button
              onClick={() => setScheduleOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C75C3B] text-white font-medium text-sm hover:bg-[#A34830] transition-all duration-300 shadow-lg shadow-[#C75C3B]/20"
            >
              <Plus className="h-4 w-4" />
              Schedule your first call
            </button>
          )}
        </div>
      )}
    </div>
  )
}
