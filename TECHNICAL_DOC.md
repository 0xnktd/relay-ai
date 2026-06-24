# RelayAI Backend - Technical Documentation

**Version:** 1.0
**Last Updated:** January 2026

---

## 1. Overview

RelayAI is an AI-powered call scheduling and information collection platform. It enables users to define conversational templates, schedule automated outbound phone calls to contacts, and receive structured extracted data from those conversations.

The backend is responsible for managing contacts, call templates, call scheduling, queue-based execution, voice AI orchestration, transcript extraction, and webhook handling for real-time call event processing.

### 1.1 Tech Stack

| Component         | Technology                        |
| ----------------- | --------------------------------- |
| Framework         | FastAPI                           |
| Language          | Python 3.11                       |
| Database          | PostgreSQL (Supabase-managed)     |
| Message Queue     | pgmq (PostgreSQL-native)          |
| Authentication    | Supabase Auth (JWT-based)         |
| Voice AI Provider | VAPI                              |
| LLM Provider      | OpenAI (GPT-4o-mini)             |
| HTTP Client       | httpx (async)                     |
| Validation        | Pydantic v2                       |
| Containerization  | Docker                            |
| Hosting           | Railway (API + Worker)            |

---

## 2. System Architecture

The backend is split into two independently deployed services that share the same codebase:

1. **API Server** — A FastAPI application that handles HTTP requests from the frontend, authenticates users, performs CRUD operations, schedules calls into the queue, and receives webhooks from VAPI.

2. **Worker (Consumer)** — A long-running process that continuously polls message queues and executes background tasks: placing calls via VAPI, extracting data from transcripts via OpenAI, and sending notifications.

Both services connect to the same Supabase PostgreSQL database and pgmq instance. The API server communicates with the worker exclusively through message queues — there is no direct inter-service communication.

### 2.1 High-Level Architecture

```
┌──────────────┐         ┌───────────────────────────┐
│   Frontend   │────────>│       API Server           │
│   (Next.js)  │<────────│  (FastAPI + Uvicorn)       │
└──────────────┘         │                             │
                         │  - Auth verification        │
                         │  - CRUD operations          │
                         │  - Call scheduling          │
                         │  - Webhook ingestion        │
                         └──────────┬──────────────────┘
                                    │
                                    │ enqueue / read
                                    ▼
                         ┌───────────────────────────┐
                         │   Supabase PostgreSQL      │
                         │                             │
                         │  - Application tables       │
                         │  - pgmq message queues      │
                         │  - Row Level Security       │
                         └──────────┬──────────────────┘
                                    │
                                    │ poll / process
                                    ▼
                         ┌───────────────────────────┐
                         │       Worker Process       │
                         │   (Queue Consumer)         │
                         │                             │
                         │  - Call execution           │
                         │  - Transcript extraction    │
                         │  - Notifications            │
                         └──────────┬──────────────────┘
                                    │
                      ┌─────────────┼─────────────┐
                      ▼             ▼             ▼
               ┌───────────┐ ┌───────────┐ ┌───────────┐
               │   VAPI    │ │  OpenAI   │ │  Email /  │
               │ Voice AI  │ │ GPT-4o-m  │ │  Webhooks │
               └───────────┘ └───────────┘ └───────────┘
```

---

## 3. Authentication & Authorization

Authentication is handled by Supabase Auth. The frontend obtains a JWT after user login, and every API request includes this token in the `Authorization: Bearer` header.

### 3.1 Token Verification

The API server verifies JWTs using a dual-algorithm approach:

1. **HS256 (primary)** — The token is verified using a shared symmetric secret (`SUPABASE_JWT_SECRET`). This is the default for most Supabase projects and is the faster verification path.

2. **ES256 (fallback)** — If HS256 verification fails, the server fetches the project's JSON Web Key Set (JWKS) from Supabase's well-known endpoint and verifies using asymmetric ES256 keys. This handles newer Supabase projects that use asymmetric signing.

On successful verification, the JWT claims (`sub`, `email`, `phone`, `role`) are extracted into an authenticated user context that is injected into all protected endpoints.

### 3.2 Data Isolation

All database queries in the API layer are scoped to the authenticated user's ID. Every read, update, and delete operation includes a `user_id` filter, ensuring strict tenant isolation at the application level. The admin Supabase client (using the service role key) is used by the backend to bypass Row Level Security, since auth is enforced at the API layer.

---

## 4. Data Model

The database consists of five core tables with the following relationships:

```
contacts ──────────┐
                    ├──> scheduled_calls ──> call_records ──> extracted_data
call_templates ────┘
```

### 4.1 Contacts

Stores contact information for call recipients. Each contact belongs to a single user. Phone numbers are stored in E.164 international format. Contacts can carry arbitrary metadata as a JSON object.

### 4.2 Call Templates

Defines the structure and behavior of a call. A template includes:

