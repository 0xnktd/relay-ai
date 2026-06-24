# RelayAI Backend - Design Document

**Version:** 1.0
**Date:** January 2026
**Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [System Architecture](#3-system-architecture)
4. [API Design](#4-api-design)
5. [Data Models](#5-data-models)
6. [Core Services](#6-core-services)
7. [Call Flow](#7-call-flow)
8. [Error Handling & Retry Logic](#8-error-handling--retry-logic)
9. [Security](#9-security)
10. [Scalability](#10-scalability)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Dependencies](#12-dependencies)

---

## 1. Overview

### 1.1 Problem Statement

Users need to collect information from people via phone calls but lack the time or resources to make these calls manually. RelayAI automates this by scheduling AI-powered phone calls that conduct natural conversations, extract required information, and deliver structured results.

### 1.2 Solution

A backend system that:
- Accepts call scheduling requests via API
- Manages call queue and timing
- Orchestrates AI-powered phone conversations
- Extracts and structures information from calls
- Delivers results to users via multiple channels

### 1.3 Tech Stack

| Component | Technology |
|-----------|------------|
| Language | Python 3.11+ |
| Framework | FastAPI |
| **Backend-as-a-Service** | **Supabase** |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime (for live updates) |
| **Message Queue** | **pgmq (Postgres Message Queue)** |
| Cache | Redis 7+ (optional, for rate limiting) |
| ORM | Supabase Python Client |
| Migrations | Supabase Migrations / Alembic |
| Telephony | Vapi.ai / Retell.ai |
| LLM | OpenAI GPT-4o |
| Containerization | Docker |

### 1.4 Why Supabase?

| Feature | Benefit |
|---------|---------|
| **Managed PostgreSQL** | No DB ops, automatic backups, scaling |
| **Built-in Auth** | JWT auth, OAuth providers, magic links out of the box |
| **Row Level Security** | Fine-grained access control at database level |
| **Realtime** | Live subscriptions for call status updates |
| **Storage** | S3-compatible storage for recordings |
| **pgmq Extension** | Message queue built into Postgres - no Redis/Celery needed |
| **Edge Functions** | Serverless functions for webhooks |
| **Dashboard** | SQL editor, logs, metrics built-in |

---

## 2. Goals & Non-Goals

### 2.1 Goals

- **Reliability:** 99.9% uptime for API, successful call completion rate >95%
- **Latency:** API response <200ms p95, call initiation within 30s of scheduled time
- **Scalability:** Support 10,000 concurrent scheduled calls
- **Extensibility:** Easy to add new telephony providers and LLM backends
- **Security:** SOC2-ready architecture, TCPA compliant

### 2.2 Non-Goals (v1)

- Real-time call monitoring/intervention by users
- Inbound call handling
- Multi-party conference calls
- Non-English language support
- On-premise deployment

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                    │
│                    (Web App, Mobile App, Third-party API)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
┌───────────────────────────────────┐   ┌─────────────────────────────────────┐
│         SUPABASE PLATFORM         │   │          FASTAPI BACKEND            │
│  ┌─────────────┐  ┌─────────────┐ │   │  ┌─────────────┐  ┌─────────────┐  │
│  │   Auth      │  │  Realtime   │ │   │  │   API       │  │  Scheduler  │  │
│  │  (JWT/OAuth)│  │ (WebSocket) │ │   │  │  Service    │  │   Service   │  │
│  └─────────────┘  └─────────────┘ │   │  └─────────────┘  └─────────────┘  │
│  ┌─────────────┐  ┌─────────────┐ │   │  ┌─────────────┐  ┌─────────────┐  │
│  │  PostgreSQL │  │   Storage   │ │   │  │   Call      │  │  Webhook    │  │
│  │   (+ RLS)   │  │ (Recordings)│ │   │  │  Executor   │  │  Handler    │  │
│  └─────────────┘  └─────────────┘ │   │  └─────────────┘  └─────────────┘  │
│  ┌─────────────┐                  │   │  ┌─────────────┐  ┌─────────────┐  │
│  │    Edge     │                  │   │  │ Extraction  │  │ Notification│  │
│  │  Functions  │                  │   │  │  Service    │  │   Service   │  │
│  └─────────────┘                  │   │  └─────────────┘  └─────────────┘  │
└───────────────────────────────────┘   └─────────────────────────────────────┘
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │     WORKER PROCESS      │
                        │  (Polls pgmq queues)    │
                        │                         │
                        │  ┌───────────────────┐  │
                        │  │ call_queue        │  │
                        │  │ extraction_queue  │  │
                        │  │ notification_queue│  │
                        │  └───────────────────┘  │
                        └─────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Vapi.ai/   │  │   OpenAI    │  │  SendGrid/  │  │   Stripe    │        │
│  │  Retell.ai  │  │   GPT-4o    │  │   Resend    │  │  (Billing)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Supabase Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                     How Supabase Fits In                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ AUTHENTICATION FLOW                                      │    │
│  │                                                          │    │
│  │  Client ──▶ Supabase Auth ──▶ JWT Token                 │    │
│  │                                    │                     │    │
│  │                                    ▼                     │    │
│  │                            FastAPI validates             │    │
│  │                            JWT via Supabase              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ DATA ACCESS                                              │    │
│  │                                                          │    │
│  │  FastAPI ──▶ Supabase Client ──▶ PostgreSQL             │    │
│  │                    │                                     │    │
│  │                    ├── Row Level Security (RLS)         │    │
│  │                    └── Automatic user scoping           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STORAGE                                                  │    │
│  │                                                          │    │
│  │  Call Recording ──▶ Supabase Storage ──▶ Signed URLs   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ REALTIME                                                 │    │
│  │                                                          │    │
│  │  DB Changes ──▶ Supabase Realtime ──▶ Client WebSocket  │    │
│  │  (call status updates pushed to frontend instantly)     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Component Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        FastAPI Application                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      API Layer                            │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │  │
│  │  │   /auth    │ │  /calls    │ │ /contacts  │            │  │
│  │  └────────────┘ └────────────┘ └────────────┘            │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │  │
│  │  │ /templates │ │ /webhooks  │ │ /analytics │            │  │
│  │  └────────────┘ └────────────┘ └────────────┘            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Service Layer                          │  │
│  │  ┌────────────────┐  ┌────────────────┐                  │  │
│  │  │ CallService    │  │ ContactService │                  │  │
│  │  │ - schedule()   │  │ - create()     │                  │  │
│  │  │ - cancel()     │  │ - update()     │                  │  │
│  │  │ - get_status() │  │ - list()       │                  │  │
│  │  └────────────────┘  └────────────────┘                  │  │
│  │  ┌────────────────┐  ┌────────────────┐                  │  │
│  │  │ TemplateService│  │ ExtractionSvc  │                  │  │
│  │  │ - create()     │  │ - extract()    │                  │  │
│  │  │ - validate()   │  │ - structure()  │                  │  │
│  │  └────────────────┘  └────────────────┘                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Repository Layer                         │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │  │
│  │  │ CallRepo   │ │ContactRepo │ │TemplateRepo│            │  │
│  │  └────────────┘ └────────────┘ └────────────┘            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 3.4 Directory Structure

```
relay-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app initialization
│   ├── config.py               # Configuration management
│   │
│   ├── api/                    # API Layer
│   │   ├── __init__.py
│   │   ├── deps.py             # Dependencies (Supabase client, auth)
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py       # Main router
│   │   │   ├── auth.py         # Auth endpoints (proxy to Supabase)
│   │   │   ├── calls.py        # Call endpoints
│   │   │   ├── contacts.py     # Contact endpoints
│   │   │   ├── templates.py    # Template endpoints
│   │   │   └── webhooks.py     # Webhook handlers
│   │   └── schemas/            # Pydantic models
│   │       ├── __init__.py
│   │       ├── call.py
│   │       ├── contact.py
│   │       └── template.py
│   │
│   ├── core/                   # Core infrastructure
│   │   ├── __init__.py
│   │   ├── supabase.py         # Supabase client singleton
│   │   ├── auth.py             # Supabase JWT verification
│   │   └── storage.py          # Supabase Storage helpers
│   │
│   ├── services/               # Business Logic Layer
│   │   ├── __init__.py
│   │   ├── call_service.py
│   │   ├── contact_service.py
│   │   ├── template_service.py
│   │   ├── extraction_service.py
│   │   ├── notification_service.py
│   │   └── telephony/
│   │       ├── __init__.py
│   │       ├── base.py         # Abstract base class
│   │       ├── vapi.py         # Vapi.ai implementation
│   │       └── retell.py       # Retell.ai implementation
│   │
│   ├── repositories/           # Data Access Layer (Supabase)
│   │   ├── __init__.py
│   │   ├── base.py             # Base repository with Supabase client
│   │   ├── call_repo.py
│   │   ├── contact_repo.py
│   │   └── template_repo.py
│   │
│   ├── queue/                  # pgmq Queue System
│   │   ├── __init__.py
│   │   ├── client.py           # pgmq client wrapper
│   │   ├── consumer.py         # Queue consumer/worker
│   │   ├── producer.py         # Queue producer helpers
│   │   └── handlers/           # Message handlers
│   │       ├── __init__.py
│   │       ├── call_handler.py
│   │       ├── extraction_handler.py
│   │       └── notification_handler.py
│   │
│   └── utils/
│       ├── __init__.py
│       ├── exceptions.py
│       └── validators.py
│
├── supabase/                    # Supabase local development
│   ├── config.toml             # Supabase configuration
│   ├── migrations/             # Database migrations
│   │   ├── 20260101000000_initial_schema.sql
│   │   ├── 20260101000001_create_contacts.sql
│   │   ├── 20260101000002_create_calls.sql
│   │   └── 20260101000003_rls_policies.sql
│   ├── seed.sql                # Seed data
│   └── functions/              # Edge Functions (optional)
│       └── handle-webhook/
│           └── index.ts
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_api/
│   ├── test_services/
│   └── test_workers/
│
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   └── docker-compose.yml
│
├── scripts/
│   ├── start.sh
│   └── seed_db.py
│
├── pyproject.toml
├── requirements.txt
└── README.md
```

---

## 4. API Design

### 4.1 Authentication (Supabase Auth)

All API requests require authentication via **Supabase JWT tokens**:

```
Authorization: Bearer <supabase_jwt_token>
```

**Authentication Flow:**

```
┌──────────┐      ┌──────────────┐      ┌──────────────┐
│  Client  │      │ Supabase Auth│      │   FastAPI    │
└────┬─────┘      └──────┬───────┘      └──────┬───────┘
     │                   │                     │
     │ 1. Sign up/Login  │                     │
     │──────────────────▶│                     │
     │                   │                     │
     │ 2. JWT Token      │                     │
     │◀──────────────────│                     │
     │                   │                     │
     │ 3. API Request + JWT                    │
     │────────────────────────────────────────▶│
     │                   │                     │
     │                   │ 4. Verify JWT       │
     │                   │◀────────────────────│
     │                   │                     │
     │                   │ 5. User data        │
     │                   │────────────────────▶│
     │                   │                     │
     │ 6. Response                             │
     │◀────────────────────────────────────────│
```

**Supported Auth Methods:**
- Email/Password
- Magic Link (passwordless)
- OAuth (Google, GitHub, etc.)
- Phone/SMS OTP

For programmatic access (API keys), we store hashed keys in the `api_keys` table and validate separately.

### 4.2 API Endpoints

#### 4.2.1 Authentication

```
POST   /api/v1/auth/register        # Create new account
POST   /api/v1/auth/login           # Get JWT token
POST   /api/v1/auth/refresh         # Refresh JWT token
POST   /api/v1/auth/api-keys        # Create API key
DELETE /api/v1/auth/api-keys/{id}   # Revoke API key
```

#### 4.2.2 Contacts

```
GET    /api/v1/contacts             # List contacts
POST   /api/v1/contacts             # Create contact
GET    /api/v1/contacts/{id}        # Get contact
PUT    /api/v1/contacts/{id}        # Update contact
DELETE /api/v1/contacts/{id}        # Delete contact
POST   /api/v1/contacts/import      # Bulk import (CSV)
```

#### 4.2.3 Call Templates

```
GET    /api/v1/templates            # List templates
POST   /api/v1/templates            # Create template
GET    /api/v1/templates/{id}       # Get template
PUT    /api/v1/templates/{id}       # Update template
DELETE /api/v1/templates/{id}       # Delete template
POST   /api/v1/templates/{id}/test  # Test template with mock call
```

#### 4.2.4 Calls

```
GET    /api/v1/calls                # List calls (with filters)
POST   /api/v1/calls                # Schedule new call
GET    /api/v1/calls/{id}           # Get call details
DELETE /api/v1/calls/{id}           # Cancel scheduled call
GET    /api/v1/calls/{id}/transcript    # Get call transcript
GET    /api/v1/calls/{id}/recording     # Get recording URL
GET    /api/v1/calls/{id}/extracted     # Get extracted data
POST   /api/v1/calls/{id}/retry         # Retry failed call
POST   /api/v1/calls/batch              # Schedule multiple calls
```

#### 4.2.5 Webhooks (Inbound from Telephony Provider)

```
POST   /api/v1/webhooks/call-started    # Call connected
POST   /api/v1/webhooks/call-ended      # Call completed
POST   /api/v1/webhooks/call-failed     # Call failed
POST   /api/v1/webhooks/transcription   # Real-time transcription
```

#### 4.2.6 User Webhooks (Outbound to User Systems)

```
GET    /api/v1/user-webhooks            # List configured webhooks
POST   /api/v1/user-webhooks            # Create webhook endpoint
PUT    /api/v1/user-webhooks/{id}       # Update webhook
DELETE /api/v1/user-webhooks/{id}       # Delete webhook
POST   /api/v1/user-webhooks/{id}/test  # Test webhook delivery
```

### 4.3 Request/Response Examples

#### Schedule a Call

**Request:**
```http
POST /api/v1/calls
Content-Type: application/json
Authorization: Bearer <token>

{
  "contact_id": "cont_abc123",
  "template_id": "tmpl_xyz789",
  "scheduled_at": "2026-01-24T10:00:00Z",
  "timezone": "America/New_York",
  "priority": "normal",
  "max_retries": 3,
  "metadata": {
    "internal_ref": "follow-up-123"
  }
}
```

**Response:**
```json
{
  "id": "call_def456",
  "status": "scheduled",
  "contact": {
    "id": "cont_abc123",
    "name": "John Doe",
    "phone": "+1234567890"
  },
  "template": {
    "id": "tmpl_xyz789",
    "name": "Appointment Confirmation"
  },
  "scheduled_at": "2026-01-24T10:00:00Z",
  "estimated_duration_seconds": 120,
  "created_at": "2026-01-23T15:30:00Z"
}
```

#### Create a Template

**Request:**
```http
POST /api/v1/templates
Content-Type: application/json

{
  "name": "Appointment Confirmation",
  "description": "Confirm upcoming appointment details",
  "voice_id": "voice_professional_female_1",
  "initial_message": "Hi, this is Sarah calling from {company_name} to confirm your appointment.",
  "questions": [
    {
      "id": "confirm_attendance",
      "question": "Can you confirm you'll be attending your appointment on {appointment_date}?",
      "type": "yes_no",
      "required": true,
      "follow_up": {
        "yes": "Great! We'll see you then.",
        "no": "I understand. Would you like to reschedule?"
      }
    },
    {
      "id": "reschedule_preference",
      "question": "What day works better for you?",
      "type": "open_ended",
      "required": false,
      "condition": "confirm_attendance == 'no'"
    }
  ],
  "closing_message": "Thank you for your time. Have a great day!",
  "max_duration_seconds": 300,
  "extraction_schema": {
    "will_attend": "boolean",
    "reschedule_date": "string | null",
    "additional_notes": "string | null"
  }
}
```

#### Get Call Results

**Response:**
```json
{
  "id": "call_def456",
  "status": "completed",
  "started_at": "2026-01-24T10:00:05Z",
  "ended_at": "2026-01-24T10:02:34Z",
  "duration_seconds": 149,
  "outcome": "successful",
  "transcript": [
    {
      "speaker": "agent",
      "text": "Hi, this is Sarah calling from Acme Corp to confirm your appointment.",
      "timestamp": 0.0
    },
    {
      "speaker": "contact",
      "text": "Oh yes, hello!",
      "timestamp": 3.2
    }
  ],
  "extracted_data": {
    "will_attend": true,
    "reschedule_date": null,
    "additional_notes": "Mentioned they might be 10 minutes late"
  },
  "recording_url": "https://storage.relayai.com/recordings/call_def456.mp3",
  "confidence_score": 0.94,
  "cost": {
    "telephony": 0.08,
    "ai": 0.03,
    "total": 0.11,
    "currency": "USD"
  }
}
```

### 4.4 Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": {
      "field": "phone",
      "value": "123",
      "constraint": "Must be E.164 format"
    },
    "request_id": "req_abc123"
  }
}
```

### 4.5 Standard Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request data |
| 401 | UNAUTHORIZED | Missing or invalid auth |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Resource already exists |
| 422 | UNPROCESSABLE | Valid syntax but can't process |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Dependency unavailable |

---

## 5. Data Models

### 5.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │       │   Organization  │       │     ApiKey      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │    ┌──│ id (PK)         │
│ email           │  │    │ name            │    │  │ user_id (FK)    │
│ password_hash   │  │    │ settings (JSON) │    │  │ key_hash        │
│ org_id (FK)     │──┼───▶│ billing_plan    │    │  │ name            │
│ role            │  │    │ created_at      │    │  │ last_used_at    │
│ created_at      │  │    └─────────────────┘    │  │ expires_at      │
└─────────────────┘  │                           │  └─────────────────┘
         │           │                           │
         │           └───────────────────────────┘
         │
         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Contact      │       │  CallTemplate   │       │   UserWebhook   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ user_id (FK)    │       │ user_id (FK)    │       │ user_id (FK)    │
│ phone           │       │ name            │       │ url             │
│ name            │       │ voice_id        │       │ events[]        │
│ email           │       │ initial_message │       │ secret          │
│ metadata (JSON) │       │ questions (JSON)│       │ is_active       │
│ created_at      │       │ closing_message │       │ created_at      │
│ updated_at      │       │ extraction_schema│      └─────────────────┘
└─────────────────┘       │ max_duration    │
         │                │ created_at      │
         │                └─────────────────┘
         │                        │
         │                        │
         ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          ScheduledCall                               │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)                                                              │
│ user_id (FK)                                                         │
│ contact_id (FK)                                                      │
│ template_id (FK)                                                     │
│ status (enum: scheduled, in_progress, completed, failed, cancelled) │
│ scheduled_at                                                         │
│ priority (enum: low, normal, high)                                  │
│ retry_count                                                          │
│ max_retries                                                          │
│ metadata (JSON)                                                      │
│ created_at                                                           │
│ updated_at                                                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           CallRecord                                 │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)                                                              │
│ scheduled_call_id (FK)                                               │
│ provider_call_id (external reference)                               │
│ started_at                                                           │
│ ended_at                                                             │
│ duration_seconds                                                     │
│ outcome (enum: successful, no_answer, busy, voicemail, failed)      │
│ recording_url                                                        │
│ transcript (JSON array)                                              │
│ raw_provider_data (JSON)                                            │
│ cost_telephony                                                       │
│ cost_ai                                                              │
│ created_at                                                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ExtractedData                                │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)                                                              │
│ call_record_id (FK)                                                  │
│ structured_data (JSON - matches extraction_schema)                  │
│ confidence_score                                                     │
│ extraction_model                                                     │
│ created_at                                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Supabase Client Setup

```python
# app/core/supabase.py

from functools import lru_cache
from supabase import create_client, Client
from app.config import settings


@lru_cache()
def get_supabase_admin_client() -> Client:
    """
    Get Supabase client with service_role key.
    This bypasses RLS - use for backend workers and admin operations.
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )


def get_supabase_client() -> Client:
    """
    Get Supabase client with anon key.
    Use with user JWT for RLS-enabled queries.
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
    )


def get_authenticated_client(access_token: str) -> Client:
    """
    Get Supabase client authenticated with user's token.
    RLS policies will be applied based on the user.
    """
    client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
    )
    client.auth.set_session(access_token, "")
    return client
```

### 5.3 Supabase Migrations (SQL Schema)

```sql
-- supabase/migrations/20260101000000_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE call_status AS ENUM (
    'scheduled', 'queued', 'in_progress', 'completed', 'failed', 'cancelled'
);

CREATE TYPE call_outcome AS ENUM (
    'successful', 'no_answer', 'busy', 'voicemail', 'failed', 'human_hangup'
);

CREATE TYPE call_priority AS ENUM ('low', 'normal', 'high');

-- Organizations table (optional, for multi-tenant)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    billing_plan TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id),
    full_name TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT,
    email TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call Templates
CREATE TABLE call_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    voice_id TEXT NOT NULL,
    initial_message TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    closing_message TEXT,
    extraction_schema JSONB DEFAULT '{}',
    max_duration_seconds INTEGER DEFAULT 300,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Calls
CREATE TABLE scheduled_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES call_templates(id) ON DELETE CASCADE,
    status call_status NOT NULL DEFAULT 'scheduled',
    priority call_priority NOT NULL DEFAULT 'normal',
    scheduled_at TIMESTAMPTZ NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call Records (each attempt)
CREATE TABLE call_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_call_id UUID NOT NULL REFERENCES scheduled_calls(id) ON DELETE CASCADE,
    provider_call_id TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    outcome call_outcome,
    recording_url TEXT,
    transcript JSONB DEFAULT '[]',
    raw_provider_data JSONB DEFAULT '{}',
    cost_telephony DECIMAL(10, 4) DEFAULT 0,
    cost_ai DECIMAL(10, 4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extracted Data
CREATE TABLE extracted_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_record_id UUID NOT NULL UNIQUE REFERENCES call_records(id) ON DELETE CASCADE,
    structured_data JSONB NOT NULL,
    confidence_score DECIMAL(3, 2),
    extraction_model TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Webhooks
CREATE TABLE user_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    secret TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Do Not Call List (TCPA compliance)
CREATE TABLE dnc_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL UNIQUE,
    reason TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dnc_list_phone ON dnc_list(phone);

-- ===================
-- PGMQ SETUP
-- ===================

-- Enable pgmq extension
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create queues for different job types
SELECT pgmq.create('call_queue');           -- For executing calls
SELECT pgmq.create('extraction_queue');      -- For post-call data extraction
SELECT pgmq.create('notification_queue');    -- For sending notifications
SELECT pgmq.create('scheduled_queue');       -- For scheduled/delayed jobs

-- Create a table to track scheduled jobs (for delayed execution)
CREATE TABLE scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_name TEXT NOT NULL,
    payload JSONB NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending, queued, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_jobs_pending ON scheduled_jobs(scheduled_for)
    WHERE status = 'pending';

-- ===================
-- PGMQ RPC WRAPPER FUNCTIONS
-- ===================
-- These allow calling pgmq from Supabase client via RPC

CREATE OR REPLACE FUNCTION pgmq_send(queue_name text, message jsonb)
RETURNS bigint AS $$
  SELECT pgmq.send(queue_name, message);
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION pgmq_send_delay(queue_name text, message jsonb, delay_seconds int)
RETURNS bigint AS $$
  SELECT pgmq.send(queue_name, message, delay_seconds);
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION pgmq_read(queue_name text, vt int, qty int)
RETURNS TABLE (
    msg_id bigint,
    read_ct int,
    enqueued_at timestamptz,
    vt timestamptz,
    message jsonb
) AS $$
  SELECT msg_id, read_ct, enqueued_at, vt, message
  FROM pgmq.read(queue_name, vt, qty);
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION pgmq_delete(queue_name text, msg_id bigint)
RETURNS boolean AS $$
  SELECT pgmq.delete(queue_name, msg_id);
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION pgmq_archive(queue_name text, msg_id bigint)
RETURNS boolean AS $$
  SELECT pgmq.archive(queue_name, msg_id);
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION pgmq_set_vt(queue_name text, msg_id bigint, vt_seconds int)
RETURNS TABLE (
    msg_id bigint,
    read_ct int,
    enqueued_at timestamptz,
    vt timestamptz,
    message jsonb
) AS $$
  SELECT msg_id, read_ct, enqueued_at, vt, message
  FROM pgmq.set_vt(queue_name, msg_id, vt_seconds);
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant execute to service role (for backend workers)
GRANT EXECUTE ON FUNCTION pgmq_send TO service_role;
GRANT EXECUTE ON FUNCTION pgmq_send_delay TO service_role;
GRANT EXECUTE ON FUNCTION pgmq_read TO service_role;
GRANT EXECUTE ON FUNCTION pgmq_delete TO service_role;
GRANT EXECUTE ON FUNCTION pgmq_archive TO service_role;
GRANT EXECUTE ON FUNCTION pgmq_set_vt TO service_role;

-- Indexes
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_call_templates_user_id ON call_templates(user_id);
CREATE INDEX idx_scheduled_calls_user_id ON scheduled_calls(user_id);
CREATE INDEX idx_scheduled_calls_status ON scheduled_calls(status);
CREATE INDEX idx_scheduled_calls_scheduled_at ON scheduled_calls(scheduled_at)
    WHERE status IN ('scheduled', 'queued');
CREATE INDEX idx_call_records_scheduled_call_id ON call_records(scheduled_call_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_call_templates_updated_at BEFORE UPDATE ON call_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_calls_updated_at BEFORE UPDATE ON scheduled_calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5.4 Pydantic Models (for API)

```python
# app/api/schemas/call.py

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID


class CallStatus(str, Enum):
    SCHEDULED = "scheduled"
    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class CallOutcome(str, Enum):
    SUCCESSFUL = "successful"
    NO_ANSWER = "no_answer"
    BUSY = "busy"
    VOICEMAIL = "voicemail"
    FAILED = "failed"
    HUMAN_HANGUP = "human_hangup"


class CallPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


class ScheduleCallRequest(BaseModel):
    contact_id: UUID
    template_id: UUID
    scheduled_at: datetime
    timezone: str = "America/New_York"
    priority: CallPriority = CallPriority.NORMAL
    max_retries: int = Field(default=3, ge=0, le=10)
    metadata: Optional[dict] = None


class ScheduledCallResponse(BaseModel):
    id: UUID
    status: CallStatus
    contact_id: UUID
    template_id: UUID
    scheduled_at: datetime
    priority: CallPriority
    retry_count: int
    max_retries: int
    created_at: datetime

    class Config:
        from_attributes = True


class CallRecordResponse(BaseModel):
    id: UUID
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    outcome: Optional[CallOutcome]
    recording_url: Optional[str]
    transcript: list[dict]
    extracted_data: Optional[dict]
    confidence_score: Optional[float]

    class Config:
        from_attributes = True
```

### 5.5 Repository Layer with Supabase

```python
# app/repositories/call_repo.py

from datetime import datetime
from typing import Optional
from uuid import UUID

from supabase import Client
from app.api.schemas.call import CallStatus, CallPriority
from app.core.supabase import get_supabase_admin_client


class CallRepository:
    """
    Repository for call-related database operations using Supabase.
    Uses service_role key to bypass RLS for backend operations.
    """

    def __init__(self, supabase: Optional[Client] = None):
        self.supabase = supabase or get_supabase_admin_client()

    async def create(
        self,
        user_id: UUID,
        contact_id: UUID,
        template_id: UUID,
        scheduled_at: datetime,
        priority: CallPriority = CallPriority.NORMAL,
        max_retries: int = 3,
        metadata: Optional[dict] = None,
    ) -> dict:
        """Create a new scheduled call."""
        data = {
            "user_id": str(user_id),
            "contact_id": str(contact_id),
            "template_id": str(template_id),
            "scheduled_at": scheduled_at.isoformat(),
            "priority": priority.value,
            "max_retries": max_retries,
            "metadata": metadata or {},
        }

        result = self.supabase.table("scheduled_calls").insert(data).execute()
        return result.data[0]

    async def get_by_id(self, call_id: UUID) -> Optional[dict]:
        """Get a scheduled call by ID."""
        result = (
            self.supabase.table("scheduled_calls")
            .select("*, contacts(*), call_templates(*)")
            .eq("id", str(call_id))
            .single()
            .execute()
        )
        return result.data

    async def get_with_records(self, call_id: UUID) -> Optional[dict]:
        """Get a scheduled call with all its call records."""
        result = (
            self.supabase.table("scheduled_calls")
            .select("*, call_records(*, extracted_data(*))")
            .eq("id", str(call_id))
            .single()
            .execute()
        )
        return result.data

    async def update(self, call_id: UUID, **kwargs) -> dict:
        """Update a scheduled call."""
        # Convert enums to values
        data = {}
        for key, value in kwargs.items():
            if hasattr(value, "value"):
                data[key] = value.value
            elif isinstance(value, datetime):
                data[key] = value.isoformat()
            elif isinstance(value, UUID):
                data[key] = str(value)
            else:
                data[key] = value

        result = (
            self.supabase.table("scheduled_calls")
            .update(data)
            .eq("id", str(call_id))
            .execute()
        )
        return result.data[0]

    async def list_by_user(
        self,
        user_id: UUID,
        status: Optional[CallStatus] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        """List calls for a user with optional status filter."""
        query = (
            self.supabase.table("scheduled_calls")
            .select("*, contacts(name, phone), call_templates(name)")
            .eq("user_id", str(user_id))
            .order("scheduled_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if status:
            query = query.eq("status", status.value)

        result = query.execute()
        return result.data

    async def create_record(
        self,
        scheduled_call_id: UUID,
        started_at: Optional[datetime] = None,
    ) -> dict:
        """Create a new call record."""
        data = {
            "scheduled_call_id": str(scheduled_call_id),
            "started_at": started_at.isoformat() if started_at else None,
        }

        result = self.supabase.table("call_records").insert(data).execute()
        return result.data[0]

    async def update_record(self, record_id: UUID, **kwargs) -> dict:
        """Update a call record."""
        data = {}
        for key, value in kwargs.items():
            if hasattr(value, "value"):
                data[key] = value.value
            elif isinstance(value, datetime):
                data[key] = value.isoformat()
            else:
                data[key] = value

        result = (
            self.supabase.table("call_records")
            .update(data)
            .eq("id", str(record_id))
            .execute()
        )
        return result.data[0]

    async def create_extracted_data(
        self,
        call_record_id: UUID,
        structured_data: dict,
        confidence_score: float,
        extraction_model: str,
    ) -> dict:
        """Create extracted data for a call record."""
        data = {
            "call_record_id": str(call_record_id),
            "structured_data": structured_data,
            "confidence_score": confidence_score,
            "extraction_model": extraction_model,
        }

        result = self.supabase.table("extracted_data").insert(data).execute()
        return result.data[0]

    async def get_pending_calls(self, before: datetime) -> list[dict]:
        """Get calls that are due to be executed."""
        result = (
            self.supabase.table("scheduled_calls")
            .select("*, contacts(*), call_templates(*)")
            .in_("status", ["scheduled", "queued"])
            .lte("scheduled_at", before.isoformat())
            .order("priority", desc=True)  # high priority first
            .order("scheduled_at")
            .limit(100)
            .execute()
        )
        return result.data
```

### 5.3 Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_scheduled_calls_user_status ON scheduled_calls(user_id, status);
CREATE INDEX idx_scheduled_calls_scheduled_at ON scheduled_calls(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_scheduled_calls_status ON scheduled_calls(status);
CREATE INDEX idx_call_records_scheduled_call ON call_records(scheduled_call_id);
CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);

-- For queue processing
CREATE INDEX idx_scheduled_calls_queue ON scheduled_calls(scheduled_at, priority, status)
  WHERE status IN ('scheduled', 'queued');
```

---

## 6. Core Services

### 6.1 Call Service

```python
# app/services/call_service.py

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from app.models.call import ScheduledCall, CallStatus, CallPriority
from app.repositories.call_repo import CallRepository
from app.services.telephony.base import TelephonyProvider
from app.workers.call_tasks import execute_call
from app.utils.exceptions import ValidationError, NotFoundError


class CallService:
    def __init__(
        self,
        call_repo: CallRepository,
        telephony: TelephonyProvider,
    ):
        self.call_repo = call_repo
        self.telephony = telephony

    async def schedule_call(
        self,
        user_id: UUID,
        contact_id: UUID,
        template_id: UUID,
        scheduled_at: datetime,
        priority: CallPriority = CallPriority.NORMAL,
        max_retries: int = 3,
        metadata: Optional[dict] = None,
    ) -> ScheduledCall:
        """Schedule a new call."""

        # Validation
        if scheduled_at < datetime.utcnow() + timedelta(minutes=1):
            raise ValidationError("Call must be scheduled at least 1 minute in the future")

        if scheduled_at > datetime.utcnow() + timedelta(days=30):
            raise ValidationError("Call cannot be scheduled more than 30 days in advance")

        # Create scheduled call record
        call = await self.call_repo.create(
            user_id=user_id,
            contact_id=contact_id,
            template_id=template_id,
            scheduled_at=scheduled_at,
            priority=priority,
            max_retries=max_retries,
            metadata=metadata or {},
        )

        # Schedule Celery task
        execute_call.apply_async(
            args=[str(call.id)],
            eta=scheduled_at,
        )

        return call

    async def cancel_call(self, user_id: UUID, call_id: UUID) -> ScheduledCall:
        """Cancel a scheduled call."""
        call = await self.call_repo.get_by_id(call_id)

        if not call or call.user_id != user_id:
            raise NotFoundError("Call not found")

        if call.status not in [CallStatus.SCHEDULED, CallStatus.QUEUED]:
            raise ValidationError(f"Cannot cancel call in {call.status} status")

        return await self.call_repo.update(call_id, status=CallStatus.CANCELLED)

    async def retry_call(self, user_id: UUID, call_id: UUID) -> ScheduledCall:
        """Retry a failed call."""
        call = await self.call_repo.get_by_id(call_id)

        if not call or call.user_id != user_id:
            raise NotFoundError("Call not found")

        if call.status != CallStatus.FAILED:
            raise ValidationError("Can only retry failed calls")

        # Schedule immediate retry
        call = await self.call_repo.update(
            call_id,
            status=CallStatus.SCHEDULED,
            scheduled_at=datetime.utcnow() + timedelta(seconds=30),
        )

        execute_call.apply_async(
            args=[str(call.id)],
            countdown=30,
        )

        return call

    async def get_call_status(self, user_id: UUID, call_id: UUID) -> dict:
        """Get detailed call status including any call records."""
        call = await self.call_repo.get_with_records(call_id)

        if not call or call.user_id != user_id:
            raise NotFoundError("Call not found")

        return {
            "id": call.id,
            "status": call.status,
            "scheduled_at": call.scheduled_at,
            "retry_count": call.retry_count,
            "records": [
                {
                    "id": r.id,
                    "started_at": r.started_at,
                    "ended_at": r.ended_at,
                    "outcome": r.outcome,
                    "duration_seconds": r.duration_seconds,
                }
                for r in call.call_records
            ],
        }
```

### 6.2 Telephony Provider Interface

```python
# app/services/telephony/base.py

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
from uuid import UUID


@dataclass
class CallConfig:
    phone_number: str
    voice_id: str
    initial_message: str
    questions: list[dict]
    closing_message: str
    max_duration_seconds: int
    webhook_url: str
    metadata: dict


@dataclass
class CallResult:
    provider_call_id: str
    status: str
    started_at: Optional[str]
    ended_at: Optional[str]
    duration_seconds: Optional[int]
    recording_url: Optional[str]
    transcript: list[dict]
    raw_data: dict


class TelephonyProvider(ABC):
    """Abstract base class for telephony providers."""

    @abstractmethod
    async def initiate_call(self, config: CallConfig) -> str:
        """
        Initiate an outbound call.
        Returns the provider's call ID.
        """
        pass

    @abstractmethod
    async def get_call_status(self, provider_call_id: str) -> CallResult:
        """Get the current status of a call."""
        pass

    @abstractmethod
    async def end_call(self, provider_call_id: str) -> bool:
        """Forcefully end an ongoing call."""
        pass

    @abstractmethod
    def parse_webhook(self, payload: dict) -> CallResult:
        """Parse incoming webhook data from the provider."""
        pass
```

### 6.3 Vapi.ai Implementation

```python
# app/services/telephony/vapi.py

import httpx
from app.services.telephony.base import TelephonyProvider, CallConfig, CallResult
from app.config import settings


class VapiProvider(TelephonyProvider):
    def __init__(self):
        self.api_key = settings.VAPI_API_KEY
        self.base_url = "https://api.vapi.ai"
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=30.0,
        )

    async def initiate_call(self, config: CallConfig) -> str:
        payload = {
            "phoneNumberId": settings.VAPI_PHONE_NUMBER_ID,
            "customer": {
                "number": config.phone_number,
            },
            "assistant": {
                "voice": {
                    "voiceId": config.voice_id,
                    "provider": "11labs",
                },
                "firstMessage": config.initial_message,
                "model": {
                    "provider": "openai",
                    "model": "gpt-4o",
                    "messages": self._build_system_prompt(config),
                },
                "endCallMessage": config.closing_message,
                "maxDurationSeconds": config.max_duration_seconds,
            },
            "serverUrl": config.webhook_url,
            "metadata": config.metadata,
        }

        response = await self.client.post("/call/phone", json=payload)
        response.raise_for_status()
        data = response.json()
        return data["id"]

    async def get_call_status(self, provider_call_id: str) -> CallResult:
        response = await self.client.get(f"/call/{provider_call_id}")
        response.raise_for_status()
        data = response.json()
        return self._parse_call_data(data)

    async def end_call(self, provider_call_id: str) -> bool:
        response = await self.client.post(f"/call/{provider_call_id}/stop")
        return response.status_code == 200

    def parse_webhook(self, payload: dict) -> CallResult:
        return self._parse_call_data(payload.get("call", payload))

    def _build_system_prompt(self, config: CallConfig) -> list[dict]:
        questions_text = "\n".join(
            f"- {q['question']}" for q in config.questions
        )
        return [
            {
                "role": "system",
                "content": f"""You are a helpful assistant making a phone call.
Your goal is to collect the following information:

{questions_text}

Be conversational and natural. If the person seems busy, offer to call back.
Do not be pushy. Thank them for their time at the end.""",
            }
        ]

    def _parse_call_data(self, data: dict) -> CallResult:
        return CallResult(
            provider_call_id=data.get("id"),
            status=data.get("status"),
            started_at=data.get("startedAt"),
            ended_at=data.get("endedAt"),
            duration_seconds=data.get("durationSeconds"),
            recording_url=data.get("recordingUrl"),
            transcript=data.get("messages", []),
            raw_data=data,
        )
```

### 6.4 Extraction Service

```python
# app/services/extraction_service.py

import json
from typing import Any
import openai
from app.config import settings


class ExtractionService:
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def extract_data(
        self,
        transcript: list[dict],
        extraction_schema: dict,
    ) -> tuple[dict, float]:
        """
        Extract structured data from call transcript.
        Returns (extracted_data, confidence_score).
        """

        # Format transcript for LLM
        transcript_text = self._format_transcript(transcript)

        # Build extraction prompt
        prompt = f"""Analyze the following phone call transcript and extract information according to the schema.

TRANSCRIPT:
{transcript_text}

EXTRACTION SCHEMA:
{json.dumps(extraction_schema, indent=2)}

Instructions:
1. Extract all requested fields from the transcript
2. If information is not mentioned, use null
3. Be precise and only include information explicitly stated
4. Provide a confidence score (0.0-1.0) for your extraction

Respond with valid JSON in this format:
{{
  "extracted": {{ ... your extracted data matching the schema ... }},
  "confidence": 0.XX,
  "reasoning": "Brief explanation of extraction decisions"
}}"""

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        result = json.loads(response.choices[0].message.content)
        return result["extracted"], result["confidence"]

    def _format_transcript(self, transcript: list[dict]) -> str:
        lines = []
        for entry in transcript:
            speaker = entry.get("speaker", "unknown").upper()
            text = entry.get("text", "")
            lines.append(f"{speaker}: {text}")
        return "\n".join(lines)
```

### 6.5 Notification Service

```python
# app/services/notification_service.py

import httpx
import hashlib
import hmac
import json
from datetime import datetime
from typing import Optional

from app.models.call import ScheduledCall, CallRecord, ExtractedData
from app.models.user import UserWebhook
from app.config import settings


class NotificationService:
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=10.0)

    async def notify_call_completed(
        self,
        call: ScheduledCall,
        record: CallRecord,
        extracted: ExtractedData,
        webhooks: list[UserWebhook],
    ) -> None:
        """Send notifications for completed call."""

        payload = self._build_payload(call, record, extracted)

        # Send to all active webhooks
        for webhook in webhooks:
            if webhook.is_active and "call.completed" in webhook.events:
                await self._send_webhook(webhook, "call.completed", payload)

        # Send email notification if enabled
        if call.user.settings.get("email_notifications"):
            await self._send_email(call.user.email, payload)

    async def _send_webhook(
        self,
        webhook: UserWebhook,
        event: str,
        payload: dict,
    ) -> bool:
        """Send webhook with signature."""

        body = json.dumps(payload)
        signature = self._sign_payload(body, webhook.secret)

        headers = {
            "Content-Type": "application/json",
            "X-RelayAI-Event": event,
            "X-RelayAI-Signature": signature,
            "X-RelayAI-Timestamp": datetime.utcnow().isoformat(),
        }

        try:
            response = await self.http_client.post(
                webhook.url,
                content=body,
                headers=headers,
            )
            return response.status_code < 400
        except Exception:
            return False

    def _sign_payload(self, payload: str, secret: str) -> str:
        return hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()

    def _build_payload(
        self,
        call: ScheduledCall,
        record: CallRecord,
        extracted: ExtractedData,
    ) -> dict:
        return {
            "event": "call.completed",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "call_id": str(call.id),
                "contact": {
                    "id": str(call.contact.id),
                    "name": call.contact.name,
                    "phone": call.contact.phone,
                },
                "outcome": record.outcome.value,
                "duration_seconds": record.duration_seconds,
                "extracted_data": extracted.structured_data,
                "confidence_score": float(extracted.confidence_score),
                "recording_url": record.recording_url,
                "metadata": call.metadata,
            },
        }

    async def _send_email(self, email: str, payload: dict) -> None:
        # Implementation using SendGrid/SES
        pass
```

---

## 7. Call Flow

### 7.1 Call Lifecycle State Machine

```
                    ┌──────────────────────────────────────────────────────────┐
                    │                                                          │
                    ▼                                                          │
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐   ┌───────────┐   │
│ SCHEDULED│──▶│  QUEUED  │──▶│IN_PROGRESS│──▶│ COMPLETED │   │  FAILED   │◀──┤
└──────────┘   └──────────┘   └──────────┘   └───────────┘   └───────────┘   │
     │              │              │                               │          │
     │              │              │                               │          │
     ▼              ▼              ▼                               │          │
┌──────────┐       │              │                               │          │
│CANCELLED │◀──────┴──────────────┘                               │          │
└──────────┘                                                      │          │
                                                                  │          │
                         ┌────────────────────────────────────────┘          │
                         │                                                    │
                         ▼                                                    │
                    ┌──────────┐                                              │
                    │  RETRY?  │──── retry_count < max_retries ──────────────┘
                    └──────────┘
                         │
                         │ retry_count >= max_retries
                         ▼
                    ┌──────────┐
                    │  FAILED  │ (final)
                    └──────────┘
```

### 7.2 Detailed Call Flow Sequence

```
┌────────┐     ┌─────────┐     ┌────────┐     ┌─────────┐     ┌────────┐     ┌────────┐
│  User  │     │   API   │     │  pgmq  │     │ Worker  │     │  Vapi  │     │ OpenAI │
└───┬────┘     └────┬────┘     └───┬────┘     └────┬────┘     └───┬────┘     └───┬────┘
    │               │              │               │              │              │
    │ POST /calls   │              │               │              │              │
    │──────────────▶│              │               │              │              │
    │               │              │               │              │              │
    │               │ Create       │               │              │              │
    │               │ ScheduledCall│               │              │              │
    │               │──────────────│               │              │              │
    │               │              │               │              │              │
    │               │ Enqueue job  │               │              │              │
    │               │─────────────▶│               │              │              │
    │               │              │               │              │              │
    │  201 Created  │              │               │              │              │
    │◀──────────────│              │               │              │              │
    │               │              │               │              │              │
    │               │              │  Poll queue   │              │              │
    │               │              │◀──────────────│              │              │
    │               │              │               │              │              │
    │               │              │  Message      │              │              │
    │               │              │──────────────▶│              │              │
    │               │              │               │              │              │
    │               │              │               │ initiate_call│              │
    │               │              │               │─────────────▶│              │              │
    │               │              │               │              │              │
    │               │              │               │ provider_id  │              │
    │               │              │               │◀─────────────│              │
    │               │              │               │              │              │
    │               │              │               │              │ Call person  │
    │               │              │               │              │─────────────▶│
    │               │              │               │              │              │
    │               │              │               │              │   [Conversation happens]
    │               │              │               │              │              │
    │               │              │               │ Webhook:     │              │
    │               │              │               │ call.ended   │              │
    │               │              │               │◀─────────────│              │
    │               │              │               │              │              │
    │               │              │ Enqueue       │              │              │
    │               │              │ extraction    │              │              │
    │               │              │◀──────────────│              │              │
    │               │              │               │              │              │
    │               │              │               │ Extract data │              │
    │               │              │               │─────────────────────────────▶│
    │               │              │               │              │              │
    │               │              │               │ Structured   │              │
    │               │              │               │ response     │              │
    │               │              │               │◀─────────────────────────────│
    │               │              │               │              │              │
    │               │              │ Enqueue       │              │              │
    │               │              │ notification  │              │              │
    │               │              │◀──────────────│              │              │
    │               │              │               │              │              │
    │ [Webhook/Email notification] │               │              │              │
    │◀─────────────────────────────────────────────│              │              │
    │               │              │               │              │              │
```

### 7.3 pgmq Queue Implementation

```python
# app/queue/client.py

import json
from typing import Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass

from app.core.supabase import get_supabase_admin_client


@dataclass
class QueueMessage:
    """Represents a message from pgmq."""
    msg_id: int
    read_ct: int
    enqueued_at: datetime
    vt: datetime  # visibility timeout
    message: dict


class PgmqClient:
    """
    Client for interacting with pgmq (Postgres Message Queue).
    Uses Supabase's PostgreSQL with the pgmq extension.
    """

    def __init__(self):
        self.supabase = get_supabase_admin_client()

    def send(self, queue_name: str, payload: dict) -> int:
        """
        Send a message to a queue.
        Returns the message ID.
        """
        result = self.supabase.rpc(
            "pgmq_send",
            {"queue_name": queue_name, "message": json.dumps(payload)}
        ).execute()
        return result.data

    def send_delayed(
        self,
        queue_name: str,
        payload: dict,
        delay_seconds: int
    ) -> int:
        """
        Send a message with a delay.
        The message won't be visible until the delay has passed.
        """
        result = self.supabase.rpc(
            "pgmq_send_delay",
            {
                "queue_name": queue_name,
                "message": json.dumps(payload),
                "delay": delay_seconds
            }
        ).execute()
        return result.data

    def read(
        self,
        queue_name: str,
        visibility_timeout: int = 30,
        batch_size: int = 1
    ) -> list[QueueMessage]:
        """
        Read messages from a queue.
        Messages become invisible for `visibility_timeout` seconds.
        """
        result = self.supabase.rpc(
            "pgmq_read",
            {
                "queue_name": queue_name,
                "vt": visibility_timeout,
                "qty": batch_size
            }
        ).execute()

        if not result.data:
            return []

        return [
            QueueMessage(
                msg_id=msg["msg_id"],
                read_ct=msg["read_ct"],
                enqueued_at=msg["enqueued_at"],
                vt=msg["vt"],
                message=msg["message"] if isinstance(msg["message"], dict)
                        else json.loads(msg["message"])
            )
            for msg in result.data
        ]

    def delete(self, queue_name: str, msg_id: int) -> bool:
        """Delete a message after successful processing."""
        result = self.supabase.rpc(
            "pgmq_delete",
            {"queue_name": queue_name, "msg_id": msg_id}
        ).execute()
        return result.data

    def archive(self, queue_name: str, msg_id: int) -> bool:
        """Archive a message (moves to archive table instead of deleting)."""
        result = self.supabase.rpc(
            "pgmq_archive",
            {"queue_name": queue_name, "msg_id": msg_id}
        ).execute()
        return result.data

    def set_vt(
        self,
        queue_name: str,
        msg_id: int,
        vt_seconds: int
    ) -> Optional[QueueMessage]:
        """
        Extend or change the visibility timeout of a message.
        Useful for long-running tasks.
        """
        result = self.supabase.rpc(
            "pgmq_set_vt",
            {
                "queue_name": queue_name,
                "msg_id": msg_id,
                "vt": vt_seconds
            }
        ).execute()
        return result.data


# SQL functions needed in Supabase (add to migrations)
"""
-- Create wrapper functions for pgmq that work with Supabase RPC

CREATE OR REPLACE FUNCTION pgmq_send(queue_name text, message text)
RETURNS bigint AS $$
  SELECT pgmq.send(queue_name, message::jsonb);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION pgmq_send_delay(queue_name text, message text, delay int)
RETURNS bigint AS $$
  SELECT pgmq.send(queue_name, message::jsonb, delay);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION pgmq_read(queue_name text, vt int, qty int)
RETURNS SETOF pgmq.message_record AS $$
  SELECT * FROM pgmq.read(queue_name, vt, qty);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION pgmq_delete(queue_name text, msg_id bigint)
RETURNS boolean AS $$
  SELECT pgmq.delete(queue_name, msg_id);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION pgmq_archive(queue_name text, msg_id bigint)
RETURNS boolean AS $$
  SELECT pgmq.archive(queue_name, msg_id);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION pgmq_set_vt(queue_name text, msg_id bigint, vt int)
RETURNS pgmq.message_record AS $$
  SELECT * FROM pgmq.set_vt(queue_name, msg_id, vt);
$$ LANGUAGE sql;
"""
```

### 7.4 Queue Consumer (Worker)

```python
# app/queue/consumer.py

import asyncio
import signal
import logging
from typing import Callable, Dict
from datetime import datetime

from app.queue.client import PgmqClient, QueueMessage
from app.config import settings

logger = logging.getLogger(__name__)


class QueueConsumer:
    """
    Worker that polls pgmq queues and processes messages.
    Run this as a separate process.
    """

    def __init__(self):
        self.client = PgmqClient()
        self.handlers: Dict[str, Callable] = {}
        self.running = False
        self.poll_interval = 1  # seconds

    def register_handler(self, queue_name: str, handler: Callable):
        """Register a handler function for a queue."""
        self.handlers[queue_name] = handler
        logger.info(f"Registered handler for queue: {queue_name}")

    async def process_message(
        self,
        queue_name: str,
        message: QueueMessage
    ) -> bool:
        """Process a single message."""
        handler = self.handlers.get(queue_name)
        if not handler:
            logger.error(f"No handler for queue: {queue_name}")
            return False

        try:
            logger.info(
                f"Processing message {message.msg_id} from {queue_name}"
            )

            # Call the handler
            await handler(message.message)

            # Delete message on success
            self.client.delete(queue_name, message.msg_id)
            logger.info(f"Completed message {message.msg_id}")
            return True

        except Exception as e:
            logger.error(
                f"Error processing message {message.msg_id}: {e}",
                exc_info=True
            )

            # Message will become visible again after VT expires
            # for automatic retry
            if message.read_ct >= 3:
                # Max retries reached, archive the message
                logger.warning(
                    f"Max retries reached for message {message.msg_id}, archiving"
                )
                self.client.archive(queue_name, message.msg_id)

            return False

    async def poll_queue(self, queue_name: str):
        """Poll a single queue for messages."""
        messages = self.client.read(
            queue_name,
            visibility_timeout=60,  # 60 seconds to process
            batch_size=5
        )

        for message in messages:
            await self.process_message(queue_name, message)

    async def run(self):
        """Main consumer loop."""
        self.running = True
        logger.info(f"Starting queue consumer for: {list(self.handlers.keys())}")

        while self.running:
            try:
                # Poll all registered queues
                for queue_name in self.handlers.keys():
                    await self.poll_queue(queue_name)

                # Brief sleep between poll cycles
                await asyncio.sleep(self.poll_interval)

            except Exception as e:
                logger.error(f"Error in consumer loop: {e}", exc_info=True)
                await asyncio.sleep(5)  # Back off on error

    def stop(self):
        """Stop the consumer gracefully."""
        logger.info("Stopping queue consumer...")
        self.running = False


# app/queue/handlers/call_handler.py

from datetime import datetime, timedelta
from uuid import UUID

from app.queue.client import PgmqClient
from app.repositories.call_repo import CallRepository
from app.services.telephony.vapi import VapiProvider
from app.api.schemas.call import CallStatus, CallOutcome
from app.config import settings


queue = PgmqClient()


async def handle_execute_call(payload: dict):
    """
    Handle call execution job.
    Payload: {"call_id": "uuid", "attempt": 1}
    """
    call_id = UUID(payload["call_id"])
    attempt = payload.get("attempt", 1)

    call_repo = CallRepository()
    telephony = VapiProvider()

    # Get the scheduled call
    call = await call_repo.get_by_id(call_id)

    if not call:
        raise ValueError(f"Call not found: {call_id}")

    if call["status"] == CallStatus.CANCELLED.value:
        return {"status": "cancelled"}

    # Update status to in_progress
    await call_repo.update(call_id, status=CallStatus.IN_PROGRESS)

    # Create call record
    record = await call_repo.create_record(
        scheduled_call_id=call_id,
        started_at=datetime.utcnow(),
    )

    try:
        # Build call config from template
        config = _build_call_config(call)

        # Initiate call with telephony provider
        provider_call_id = await telephony.initiate_call(config)

        # Update record with provider ID
        await call_repo.update_record(
            UUID(record["id"]),
            provider_call_id=provider_call_id,
        )

        return {"status": "initiated", "provider_call_id": provider_call_id}

    except Exception as e:
        # Schedule retry if attempts remaining
        if attempt < call["max_retries"]:
            delay = 60 * (2 ** attempt)  # Exponential backoff
            queue.send_delayed(
                "call_queue",
                {"call_id": str(call_id), "attempt": attempt + 1},
                delay_seconds=delay
            )
            await call_repo.update(call_id, status=CallStatus.SCHEDULED)
        else:
            await call_repo.update(call_id, status=CallStatus.FAILED)
            # Enqueue notification
            queue.send("notification_queue", {
                "type": "call_failed",
                "call_id": str(call_id),
                "error": str(e)
            })
        raise


async def handle_extraction(payload: dict):
    """
    Handle post-call data extraction.
    Payload: {"call_record_id": "uuid", "transcript": [...]}
    """
    from app.services.extraction_service import ExtractionService

    call_record_id = UUID(payload["call_record_id"])
    transcript = payload["transcript"]
    extraction_schema = payload["extraction_schema"]

    extraction = ExtractionService()
    call_repo = CallRepository()

    # Extract structured data
    extracted_data, confidence = await extraction.extract_data(
        transcript=transcript,
        extraction_schema=extraction_schema,
    )

    # Save extracted data
    await call_repo.create_extracted_data(
        call_record_id=call_record_id,
        structured_data=extracted_data,
        confidence_score=confidence,
        extraction_model="gpt-4o",
    )

    # Enqueue notification
    queue.send("notification_queue", {
        "type": "extraction_completed",
        "call_record_id": str(call_record_id),
        "data": extracted_data
    })


async def handle_notification(payload: dict):
    """
    Handle sending notifications.
    Payload: {"type": "call_completed", "call_id": "uuid", ...}
    """
    from app.services.notification_service import NotificationService

    notification = NotificationService()
    notification_type = payload["type"]

    if notification_type == "call_completed":
        await notification.notify_call_completed(payload)
    elif notification_type == "call_failed":
        await notification.notify_call_failed(payload)
    elif notification_type == "extraction_completed":
        await notification.notify_extraction_completed(payload)
```

### 7.5 Running the Worker

```python
# app/queue/worker.py (entrypoint)

import asyncio
import signal

from app.queue.consumer import QueueConsumer
from app.queue.handlers.call_handler import (
    handle_execute_call,
    handle_extraction,
    handle_notification,
)


async def main():
    consumer = QueueConsumer()

    # Register handlers
    consumer.register_handler("call_queue", handle_execute_call)
    consumer.register_handler("extraction_queue", handle_extraction)
    consumer.register_handler("notification_queue", handle_notification)

    # Handle shutdown signals
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, consumer.stop)

    # Run the consumer
    await consumer.run()


