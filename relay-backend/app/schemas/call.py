from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from enum import Enum

class CallStatus(str, Enum):
    SCHEDULED = "scheduled"
    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class CallPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"

class CallOutcome(str, Enum):
    SUCCESSFUL = "successful"
    NO_ANSWER = "no_answer"
    BUSY = "busy"
    VOICEMAIL = "voicemail"
    FAILED = "failed"
    HUMAN_HANGUP = "human_hangup"

class ScheduleCallRequest(BaseModel):
    contact_id: UUID
    template_id: UUID
    scheduled_at: datetime
    priority: CallPriority = CallPriority.NORMAL
    max_retries: int = Field(default=3, ge=0, le=10)
    metadata: dict = Field(default_factory=dict)

class ScheduledCallResponse(BaseModel):
    id: UUID
    user_id: UUID
    contact_id: UUID
    template_id: UUID
    status: CallStatus
    priority: CallPriority
    scheduled_at: datetime
    retry_count: int
    max_retries: int
    metadata: dict
    created_at: datetime

class CallRecordResponse(BaseModel):
    id: UUID
    scheduled_call_id: UUID
    provider_call_id: Optional[str]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    outcome: Optional[CallOutcome]
    recording_url: Optional[str]
    transcript: list[dict]
    created_at: datetime

class CallDetailResponse(BaseModel):
    call: ScheduledCallResponse
    records: list[CallRecordResponse] = Field(default_factory=list)
    extracted_data: Optional[dict] = None