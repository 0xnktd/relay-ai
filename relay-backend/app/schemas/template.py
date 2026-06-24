from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class QuestionSchema(BaseModel):
    id: str
    question: str
    type: str = "open_ended" # open_ended, yes_no, multiple_choice
    required: bool = True
    follow_up: Optional[dict] = None

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    voice_id: str
    initial_message: str
    questions: list[QuestionSchema] = Field(default_factory=list)
    closing_message: Optional[str]
    extraction_schema: dict = Field(default_factory=dict)
    max_duration_seconds: int = 300

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    voice_id: Optional[str] = None
    initial_message: Optional[str] = None
    questions: list[QuestionSchema] = None
    closing_message: Optional[str] = None
    extraction_schema: Optional[dict] = None
    max_duration_seconds: Optional[int] = None   

class TemplateResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str]
    voice_id: str
    initial_message: str
    questions: list[dict]
    closing_message: Optional[str]
    extraction_schema: dict
    max_duration_seconds: int
    created_at: datetime
    updated_at: datetime