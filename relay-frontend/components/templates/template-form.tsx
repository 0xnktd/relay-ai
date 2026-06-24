'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Template } from '@/types/template'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { nanoid } from 'nanoid'

const questionSchema = z.object({
  id: z.string(),
  question: z.string().min(1, 'Question is required'),
  type: z.enum(['open_ended', 'yes_no', 'multiple_choice']),
  required: z.boolean(),
})

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  voice_id: z.string().min(1, 'Voice ID is required'),
  initial_message: z.string().min(1, 'Initial message is required'),
  questions: z.array(questionSchema).optional(),
  closing_message: z.string().optional(),
  max_duration_seconds: z.number().int().min(30).max(3600).optional(),
})

type TemplateFormValues = z.infer<typeof templateSchema>

interface TemplateFormProps {
  template?: Template
  onSubmit: (data: TemplateFormValues) => void
  isLoading?: boolean
}

const voiceOptions = [
  { value: 'alloy', label: 'Alloy (Neutral)' },
  { value: 'echo', label: 'Echo (Male)' },
  { value: 'fable', label: 'Fable (British)' },
  { value: 'onyx', label: 'Onyx (Male, Deep)' },
  { value: 'nova', label: 'Nova (Female)' },
  { value: 'shimmer', label: 'Shimmer (Female)' },
]

export function TemplateForm({ template, onSubmit, isLoading }: TemplateFormProps) {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      voice_id: template?.voice_id || 'nova',
      initial_message: template?.initial_message || '',
      questions: template?.questions || [],
      closing_message: template?.closing_message || '',
      max_duration_seconds: template?.max_duration_seconds || 300,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'questions',
  })

  const handleSubmit = (data: TemplateFormValues) => {
    const cleanedData = {
      ...data,
      description: data.description || undefined,
      closing_message: data.closing_message || undefined,
      questions: data.questions?.length ? data.questions : undefined,
    }
    onSubmit(cleanedData)
  }

  const addQuestion = () => {
    append({
      id: nanoid(),
      question: '',
      type: 'open_ended',
      required: true,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name *</FormLabel>
              <FormControl>
                <Input placeholder="Follow-up Call" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Brief description of this template" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="voice_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Voice *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {voiceOptions.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
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
          name="initial_message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Message *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Hello! This is a follow-up call regarding..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The first message the AI will say when the call connects
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Questions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <FormLabel>Questions</FormLabel>
              <p className="text-sm text-muted-foreground">
                Questions the AI will ask during the call
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="pt-4">
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name={`questions.${index}.question`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question {index + 1}</FormLabel>
                        <FormControl>
                          <Input placeholder="What is your preferred contact time?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`questions.${index}.type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="open_ended">Open Ended</SelectItem>
                              <SelectItem value="yes_no">Yes / No</SelectItem>
                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end justify-between pb-2">
                      <FormField
                        control={form.control}
                        name={`questions.${index}.required`}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">Required</FormLabel>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <FormField
          control={form.control}
          name="closing_message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Closing Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Thank you for your time. Have a great day!"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The message the AI will say before ending the call
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="max_duration_seconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Duration (seconds)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={30}
                  max={3600}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                />
              </FormControl>
              <FormDescription>
                Maximum call duration (30-3600 seconds)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
        </Button>
      </form>
    </Form>
  )
}
