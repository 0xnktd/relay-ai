import { apiClient } from './client'
import { Template, CreateTemplateInput, UpdateTemplateInput } from '@/types/template'

export async function getTemplates(): Promise<Template[]> {
  return apiClient<Template[]>('/templates')
}

export async function getTemplate(id: string): Promise<Template> {
  return apiClient<Template>(`/templates/${id}`)
}

export async function createTemplate(data: CreateTemplateInput): Promise<Template> {
  return apiClient<Template>('/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTemplate(id: string, data: UpdateTemplateInput): Promise<Template> {
  return apiClient<Template>(`/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteTemplate(id: string): Promise<void> {
  return apiClient<void>(`/templates/${id}`, {
    method: 'DELETE',
  })
}
