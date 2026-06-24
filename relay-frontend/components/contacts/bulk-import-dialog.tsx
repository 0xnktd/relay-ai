'use client'

import { useState, useCallback } from 'react'
import { useBulkImportContacts } from '@/lib/hooks/use-contacts'
import { BulkContactInput } from '@/types/contact'
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BulkImportDialogProps {
  open: boolean
  onClose: () => void
}

interface ParsedContact extends BulkContactInput {
  _row: number
  _valid: boolean
  _error?: string
}

export function BulkImportDialog({ open, onClose }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([])
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [parseError, setParseError] = useState<string | null>(null)

  const bulkImport = useBulkImportContacts()

  const resetState = useCallback(() => {
    setFile(null)
    setParsedContacts([])
    setParseError(null)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  const parseCSV = useCallback((text: string): ParsedContact[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row')
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
    const phoneIdx = header.findIndex(h => h === 'phone' || h === 'phone number' || h === 'mobile')
    const nameIdx = header.findIndex(h => h === 'name' || h === 'full name' || h === 'contact name')
    const emailIdx = header.findIndex(h => h === 'email' || h === 'email address')
    const timezoneIdx = header.findIndex(h => h === 'timezone' || h === 'tz')

    if (phoneIdx === -1) {
      throw new Error('CSV must have a "phone" column')
    }

    const contacts: ParsedContact[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Simple CSV parsing (handles quoted values)
      const values: string[] = []
      let current = ''
      let inQuotes = false

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())

      const phone = values[phoneIdx]?.replace(/"/g, '').trim()

      if (!phone) {
        contacts.push({
          phone: '',
          _row: i + 1,
          _valid: false,
          _error: 'Phone number is required'
        })
        continue
      }

      // Basic phone validation
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
      const isValidPhone = /^\+?[0-9]{10,15}$/.test(cleanPhone)

      contacts.push({
        phone: cleanPhone,
        name: nameIdx !== -1 ? values[nameIdx]?.replace(/"/g, '').trim() || undefined : undefined,
        email: emailIdx !== -1 ? values[emailIdx]?.replace(/"/g, '').trim() || undefined : undefined,
        timezone: timezoneIdx !== -1 ? values[timezoneIdx]?.replace(/"/g, '').trim() || 'Asia/Kolkata' : 'Asia/Kolkata',
        _row: i + 1,
        _valid: isValidPhone,
        _error: isValidPhone ? undefined : 'Invalid phone number format'
      })
    }

    return contacts
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      setParseError('Please select a CSV file')
      return
    }

    setFile(selectedFile)
    setParseError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const contacts = parseCSV(text)
        setParsedContacts(contacts)
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Failed to parse CSV')
        setParsedContacts([])
      }
    }
    reader.onerror = () => {
      setParseError('Failed to read file')
    }
    reader.readAsText(selectedFile)
  }, [parseCSV])

  const handleImport = useCallback(async () => {
    const validContacts = parsedContacts
      .filter(c => c._valid)
      .map(({ _row, _valid, _error, ...contact }) => contact)

    if (validContacts.length === 0) {
      toast.error('No valid contacts to import')
      return
    }

    try {
      const result = await bulkImport.mutateAsync({
        contacts: validContacts,
        skip_duplicates: skipDuplicates
      })

      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} contacts`)
      }
      if (result.skipped > 0) {
        toast.info(`Skipped ${result.skipped} duplicate contacts`)
      }
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} contacts had errors`)
      }

      handleClose()
    } catch (err) {
      toast.error('Import failed. Please try again.')
    }
  }, [parsedContacts, skipDuplicates, bulkImport, handleClose])

  const validCount = parsedContacts.filter(c => c._valid).length
  const invalidCount = parsedContacts.filter(c => !c._valid).length

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E8DFD0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C75C3B] to-[#D4A853] flex items-center justify-center">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-[#1A2744]">Bulk Import Contacts</h2>
              <p className="text-sm text-[#2A3A5A]">Upload a CSV file to import multiple contacts</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-[#F5EBD8] text-[#2A3A5A] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* File Upload */}
          {!file && (
            <div className="space-y-4">
              <label className="block">
                <div className="border-2 border-dashed border-[#E8DFD0] rounded-xl p-8 text-center hover:border-[#C75C3B] transition-colors cursor-pointer">
                  <FileText className="h-12 w-12 mx-auto text-[#2A3A5A]/40 mb-4" />
                  <p className="text-[#1A2744] font-medium mb-1">Drop your CSV file here</p>
                  <p className="text-sm text-[#2A3A5A]">or click to browse</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </label>

              {parseError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}

              <div className="bg-[#F5EBD8] rounded-xl p-4">
                <p className="text-sm font-medium text-[#1A2744] mb-2">CSV Format</p>
                <p className="text-sm text-[#2A3A5A] mb-2">Your CSV should have these columns:</p>
                <ul className="text-sm text-[#2A3A5A] space-y-1">
                  <li><code className="bg-white px-1.5 py-0.5 rounded text-[#C75C3B]">phone</code> - Required (e.g., +919876543210)</li>
                  <li><code className="bg-white px-1.5 py-0.5 rounded text-[#C75C3B]">name</code> - Optional</li>
                  <li><code className="bg-white px-1.5 py-0.5 rounded text-[#C75C3B]">email</code> - Optional</li>
                  <li><code className="bg-white px-1.5 py-0.5 rounded text-[#C75C3B]">timezone</code> - Optional (default: Asia/Kolkata)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Preview */}
          {file && parsedContacts.length > 0 && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#8FA382]/10 text-[#6B8A5E]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">{validCount} valid</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#C75C3B]/10 text-[#C75C3B]">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{invalidCount} invalid</span>
                  </div>
                )}
                <button
                  onClick={resetState}
                  className="ml-auto text-sm text-[#C75C3B] hover:underline"
                >
                  Upload different file
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-[#E8DFD0] rounded-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F5EBD8] sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium text-[#1A2744]">Row</th>
                        <th className="text-left p-3 font-medium text-[#1A2744]">Phone</th>
                        <th className="text-left p-3 font-medium text-[#1A2744]">Name</th>
                        <th className="text-left p-3 font-medium text-[#1A2744]">Email</th>
                        <th className="text-left p-3 font-medium text-[#1A2744]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5EBD8]">
                      {parsedContacts.slice(0, 50).map((contact, idx) => (
                        <tr key={idx} className={!contact._valid ? 'bg-red-50/50' : ''}>
                          <td className="p-3 text-[#2A3A5A]">{contact._row}</td>
                          <td className="p-3 text-[#1A2744] font-mono">{contact.phone || '-'}</td>
                          <td className="p-3 text-[#1A2744]">{contact.name || '-'}</td>
                          <td className="p-3 text-[#1A2744]">{contact.email || '-'}</td>
                          <td className="p-3">
                            {contact._valid ? (
                              <span className="inline-flex items-center gap-1 text-[#6B8A5E]">
                                <CheckCircle2 className="h-4 w-4" />
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#C75C3B]">
                                <AlertCircle className="h-4 w-4" />
                                {contact._error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedContacts.length > 50 && (
                  <div className="p-3 bg-[#F5EBD8] text-center text-sm text-[#2A3A5A]">
                    Showing first 50 of {parsedContacts.length} contacts
                  </div>
                )}
              </div>

              {/* Options */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E8DFD0] text-[#C75C3B] focus:ring-[#C75C3B]"
                />
                <span className="text-sm text-[#1A2744]">Skip contacts with duplicate phone numbers</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#E8DFD0]">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-full border border-[#E8DFD0] text-[#1A2744] font-medium text-sm hover:bg-[#F5EBD8] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={validCount === 0 || bulkImport.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C75C3B] text-white font-medium text-sm hover:bg-[#A34830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkImport.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import {validCount} Contacts
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
