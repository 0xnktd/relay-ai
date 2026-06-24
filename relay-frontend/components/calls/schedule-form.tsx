'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Contact } from '@/types/contact'
import { Template } from '@/types/template'
import { format } from 'date-fns'

const scheduleSchema = z.object({
  contact_id: z.string().min(1, 'Contact is required'),
  template_id: z.string().min(1, 'Template is required'),
  scheduled_at: z.string().min(1, 'Scheduled time is required'),
  priority: z.enum(['low', 'normal', 'high']),
  max_retries: z.number().int().min(0).max(10),
})

type ScheduleFormValues = z.infer<typeof scheduleSchema>

interface ScheduleFormProps {
  contacts: Contact[]
  templates: Template[]
  onSubmit: (data: ScheduleFormValues) => void
  isLoading?: boolean
}

export function ScheduleForm({ contacts, templates, onSubmit, isLoading }: ScheduleFormProps) {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)
  const defaultDateTime = format(now, "yyyy-MM-dd'T'HH:mm")

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      contact_id: '',
      template_id: '',
      scheduled_at: defaultDateTime,
      priority: 'normal',
      max_retries: 3,
    },
  })

  const handleSubmit = (data: ScheduleFormValues) => {
    const scheduledAt = new Date(data.scheduled_at).toISOString()
    onSubmit({
      ...data,
      scheduled_at: scheduledAt,
      max_retries: Number(data.max_retries),
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="contact_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name || contact.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="template_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="scheduled_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scheduled Time *</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormDescription>
                When the call should be made
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="max_retries"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Retries</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                />
              </FormControl>
              <FormDescription>
                Number of retry attempts if call fails (0-10)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Scheduling...' : 'Schedule Call'}
        </Button>
      </form>
    </Form>
  )
}