if __name__ == "__main__":
    asyncio.run(main())
```

```bash
# Run the worker
python -m app.queue.worker
```

### 7.6 Scheduling Calls (Producer Side)

```python
# app/services/call_service.py (updated for pgmq)

from datetime import datetime, timedelta
from uuid import UUID

from app.queue.client import PgmqClient
from app.repositories.call_repo import CallRepository
from app.api.schemas.call import CallPriority


class CallService:
    def __init__(self):
        self.call_repo = CallRepository()
        self.queue = PgmqClient()

    async def schedule_call(
        self,
        user_id: UUID,
        contact_id: UUID,
        template_id: UUID,
        scheduled_at: datetime,
        priority: CallPriority = CallPriority.NORMAL,
        max_retries: int = 3,
        metadata: dict = None,
    ) -> dict:
        """Schedule a new call."""

        # Validation
        now = datetime.utcnow()
        if scheduled_at < now + timedelta(minutes=1):
            raise ValueError("Call must be scheduled at least 1 minute ahead")

        # Create scheduled call record
        call = await self.call_repo.create(
            user_id=user_id,
            contact_id=contact_id,
            template_id=template_id,
            scheduled_at=scheduled_at,
            priority=priority,
            max_retries=max_retries,
            metadata=metadata or {},
        )

        # Calculate delay in seconds
        delay_seconds = int((scheduled_at - now).total_seconds())

        # Enqueue with delay
        self.queue.send_delayed(
            "call_queue",
            {"call_id": call["id"], "attempt": 1},
            delay_seconds=delay_seconds
        )

        return call
