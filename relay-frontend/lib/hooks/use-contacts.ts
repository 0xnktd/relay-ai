'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getContacts, getContact, createContact, updateContact, deleteContact, bulkImportContacts } from '@/lib/api/contacts'
import { CreateContactInput, UpdateContactInput, BulkImportRequest } from '@/types/contact'

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: getContacts,
  })
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: () => getContact(id),
    enabled: !!id,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateContactInput) => createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactInput }) =>
      updateContact(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts', id] })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useBulkImportContacts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: BulkImportRequest) => bulkImportContacts(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
