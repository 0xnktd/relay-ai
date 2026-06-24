import { apiClient } from './client'
import { ScheduledCall, CallDetail, ScheduleCallInput, CallStatus } from '@/types/call'

export async function getCalls(status?: CallStatus): Promise<ScheduledCall[]> {
  const params = status ? `?status=${status}` : ''
  return apiClient<ScheduledCall[]>(`/calls${params}`)
}

export async function getCall(id: string): Promise<CallDetail> {
  return apiClient<CallDetail>(`/calls/${id}`)
}

export async function scheduleCall(data: ScheduleCallInput): Promise<ScheduledCall> {
  return apiClient<ScheduledCall>('/calls', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function cancelCall(id: string): Promise<void> {
  return apiClient<void>(`/calls/${id}`, {
    method: 'DELETE',
  })
}