- **Voice configuration** — Which AI voice to use (e.g., nova, alloy, echo)
- **Opening message** — The first thing the AI says when the call connects
- **Questions** — An ordered list of questions the AI should ask, each with a type (open-ended, yes/no, multiple choice) and a required flag
- **Closing message** — What the AI says before ending the call
- **Extraction schema** — Custom fields to extract beyond the questions
- **Duration limit** — Maximum call length in seconds (default: 300)

Templates are reusable across multiple calls and contacts.

### 4.3 Scheduled Calls

Represents a call to be made. Links a contact to a template with a specific scheduled time. Tracks execution state through a status field and includes retry configuration (max retries, current retry count).

**Status values:** `scheduled` → `queued` → `in_progress` → `completed` or `failed` or `cancelled`

**Priority levels:** low, normal, high

### 4.4 Call Records

Each execution attempt of a scheduled call creates a record. A single scheduled call can have multiple records if retries occur. Records capture:

- Provider-assigned call ID (from VAPI)
- Start and end timestamps
- Duration in seconds
- Call outcome (successful, no_answer, busy, voicemail, failed, human_hangup)
- Full transcript as an array of speaker/text/timestamp entries
- Recording URL (if available)

### 4.5 Extracted Data

Stores the structured output from AI-powered transcript analysis. Linked to a call record. Contains:

- **Structured data** — Answers to template questions (with per-answer confidence scores and source quotes), a summary, sentiment analysis, key points, and follow-up recommendations
- **Overall confidence score** — Average confidence across all extracted answers
- **Extraction model** — Which LLM model was used

---

## 5. API Design

All endpoints are versioned under `/api/v1`. Every endpoint except health check and webhooks requires JWT authentication.

### 5.1 Contacts

Full CRUD operations for managing contacts. Includes a bulk import endpoint that accepts a list of contacts, validates and normalizes phone numbers (defaulting to +91 country code if none provided), checks for duplicates by phone number, and returns a detailed result with imported/skipped/error counts.

### 5.2 Call Templates

Full CRUD operations for creating and managing reusable call templates. Templates define the entire conversational structure including AI voice, questions to ask, and what data to extract.

### 5.3 Calls

- **Scheduling** — Accepts a contact ID, template ID, and scheduled time. If the scheduled time is in the past or immediate, the call is enqueued for instant execution. Future calls are enqueued with a delay matching the time difference.
- **Listing** — Returns all user calls with optional status filtering and pagination. Includes joined contact and template names for display.
- **Detail view** — Returns the full call information with all attempt records and extracted data.
- **Cancellation** — Cancels a call only if it's still in `scheduled` or `queued` status.

### 5.4 Webhooks

A public endpoint that receives lifecycle events from VAPI during and after a call. Handles three event types:

- **call-started** — Records the call start time
- **end-of-call-report** — Processes the final transcript, calculates duration, determines outcome, updates records, and enqueues transcript extraction if the call was successful
- **hang** — Records early termination and maps the disconnect reason to an outcome

---

## 6. Call Lifecycle

The call lifecycle spans multiple services and external systems:

### 6.1 Scheduling

When a user schedules a call, the API server inserts a record into `scheduled_calls` and enqueues a message to the `call_queue`. For future-dated calls, pgmq's delayed message feature is used so the message only becomes visible at the scheduled time.

### 6.2 Execution

The worker process picks up the message from the call queue, fetches the call details (including the associated contact and template), updates the status to `in_progress`, and creates a `call_record` entry.

If VAPI is configured, the worker builds an assistant configuration from the template — translating the template's questions into a system prompt, selecting the specified voice, configuring the transcriber (Deepgram Nova 2), and setting the webhook callback URL. It then sends a request to VAPI to initiate the outbound call.

If VAPI is not configured, the system runs in simulation mode for testing purposes — generating a fake transcript and completing the full pipeline including extraction.

### 6.3 Call in Progress

Once VAPI initiates the call, the actual phone conversation happens entirely on VAPI's infrastructure. VAPI sends webhook events back to the API server as the call progresses and upon completion.

When the end-of-call report arrives, the webhook handler:
- Extracts the full conversation transcript from the VAPI payload
- Calculates the call duration from start/end timestamps
- Maps VAPI's disconnect reason to an internal outcome (e.g., `assistant-ended-call` maps to `successful`, `customer-did-not-answer` maps to `no_answer`)
- Updates the call record and call status
- Enqueues a message to the extraction queue if the call was successful

### 6.4 Data Extraction

The worker picks up the extraction message, which includes the transcript and the template's questions and extraction schema. It sends this to OpenAI's GPT-4o-mini with a structured prompt requesting JSON output containing:

- Answers to each template question with confidence scores (0.0–1.0) and source quotes from the transcript
- A 2–3 sentence call summary
- Sentiment classification (positive, neutral, negative)
- Key discussion points
- Whether a follow-up call is recommended and why

The model is configured with low temperature (0.1) and JSON response mode for consistent, deterministic extraction. Results are stored in the `extracted_data` table.

### 6.5 Retry Logic

If a call fails (VAPI error, network issue, etc.), the system applies exponential backoff:

