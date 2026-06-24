import { apiClient } from './client'
import { Contact, CreateContactInput, UpdateContactInput, BulkImportRequest, BulkImportResult } from '@/types/contact'

export async function getContacts(): Promise<Contact[]> {
  return apiClient<Contact[]>('/contacts')
}

export async function getContact(id: string): Promise<Contact> {
  return apiClient<Contact>(`/contacts/${id}`)
}

export async function createContact(data: CreateContactInput): Promise<Contact> {
  return apiClient<Contact>('/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateContact(id: string, data: UpdateContactInput): Promise<Contact> {
  return apiClient<Contact>(`/contacts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteContact(id: string): Promise<void> {
  return apiClient<void>(`/contacts/${id}`, {
    method: 'DELETE',
  })
}

export async function bulkImportContacts(data: BulkImportRequest): Promise<BulkImportResult> {
  return apiClient<BulkImportResult>('/contacts/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