```

---

## 8. Error Handling & Retry Logic

### 8.1 Error Categories

| Category | Examples | Handling |
|----------|----------|----------|
| **Transient** | Network timeout, rate limit | Auto-retry with backoff |
| **Provider** | Vapi error, invalid phone | Retry with fallback provider |
| **User** | Invalid template, bad config | Fail fast, notify user |
| **System** | DB error, OOM | Alert, graceful degradation |

### 8.2 Retry Strategy

```python
# Retry configuration
RETRY_CONFIG = {
    "no_answer": {
        "max_retries": 3,
        "delays": [300, 1800, 7200],  # 5min, 30min, 2hr
    },
    "busy": {
        "max_retries": 3,
        "delays": [60, 300, 900],  # 1min, 5min, 15min
    },
    "voicemail": {
        "max_retries": 1,
        "delays": [3600],  # 1hr
    },
    "failed": {
        "max_retries": 2,
        "delays": [60, 300],
    },
}
```

### 8.3 Circuit Breaker

```python
# app/utils/circuit_breaker.py

from datetime import datetime, timedelta
from enum import Enum


class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered


class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED

    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpen("Service unavailable")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        self.failures = 0
        self.state = CircuitState.CLOSED

    def _on_failure(self):
        self.failures += 1
        self.last_failure_time = datetime.utcnow()
        if self.failures >= self.failure_threshold:
            self.state = CircuitState.OPEN

    def _should_attempt_reset(self):
        if self.last_failure_time is None:
            return True
        return datetime.utcnow() > self.last_failure_time + timedelta(
            seconds=self.recovery_timeout
        )