- After attempt 1 fails → retry in 2 minutes
- After attempt 2 fails → retry in 4 minutes
- After attempt 3 fails → retry in 8 minutes

Each retry creates a new delayed message in the call queue. The retry count is tracked on the scheduled call record. Once the maximum retry count is exceeded, the call is permanently marked as failed.

---

## 7. Message Queue System

The system uses pgmq — a message queue implemented as a PostgreSQL extension. Since the application already uses PostgreSQL via Supabase, this eliminates the need for separate queue infrastructure like Redis, RabbitMQ, or SQS.

### 7.1 Queues

| Queue                | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `call_queue`         | Pending calls to be executed via VAPI                |
| `extraction_queue`   | Completed call transcripts awaiting AI analysis      |
| `notification_queue` | User notifications (reserved for future use)         |

### 7.2 Message Processing

Messages are read with a **visibility timeout** of 60 seconds. Once read, a message becomes invisible to other consumers for that duration. If the consumer successfully processes the message, it is deleted from the queue. If the consumer crashes or fails before deletion, the message automatically becomes visible again after the timeout expires.

Messages are read in batches of 5 per queue per polling cycle. The consumer polls all queues sequentially in a loop with a 1-second sleep interval between cycles.

### 7.3 Dead Letter Handling

If a message has been read 3 or more times (tracked by the `read_ct` field) without successful processing, it is archived rather than retried. Archived messages are moved to a separate PostgreSQL table for later inspection and debugging, preventing poison messages from blocking the queue indefinitely.

### 7.4 Delayed Messages

pgmq supports delayed message delivery natively. When a call is scheduled for a future time, the message is sent with a delay equal to the time difference. The message only becomes visible to consumers when the delay expires, eliminating the need for a separate scheduler service.

---

## 8. External Service Integrations

### 8.1 VAPI (Voice AI)

VAPI provides the telephony and conversational AI infrastructure. The integration involves:

- **Outbound call creation** — The worker sends a POST request to VAPI's API with the phone number, assistant configuration (LLM model, voice, system prompt, transcriber settings), and metadata containing internal IDs for correlation.
- **Webhook reception** — VAPI sends real-time events back to the API server's webhook endpoint as the call progresses and completes. Internal call and record IDs are passed through VAPI's metadata field for correlation.
- **Voice selection** — Templates map to OpenAI TTS voices available through VAPI: alloy, echo, fable, onyx, nova, and shimmer.
- **Transcription** — VAPI uses Deepgram Nova 2 for real-time speech-to-text during calls.

### 8.2 OpenAI (Extraction)

OpenAI's GPT-4o-mini is used for post-call transcript analysis. The service:

- Formats the raw transcript into a readable conversation format
- Constructs a prompt that includes the transcript, the template's questions (with their IDs and types), and any custom extraction fields
- Requests a JSON-structured response containing answers, confidence scores, summary, sentiment, and follow-up recommendations
- Handles failures gracefully by storing a fallback response with error details

A separate summarization capability exists for generating brief call summaries independently of the full extraction pipeline.

---

## 9. Deployment Architecture

### 9.1 Services

Both services are containerized with Docker and deployed to Railway:

| Service    | Entry Point          | Networking          | Health Check  |
| ---------- | -------------------- | ------------------- | ------------- |
| API Server | Uvicorn (FastAPI)    | Public domain       | `GET /health` |
| Worker     | Python module runner | No public endpoint  | None          |

Both containers share the same base image (Python 3.11 slim), install identical dependencies, and copy the same application code. They differ only in the startup command — the API server runs Uvicorn while the worker runs the queue consumer module.

### 9.2 Configuration

All configuration is managed through environment variables. Required variables include Supabase connection credentials and JWT secret. Optional variables control VAPI integration, OpenAI extraction, webhook URLs, and CORS origins. Settings are loaded once at process startup and cached for the lifetime of the process.

### 9.3 Security Considerations

- Containers run as a non-root user to limit blast radius of potential container escapes
- CORS is configured to only allow requests from specified frontend origins
- The Supabase service role key (which bypasses RLS) is never exposed to the frontend
- JWT tokens are verified on every authenticated request

---

## 10. Error Handling

| Scenario                           | Behavior                                                    |
| ---------------------------------- | ----------------------------------------------------------- |
| Invalid or expired JWT             | 401 response, request rejected                              |
| Resource not found                 | 404 response                                                |
| Auth service unreachable           | 503 response                                                |
| VAPI call initiation failure       | Call retried with exponential backoff up to max retry limit  |
| VAPI not configured                | System enters simulation mode, pipeline runs with fake data |
| OpenAI not configured              | Extraction skipped, placeholder data stored                 |
| OpenAI extraction failure          | Error logged, fallback response stored with error details   |
| Message processing failure         | Message becomes visible again after timeout for re-processing |
| Repeated message failure (3+ reads)| Message archived to dead letter table                       |
| Webhook without correlation IDs    | Event logged and acknowledged without processing            |
| Invalid phone in bulk import       | Contact skipped, error details included in response         |
| Database unavailable               | Unhandled — all operations fail with 500 responses          |
