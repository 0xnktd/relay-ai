'use client'

import { useState } from 'react'
import { useContacts, useDeleteContact, useCreateContact, useUpdateContact } from '@/lib/hooks/use-contacts'
import { Button } from '@/components/ui/button'
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
import { Plus, Pencil, Trash2, Users, Search, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { ContactForm } from '@/components/contacts/contact-form'
import { BulkImportDialog } from '@/components/contacts/bulk-import-dialog'
import { Contact } from '@/types/contact'

export default function ContactsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkImportOpen, setBulkImportOpen] = useState(false)

  const { data: contacts, isLoading, error } = useContacts()
  const deleteContact = useDeleteContact()
  const createContact = useCreateContact()
  const updateContact = useUpdateContact()

  const handleDelete = (id: string) => {
    deleteContact.mutate(id)
  }

  const handleCreate = (data: Parameters<typeof createContact.mutate>[0]) => {
    createContact.mutate(data, {
      onSuccess: () => setCreateOpen(false),
    })
  }

  const handleUpdate = (data: Parameters<typeof updateContact.mutate>[0]['data']) => {
    if (!editContact) return
    updateContact.mutate(
      { id: editContact.id, data },
      { onSuccess: () => setEditContact(null) }
    )
  }

  const filteredContacts = contacts?.filter((contact) => {
    const query = searchQuery.toLowerCase()
    return (
      contact.name?.toLowerCase().includes(query) ||
      contact.phone.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query)
    )
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Contacts</h1>
        </div>
        <div className="text-[#2A3A5A]">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Contacts</h1>
        </div>
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          Error loading contacts: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#1A2744]">Contacts</h1>
          <p className="text-[#2A3A5A] mt-1">Manage your contact list</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBulkImportOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-[#E8DFD0] text-[#1A2744] font-medium text-sm hover:bg-[#F5EBD8] transition-all duration-300"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C75C3B] text-white font-medium text-sm hover:bg-[#A34830] transition-all duration-300 shadow-lg shadow-[#C75C3B]/20">
                <Plus className="h-4 w-4" />
                Add Contact
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white border-[#E8DFD0]">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">New Contact</DialogTitle>
              </DialogHeader>
              <ContactForm
                onSubmit={handleCreate}
                isLoading={createContact.isPending}
              />
              {createContact.error && (
                <p className="text-sm text-red-600">{createContact.error.message}</p>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Import Dialog */}
      <BulkImportDialog open={bulkImportOpen} onClose={() => setBulkImportOpen(false)} />

      {/* Search */}
      {contacts && contacts.length > 0 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#2A3A5A]/50" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-[#E8DFD0] bg-white text-[#1A2744] placeholder:text-[#2A3A5A]/40 focus:outline-none focus:border-[#C75C3B] transition-colors"
          />
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editContact} onOpenChange={(open) => !open && setEditContact(null)}>
        <DialogContent className="sm:max-w-[500px] bg-white border-[#E8DFD0]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Contact</DialogTitle>
          </DialogHeader>
          {editContact && (
            <ContactForm
              contact={editContact}
              onSubmit={handleUpdate}
              isLoading={updateContact.isPending}
            />
          )}
          {updateContact.error && (
            <p className="text-sm text-red-600">{updateContact.error.message}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Contacts Table */}
      {filteredContacts && filteredContacts.length > 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#F5EBD8]">
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-[#2A3A5A] py-4 px-6">
                  Name
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-[#2A3A5A] py-4 px-6">
                  Phone
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-[#2A3A5A] py-4 px-6">
                  Email
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-[#2A3A5A] py-4 px-6">
                  Created
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-[#2A3A5A] py-4 px-6 w-[100px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="border-b border-[#F5EBD8] hover:bg-[#FDF6E9]/50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-medium text-[#1A2744]">{contact.name || '-'}</span>
                  </td>
                  <td className="py-4 px-6 text-[#2A3A5A]">{contact.phone}</td>
                  <td className="py-4 px-6 text-[#2A3A5A]">{contact.email || '-'}</td>
                  <td className="py-4 px-6 text-[#2A3A5A]">
                    {format(new Date(contact.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditContact(contact)}
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
                            <AlertDialogTitle className="font-display">Delete contact?</AlertDialogTitle>
                            <AlertDialogDescription className="text-[#2A3A5A]">
                              This will permanently delete {contact.name || contact.phone}.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-full border-[#E8DFD0]">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(contact.id)}
                              className="rounded-full bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
            <Users className="h-7 w-7 text-[#2A3A5A]" />
          </div>
          <h3 className="font-display text-lg font-semibold text-[#1A2744] mb-2">
            {searchQuery ? 'No contacts found' : 'No contacts yet'}
          </h3>
          <p className="text-[#2A3A5A] mb-6">
            {searchQuery ? 'Try a different search term' : 'Add your first contact to get started'}
          </p>
          {!searchQuery && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setBulkImportOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#E8DFD0] text-[#1A2744] font-medium text-sm hover:bg-[#F5EBD8] transition-all duration-300"
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </button>
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C75C3B] text-white font-medium text-sm hover:bg-[#A34830] transition-all duration-300 shadow-lg shadow-[#C75C3B]/20"
              >
                <Plus className="h-4 w-4" />
                Add Contact
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
