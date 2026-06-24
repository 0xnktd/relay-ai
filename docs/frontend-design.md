# RelayAI Frontend Design

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Query (TanStack Query) for server state
- **Auth**: Supabase Auth (@supabase/ssr)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

## Project Structure

```
relay-frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard home
│   │   ├── contacts/
│   │   │   ├── page.tsx                # Contact list
│   │   │   ├── new/page.tsx            # Create contact
│   │   │   └── [id]/page.tsx           # Contact detail/edit
│   │   ├── templates/
│   │   │   ├── page.tsx                # Template list
│   │   │   ├── new/page.tsx            # Create template
│   │   │   └── [id]/page.tsx           # Template detail/edit
│   │   ├── calls/
│   │   │   ├── page.tsx                # Call list/history
│   │   │   ├── schedule/page.tsx       # Schedule new call
│   │   │   └── [id]/page.tsx           # Call detail + transcript
│   │   └── settings/page.tsx           # User settings
│   ├── layout.tsx                      # Root layout
│   └── globals.css
├── components/
│   ├── ui/                             # shadcn components
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── nav-links.tsx
│   ├── contacts/
│   │   ├── contact-form.tsx
│   │   ├── contact-card.tsx
│   │   └── contact-table.tsx
│   ├── templates/
│   │   ├── template-form.tsx
│   │   ├── template-card.tsx
│   │   └── extraction-schema-builder.tsx
│   ├── calls/
│   │   ├── schedule-form.tsx
│   │   ├── call-card.tsx
│   │   ├── call-status-badge.tsx
│   │   ├── transcript-viewer.tsx
│   │   └── extracted-data-display.tsx
│   └── shared/
│       ├── loading-spinner.tsx
│       ├── empty-state.tsx
│       ├── error-boundary.tsx
│       └── confirm-dialog.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser client
│   │   ├── server.ts                   # Server client
│   │   └── middleware.ts               # Auth middleware
│   ├── api/
│   │   ├── client.ts                   # API client with auth
│   │   ├── contacts.ts                 # Contact API calls
│   │   ├── templates.ts                # Template API calls
│   │   └── calls.ts                    # Call API calls
│   ├── hooks/
│   │   ├── use-contacts.ts
│   │   ├── use-templates.ts
│   │   └── use-calls.ts
│   └── utils.ts
├── types/
│   ├── contact.ts
│   ├── template.ts
│   └── call.ts
├── middleware.ts                       # Next.js middleware for auth
├── next.config.js
├── tailwind.config.ts
└── package.json
```

## Pages & Features

### 1. Authentication Pages

#### Login (`/login`)
- Email/password login
- Magic link option
- "Forgot password" link
- Redirect to dashboard on success

#### Signup (`/signup`)
- Email/password registration
- Email verification flow
- Redirect to login after signup

### 2. Dashboard (`/`)
- Overview stats:
  - Total contacts
  - Calls scheduled today
  - Calls completed this week
  - Success rate
- Recent calls list (last 5)
- Quick actions:
  - Schedule a call
  - Add contact
  - Create template

### 3. Contacts (`/contacts`)

#### List View
- Table with columns: Name, Phone, Email, Created
- Search/filter by name or phone
- Pagination
- Bulk actions (delete)

#### Create/Edit Form
- Fields: name, phone, email, timezone, metadata (key-value pairs)
- Phone validation
- Timezone dropdown

### 4. Templates (`/templates`)

#### List View
- Card grid showing template name, description, created date
- Search by name
- Delete action

#### Create/Edit Form
- Fields:
  - Name
  - Description
  - System prompt (textarea)
  - Opening message
  - Extraction schema builder (dynamic form to define fields to extract)
  - Voice selection (dropdown)
  - Max duration

#### Extraction Schema Builder
- Add field button
- For each field:
  - Field name
  - Field type (string, number, boolean, array)
  - Description/prompt
  - Required toggle
- Preview JSON output

### 5. Calls (`/calls`)

#### List View
- Table: Contact, Template, Scheduled At, Status, Outcome
- Filter by status (scheduled, in_progress, completed, failed, cancelled)
- Date range filter
- Click to view details

#### Schedule Form (`/calls/schedule`)
- Contact selector (dropdown with search)
- Template selector (dropdown with search)
- Scheduled date/time picker
- Max retries input
- Submit schedules call

#### Call Detail (`/calls/[id]`)
- Call info: contact, template, status, timestamps
- Status timeline/progress
- Transcript viewer (if completed):
  - Speaker-labeled messages
  - Timestamps
  - Audio player (if recording available)
- Extracted data display:
  - Formatted JSON or table view
  - Confidence score
- Actions: Cancel (if scheduled), Retry (if failed)

### 6. Settings (`/settings`)
- Profile info (email, name)
- Notification preferences
- API keys (future)
- Webhook configuration (future)

## Authentication Flow

```
1. User visits protected route
2. Middleware checks for Supabase session
3. No session → redirect to /login
4. Has session → allow access, pass JWT to API calls
```

### Supabase SSR Setup

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

## API Integration

### API Client

```typescript
// lib/api/client.ts
import { createClient } from '@/lib/supabase/client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'API Error')
  }

  return response.json()
}
```

### React Query Hooks

```typescript
// lib/hooks/use-contacts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getContacts, createContact, updateContact, deleteContact } from '@/lib/api/contacts'

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: getContacts,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
```

## Component Examples

### Call Status Badge

```typescript
// components/calls/call-status-badge.tsx
import { Badge } from '@/components/ui/badge'

const statusConfig = {
  scheduled: { label: 'Scheduled', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

export function CallStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.scheduled
  return <Badge variant={config.variant}>{config.label}</Badge>
}
```

### Transcript Viewer

```typescript
// components/calls/transcript-viewer.tsx
export function TranscriptViewer({ transcript }: { transcript: TranscriptEntry[] }) {
  return (
    <div className="space-y-3">
      {transcript.map((entry, i) => (
        <div key={i} className={cn(
          "p-3 rounded-lg max-w-[80%]",
          entry.speaker === 'agent'
            ? "bg-primary/10 ml-auto"
            : "bg-muted"
        )}>
          <div className="text-xs text-muted-foreground mb-1">
            {entry.speaker === 'agent' ? 'AI Agent' : 'Contact'}
            <span className="ml-2">{formatTime(entry.timestamp)}</span>
          </div>
          <p>{entry.text}</p>
        </div>
      ))}
    </div>
  )
}
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Implementation Order

1. **Project Setup**
   - Initialize Next.js with TypeScript
   - Install dependencies
   - Configure Tailwind + shadcn/ui
   - Set up Supabase client

2. **Authentication**
   - Login/signup pages
   - Middleware for protected routes
   - Auth context/provider

3. **Layout**
   - Dashboard layout with sidebar
   - Navigation links
   - Header with user menu

4. **Contacts Module**
   - API hooks
   - List page with table
   - Create/edit form
   - Delete confirmation

5. **Templates Module**
   - API hooks
   - List page with cards
   - Create/edit form with schema builder

6. **Calls Module**
   - API hooks
   - List page with filters
   - Schedule form
   - Detail page with transcript viewer

7. **Dashboard**
   - Stats cards
   - Recent calls
   - Quick actions

8. **Polish**
   - Loading states
   - Error handling
   - Empty states
   - Responsive design
