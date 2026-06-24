'use client'

import { useState } from 'react'
import { useTemplates, useDeleteTemplate, useCreateTemplate, useUpdateTemplate } from '@/lib/hooks/use-templates'
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
import { Plus, Pencil, Trash2, FileText, Clock, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { TemplateForm } from '@/components/templates/template-form'
import { Template } from '@/types/template'

export default function TemplatesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<Template | null>(null)

  const { data: templates, isLoading, error } = useTemplates()
  const deleteTemplate = useDeleteTemplate()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()

  const handleDelete = (id: string) => {
    deleteTemplate.mutate(id)
  }

  const handleCreate = (data: Parameters<typeof createTemplate.mutate>[0]) => {
    createTemplate.mutate(data, {
      onSuccess: () => setCreateOpen(false),
    })
  }

  const handleUpdate = (data: Parameters<typeof updateTemplate.mutate>[0]['data']) => {
    if (!editTemplate) return
    updateTemplate.mutate(
      { id: editTemplate.id, data },
      { onSuccess: () => setEditTemplate(null) }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Templates</h1>
        </div>
        <div className="text-[#2A3A5A]">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Templates</h1>
        </div>
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          Error loading templates: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Templates</h1>
          <p className="text-[#2A3A5A] mt-1">Create and manage call templates</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C75C3B] text-white font-medium text-sm hover:bg-[#A34830] transition-all duration-300 shadow-lg shadow-[#C75C3B]/20">
              <Plus className="h-4 w-4" />
              New Template
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white border-[#E8DFD0]">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">New Template</DialogTitle>
            </DialogHeader>
            <TemplateForm
              onSubmit={handleCreate}
              isLoading={createTemplate.isPending}
            />
            {createTemplate.error && (
              <p className="text-sm text-red-600">{createTemplate.error.message}</p>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => !open && setEditTemplate(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white border-[#E8DFD0]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Template</DialogTitle>
          </DialogHeader>
          {editTemplate && (
            <TemplateForm
              template={editTemplate}
              onSubmit={handleUpdate}
              isLoading={updateTemplate.isPending}
            />
          )}
          {updateTemplate.error && (
            <p className="text-sm text-red-600">{updateTemplate.error.message}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Templates Grid */}
      {templates && templates.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden hover:shadow-lg hover:shadow-[#1A2744]/5 transition-all duration-300 hover:-translate-y-1 group"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-[#F5EBD8]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4A853] to-[#C49543] flex items-center justify-center shadow-md">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-[#1A2744] group-hover:text-[#C75C3B] transition-colors">
                        {template.name}
                      </h3>
                      {template.description && (
                        <p className="text-sm text-[#2A3A5A] line-clamp-1">{template.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditTemplate(template)}
                      className="p-2 rounded-lg hover:bg-[#F5EBD8] text-[#2A3A5A] hover:text-[#1A2744] transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-2 rounded-lg hover:bg-red-50 text-[#2A3A5A] hover:text-red-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white border-[#E8DFD0]">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-display">Delete template?</AlertDialogTitle>
                          <AlertDialogDescription className="text-[#2A3A5A]">
                            This will permanently delete "{template.name}".
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-full border-[#E8DFD0]">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(template.id)}
                            className="rounded-full bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm text-[#2A3A5A]">
                  <Clock className="h-4 w-4" />
                  <span>Max {Math.floor(template.max_duration_seconds / 60)} minutes</span>
                </div>
                {template.questions && template.questions.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-[#2A3A5A]">
                    <MessageSquare className="h-4 w-4" />
                    <span>{template.questions.length} question{template.questions.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#F5EBD8]">
                  <span className="text-xs text-[#2A3A5A]">
                    Created {format(new Date(template.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 border border-[#E8DFD0] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#F5EBD8] flex items-center justify-center">
            <FileText className="h-7 w-7 text-[#2A3A5A]" />
          </div>
          <h3 className="font-display text-lg font-semibold text-[#1A2744] mb-2">
            No templates yet
          </h3>
          <p className="text-[#2A3A5A] mb-6">
            Create your first call template to get started
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C75C3B] text-white font-medium text-sm hover:bg-[#A34830] transition-all duration-300 shadow-lg shadow-[#C75C3B]/20"
          >
            <Plus className="h-4 w-4" />
            Create your first template
          </button>
        </div>
      )}
    </div>
  )
}