```

---

## 9. Security

### 9.1 Authentication & Authorization (Supabase)

```python
# app/core/auth.py

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from jose import jwt, JWTError
from pydantic import BaseModel
from typing import Optional

from app.config import settings
from app.core.supabase import get_supabase_client


security = HTTPBearer()


class AuthUser(BaseModel):
    """Authenticated user from Supabase JWT."""
    id: str
    email: Optional[str]
    phone: Optional[str]
    role: str
    app_metadata: dict
    user_metadata: dict


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthUser:
    """
    Verify Supabase JWT and extract user information.
    The JWT is signed by Supabase and contains user claims.
    """
    token = credentials.credentials

    try:
        # Verify JWT using Supabase JWT secret
        # Supabase uses HS256 with the JWT secret from project settings
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no subject")

        return AuthUser(
            id=user_id,
            email=payload.get("email"),
            phone=payload.get("phone"),
            role=payload.get("role", "authenticated"),
            app_metadata=payload.get("app_metadata", {}),
            user_metadata=payload.get("user_metadata", {}),
        )

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_supabase_client_for_user(
    user: AuthUser = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Get a Supabase client authenticated as the current user.
    This enables Row Level Security (RLS) policies.
    """
    from supabase import create_client, Client

    # Create client with user's JWT for RLS
    supabase: Client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
    )

    # Set the auth token to enable RLS
    supabase.auth.set_session(credentials.credentials, "")

    return supabase
```

### 9.2 Row Level Security (RLS) Policies

Supabase RLS ensures users can only access their own data at the database level:

```sql
-- supabase/migrations/20260101000003_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_data ENABLE ROW LEVEL SECURITY;

-- Contacts: Users can only access their own contacts
CREATE POLICY "Users can view own contacts"
    ON contacts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own contacts"
    ON contacts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
    ON contacts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
    ON contacts FOR DELETE
    USING (auth.uid() = user_id);

-- Call Templates: Users can only access their own templates
CREATE POLICY "Users can view own templates"
    ON call_templates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
    ON call_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
    ON call_templates FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
    ON call_templates FOR DELETE
    USING (auth.uid() = user_id);

-- Scheduled Calls: Users can only access their own calls
CREATE POLICY "Users can view own scheduled calls"
    ON scheduled_calls FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scheduled calls"
    ON scheduled_calls FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled calls"
    ON scheduled_calls FOR UPDATE
    USING (auth.uid() = user_id);

-- Call Records: Access through scheduled_calls relationship
CREATE POLICY "Users can view own call records"
    ON call_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM scheduled_calls
            WHERE scheduled_calls.id = call_records.scheduled_call_id
            AND scheduled_calls.user_id = auth.uid()
        )
    );

-- Service role bypass for backend workers
-- Workers use the service_role key which bypasses RLS
```

### 9.3 Rate Limiting

```python
# app/api/middleware/rate_limit.py

from fastapi import Request, HTTPException
import redis.asyncio as redis
from app.config import settings


class RateLimiter:
    """
    Rate limiting using Redis.
    Note: Supabase doesn't provide built-in rate limiting,
    so we still use Redis for this.
    """
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL)
        self.limits = {
            "default": (100, 60),      # 100 requests per minute
            "calls": (10, 60),          # 10 call schedules per minute
            "bulk": (5, 60),            # 5 bulk operations per minute
        }

    async def check(
        self,
        key: str,
        limit_type: str = "default",
    ) -> bool:
        limit, window = self.limits.get(limit_type, self.limits["default"])

        current = await self.redis.incr(f"rate:{limit_type}:{key}")
        if current == 1:
            await self.redis.expire(f"rate:{limit_type}:{key}", window)

        if current > limit:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {limit} requests per {window}s",
            )

        return True
```

### 9.4 Supabase Storage for Recordings

```python
# app/core/storage.py

from supabase import Client
from app.config import settings
from app.core.supabase import get_supabase_admin_client


class StorageService:
    """Handle file uploads to Supabase Storage."""

    BUCKET_NAME = "call-recordings"

    def __init__(self):
        self.supabase: Client = get_supabase_admin_client()

    async def upload_recording(
        self,
        call_id: str,
        file_data: bytes,
        content_type: str = "audio/mpeg",
    ) -> str:
        """
        Upload a call recording to Supabase Storage.
        Returns the public URL.
        """
        file_path = f"recordings/{call_id}.mp3"

        # Upload to Supabase Storage
        result = self.supabase.storage.from_(self.BUCKET_NAME).upload(
            path=file_path,
            file=file_data,
            file_options={"content-type": content_type},
        )

        return self.get_recording_url(call_id)

    def get_recording_url(self, call_id: str, expires_in: int = 3600) -> str:
        """
        Get a signed URL for a recording.
        Default expiry is 1 hour.
        """
        file_path = f"recordings/{call_id}.mp3"

        result = self.supabase.storage.from_(self.BUCKET_NAME).create_signed_url(
            path=file_path,
            expires_in=expires_in,
        )

        return result.get("signedURL")

    async def delete_recording(self, call_id: str) -> bool:
        """Delete a recording from storage."""
        file_path = f"recordings/{call_id}.mp3"

        result = self.supabase.storage.from_(self.BUCKET_NAME).remove([file_path])
        return True
```

**Storage Bucket Setup (SQL):**

```sql
-- Create storage bucket for recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', false);

-- RLS policy: Users can only access their own recordings
CREATE POLICY "Users can view own recordings"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'call-recordings'
    AND (storage.foldername(name))[1] = 'recordings'
    AND EXISTS (
        SELECT 1 FROM call_records cr
        JOIN scheduled_calls sc ON sc.id = cr.scheduled_call_id
        WHERE cr.id::text = (storage.filename(name))::text
        AND sc.user_id = auth.uid()
    )
);
```

### 9.5 Supabase Realtime for Live Updates

Supabase Realtime enables pushing call status updates to the frontend instantly:

```python
# Frontend (JavaScript/TypeScript) - Subscribe to call updates
"""
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Subscribe to changes on scheduled_calls for current user
const channel = supabase
  .channel('call-updates')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'scheduled_calls',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      console.log('Call updated:', payload)
      // Update UI with new call status
      if (payload.eventType === 'UPDATE') {
        updateCallStatus(payload.new.id, payload.new.status)
      }
    }
  )
  .subscribe()

