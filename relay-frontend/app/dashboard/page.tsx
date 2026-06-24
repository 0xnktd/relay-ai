'use client'

import { useContacts } from '@/lib/hooks/use-contacts'
import { useTemplates } from '@/lib/hooks/use-templates'
import { useCalls } from '@/lib/hooks/use-calls'
import { CallStatusBadge } from '@/components/calls/call-status-badge'
import Link from 'next/link'
import { format } from 'date-fns'
import { Users, FileText, Phone, CheckCircle, Plus, Clock, ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const { data: contacts, isLoading: contactsLoading } = useContacts()
  const { data: templates, isLoading: templatesLoading } = useTemplates()
  const { data: calls, isLoading: callsLoading } = useCalls()

  const isLoading = contactsLoading || templatesLoading || callsLoading

  const scheduledCalls = calls?.filter((c) => c.status === 'scheduled' || c.status === 'queued') || []
  const completedCalls = calls?.filter((c) => c.status === 'completed') || []
  const recentCalls = calls?.slice(0, 5) || []

  const contactMap = new Map(contacts?.map((c) => [c.id, c.name || c.phone]) || [])
  const templateMap = new Map(templates?.map((t) => [t.id, t.name]) || [])

  const stats = [
    {
      label: 'Total Contacts',
      value: isLoading ? '-' : contacts?.length || 0,
      icon: Users,
      color: 'from-[#C75C3B] to-[#D4A853]',
    },
    {
      label: 'Templates',
      value: isLoading ? '-' : templates?.length || 0,
      icon: FileText,
      color: 'from-[#8FA382] to-[#6B8A5E]',
    },
    {
      label: 'Scheduled',
      value: isLoading ? '-' : scheduledCalls.length,
      icon: Phone,
      color: 'from-[#D4A853] to-[#C49543]',
    },
    {
      label: 'Completed',
      value: isLoading ? '-' : completedCalls.length,
      icon: CheckCircle,
      color: 'from-[#1A2744] to-[#2A3A5A]',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Dashboard</h1>
          <p className="text-[#2A3A5A] mt-1">Welcome back to RelayAI</p>
        </div>
        <Link
          href="/dashboard/calls"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C75C3B] text-white font-medium text-sm hover:bg-[#A34830] transition-all duration-300 shadow-lg shadow-[#C75C3B]/20"
        >
          <Phone className="h-4 w-4" />
          Schedule Call
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-6 border border-[#E8DFD0] hover:shadow-lg hover:shadow-[#1A2744]/5 transition-all duration-300 hover:-translate-y-1"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="font-display text-3xl font-bold text-[#1A2744]">
              {stat.value}
            </div>
            <div className="text-sm text-[#2A3A5A] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-[#1A2744] to-[#2A3A5A] rounded-2xl p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[#C75C3B] opacity-10 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-[#D4A853] opacity-10 blur-2xl" />

        <div className="relative z-10">
          <h2 className="font-display text-xl font-semibold text-[#FDF6E9] mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/contacts"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-[#FDF6E9] font-medium text-sm hover:bg-white/20 transition-all duration-200 border border-white/10"
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </Link>
            <Link
              href="/dashboard/templates"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-[#FDF6E9] font-medium text-sm hover:bg-white/20 transition-all duration-200 border border-white/10"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </Link>
            <Link
              href="/dashboard/calls"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C75C3B] text-white font-medium text-sm hover:bg-[#A34830] transition-all duration-200 shadow-lg shadow-[#C75C3B]/30"
            >
              <Phone className="h-4 w-4" />
              Schedule Call
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold text-[#1A2744]">Recent Calls</h2>
          <Link
            href="/dashboard/calls"
            className="inline-flex items-center gap-1 text-sm text-[#C75C3B] font-medium hover:underline"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentCalls.length > 0 ? (
          <div className="space-y-3">
            {recentCalls.map((call) => (
              <Link key={call.id} href={`/dashboard/calls/${call.id}`}>
                <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] hover:shadow-md hover:border-[#C75C3B]/30 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#F5EBD8] flex items-center justify-center group-hover:bg-[#C75C3B]/10 transition-colors">
                        <Phone className="h-5 w-5 text-[#2A3A5A] group-hover:text-[#C75C3B] transition-colors" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A2744]">
                          {contactMap.get(call.contact_id) || 'Unknown Contact'}
                        </p>
                        <p className="text-sm text-[#2A3A5A]">
                          {templateMap.get(call.template_id) || 'Unknown Template'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#1A2744]">
                          {format(new Date(call.scheduled_at), 'MMM d, h:mm a')}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-[#2A3A5A]">
                          <Clock className="h-3 w-3" />
                          {format(new Date(call.created_at), 'MMM d')}
                        </div>
                      </div>
                      <CallStatusBadge status={call.status} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
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
            <Link
              href="/dashboard/calls"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C75C3B] text-white font-medium text-sm hover:bg-[#A34830] transition-all duration-300 shadow-lg shadow-[#C75C3B]/20"
            >
              <Plus className="h-4 w-4" />
              Schedule your first call
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
