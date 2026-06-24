'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCalls, getCall, scheduleCall, cancelCall } from '@/lib/api/calls'
import { ScheduleCallInput, CallStatus } from '@/types/call'

export function useCalls(status?: CallStatus) {
  return useQuery({
    queryKey: ['calls', status],
    queryFn: () => getCalls(status),
  })
}

export function useCall(id: string) {
  return useQuery({
    queryKey: ['calls', id],
    queryFn: () => getCall(id),
    enabled: !!id,
  })
}

export function useScheduleCall() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ScheduleCallInput) => scheduleCall(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] })
    },
  })
}

export function useCancelCall() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelCall(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] })
    },
  })
}