// Cleanup on unmount
return () => {
  supabase.removeChannel(channel)
}
"""
```

**Enable Realtime on Tables:**

```sql
-- Enable realtime for scheduled_calls table
ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_calls;

-- Optionally enable for call_records too
ALTER PUBLICATION supabase_realtime ADD TABLE call_records;
```

**Use Cases:**
- Live call status updates in dashboard
- Real-time notification when call completes
- Progress indicators during active calls

---

### 9.6 TCPA Compliance

```python
# app/services/compliance_service.py

from datetime import datetime, time
import pytz
from app.core.supabase import get_supabase_admin_client


class ComplianceService:
    """
    Ensure calls comply with TCPA regulations.
    """

    # Calling windows by timezone (local time)
    CALLING_HOURS = {
        "start": time(8, 0),   # 8 AM
        "end": time(21, 0),    # 9 PM
    }

    def __init__(self):
        self.supabase = get_supabase_admin_client()

    def can_call_now(self, phone: str, timezone: str) -> tuple[bool, str]:
        """Check if we can legally call this number right now."""

        tz = pytz.timezone(timezone)
        local_time = datetime.now(tz).time()

        if not (self.CALLING_HOURS["start"] <= local_time <= self.CALLING_HOURS["end"]):
            return False, f"Outside calling hours ({self.CALLING_HOURS['start']}-{self.CALLING_HOURS['end']} local time)"

        # Check DNC list stored in Supabase
        if self._is_on_dnc_list(phone):
            return False, "Number is on Do Not Call list"

        return True, "OK"

    def _is_on_dnc_list(self, phone: str) -> bool:
        """Check against internal DNC list in database."""
        result = (
            self.supabase.table("dnc_list")
            .select("phone")
            .eq("phone", phone)
            .execute()
        )
        return len(result.data) > 0

    async def add_to_dnc_list(self, phone: str, reason: str = "user_request") -> None:
        """Add a phone number to the Do Not Call list."""
        self.supabase.table("dnc_list").upsert({
            "phone": phone,
            "reason": reason,
            "added_at": datetime.utcnow().isoformat(),
        }).execute()
```

---

## 10. Scalability

### 10.1 Horizontal Scaling Strategy

```
                         Load Balancer
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
      ┌─────────┐       ┌─────────┐       ┌─────────┐
      │ API #1  │       │ API #2  │       │ API #3  │
      └─────────┘       └─────────┘       └─────────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Redis Cluster  │
                    │ (Queue + Cache) │
                    └─────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
      ┌─────────┐       ┌─────────┐       ┌─────────┐
      │Worker #1│       │Worker #2│       │Worker #3│
      └─────────┘       └─────────┘       └─────────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │ (Primary + Read │
                    │    Replicas)    │
                    └─────────────────┘
```

### 10.2 Performance Targets

| Component | Target | Strategy |
|-----------|--------|----------|
| API Latency | <200ms p95 | Caching, connection pooling |
| DB Queries | <50ms p95 | Indexes, read replicas |
| Call Initiation | <30s from scheduled | Priority queues |
| Concurrent Calls | 1000+ | Worker auto-scaling |

### 10.3 Caching Strategy

```python
# Cache layers
CACHE_CONFIG = {
    # Frequently accessed, rarely changed
    "templates": {
        "ttl": 3600,  # 1 hour
        "key": "template:{id}",
    },
    "contacts": {
        "ttl": 300,   # 5 minutes
        "key": "contact:{id}",
    },
    # User session data
    "user_settings": {
        "ttl": 1800,  # 30 minutes
        "key": "user:{id}:settings",
    },
    # Rate limiting
    "rate_limit": {
        "ttl": 60,    # 1 minute
        "key": "rate:{type}:{user_id}",
    },
}
```

---

## 11. Monitoring & Observability

### 11.1 Key Metrics

```python
# app/utils/metrics.py

from prometheus_client import Counter, Histogram, Gauge


# Call metrics
calls_scheduled = Counter(
    "relayai_calls_scheduled_total",
    "Total calls scheduled",
    ["priority"]
)

calls_completed = Counter(
    "relayai_calls_completed_total",
    "Total calls completed",
    ["outcome"]
)

call_duration = Histogram(
    "relayai_call_duration_seconds",
    "Call duration in seconds",
    buckets=[30, 60, 120, 300, 600]
)

# Queue metrics
queue_depth = Gauge(
    "relayai_queue_depth",
    "Number of calls in queue",
    ["status"]
)

# API metrics
api_request_duration = Histogram(
    "relayai_api_request_duration_seconds",
    "API request duration",
    ["endpoint", "method"]
)
```

### 11.2 Logging Structure

```python
# Structured logging format
{
    "timestamp": "2026-01-23T15:30:00Z",
    "level": "INFO",
    "service": "relay-backend",
    "trace_id": "abc123",
    "span_id": "def456",
    "user_id": "user_123",
    "call_id": "call_456",
    "message": "Call initiated successfully",
    "extra": {
        "provider": "vapi",
        "provider_call_id": "vapi_789",
        "phone": "+1234***890"  # Masked
    }
}
```

### 11.3 Alerting Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | Error rate >5% for 5min | Critical |
| Queue Backlog | Queue depth >1000 for 10min | Warning |
| API Latency | p95 >500ms for 5min | Warning |
| Provider Failure | Circuit breaker open | Critical |
| Low Call Success | Success rate <90% for 1hr | Warning |

---

## 12. Dependencies

### 12.1 Python Dependencies

```toml
# pyproject.toml

[project]
name = "relay-backend"
version = "0.1.0"
requires-python = ">=3.11"

dependencies = [
    # Web framework
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",

    # Supabase (includes pgmq support)
    "supabase>=2.3.0",
    "python-jose[cryptography]>=3.3.0",  # JWT verification

    # Redis (optional - only for rate limiting cache)
    "redis>=5.0.0",

    # HTTP client
    "httpx>=0.26.0",

    # AI
    "openai>=1.10.0",

    # Utilities
    "python-multipart>=0.0.6",
    "phonenumbers>=8.13.0",
    "pytz>=2024.1",

    # Monitoring
    "prometheus-client>=0.19.0",
    "structlog>=24.1.0",
    "sentry-sdk[fastapi]>=1.40.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.1.0",
    "httpx>=0.26.0",
    "factory-boy>=3.3.0",
    "ruff>=0.1.0",
    "mypy>=1.8.0",
    "supabase-cli>=1.0.0",  # For local development
]
```

### 12.2 External Services

| Service | Purpose | Fallback |
|---------|---------|----------|
| **Supabase** | Database, Auth, Storage, Realtime | - |
| Vapi.ai | Primary telephony | Retell.ai |
| OpenAI | LLM extraction | Claude API |
| Redis | Cache + Queue | Upstash Redis |
| Resend | Email notifications | Supabase Edge Functions |

---

## Appendix A: Environment Variables

```bash
# .env.example

# Application
APP_ENV=development
DEBUG=true
SECRET_KEY=your-secret-key-here

# ===================
# SUPABASE CONFIG
# ===================
# Get these from: Supabase Dashboard > Project Settings > API

# Project URL (e.g., https://xxxx.supabase.co)
SUPABASE_URL=https://your-project.supabase.co

# Public anon key (safe for client-side, respects RLS)
SUPABASE_ANON_KEY=your-anon-key

# Service role key (bypasses RLS - NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secret (for verifying Supabase JWTs)
# Get from: Supabase Dashboard > Project Settings > API > JWT Secret
SUPABASE_JWT_SECRET=your-jwt-secret

# ===================
# REDIS (optional - only for rate limiting)
# ===================
# REDIS_URL=redis://localhost:6379/0  # Uncomment if using rate limiting

# ===================
# TELEPHONY
# ===================
VAPI_API_KEY=your-vapi-key
VAPI_PHONE_NUMBER_ID=your-phone-id

# Webhook URL for telephony callbacks
WEBHOOK_BASE_URL=https://your-api.com/api/v1/webhooks

# ===================
# AI
# ===================
OPENAI_API_KEY=your-openai-key

# ===================
# NOTIFICATIONS
# ===================
RESEND_API_KEY=your-resend-key
FROM_EMAIL=noreply@relayai.com

# ===================
# MONITORING
# ===================
SENTRY_DSN=your-sentry-dsn
```

### Supabase Local Development

For local development, use the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Start local Supabase (includes Postgres, Auth, Storage, etc.)
supabase start

# The CLI will output local credentials:
# API URL: http://localhost:54321
# anon key: eyJ...
# service_role key: eyJ...

# Apply migrations
supabase db push

# Stop local Supabase
supabase stop
```

Local `.env` for development:

```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
```

---

## Appendix B: Docker Compose

```yaml
# docker/docker-compose.yml
#
# Note: For local development, Supabase provides its own Docker setup.
# Run `supabase start` to get Postgres (with pgmq), Auth, Storage, etc.
# This compose file is for the FastAPI backend services only.

version: "3.8"

services:
  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "8000:8000"
    environment:
      # Supabase (use local or cloud)
      - SUPABASE_URL=${SUPABASE_URL:-http://host.docker.internal:54321}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
      # Other
      - VAPI_API_KEY=${VAPI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ../app:/app/app
    extra_hosts:
      - "host.docker.internal:host-gateway"

  # pgmq Queue Worker (polls queues and processes jobs)
  worker:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    command: python -m app.queue.worker
    environment:
      - SUPABASE_URL=${SUPABASE_URL:-http://host.docker.internal:54321}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - VAPI_API_KEY=${VAPI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    # Scale workers as needed
    deploy:
      replicas: 2

  # Optional: Redis for rate limiting only
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    profiles:
      - rate-limiting  # Only start if rate limiting is needed
```

### Full Local Development Setup

```bash
# Terminal 1: Start Supabase (includes Postgres with pgmq)
supabase start

# Apply migrations (creates pgmq queues)
supabase db push

# Terminal 2: Start FastAPI API server
uvicorn app.main:app --reload --port 8000

# Terminal 3: Start queue worker
python -m app.queue.worker

# Or use Docker Compose for everything
docker-compose up
```

### Scaling Workers

Since pgmq uses Postgres visibility timeouts, you can safely run multiple workers:

```bash
# Run 4 worker instances
docker-compose up --scale worker=4
```

Each worker will only process messages it has claimed, ensuring no duplicate processing.

---

**Document Status:** Draft
**Last Updated:** January 2026
**Authors:** RelayAI Engineering Team
