from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class ContactCreate(BaseModel):
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    metadata: dict = Field(default_factory=dict)

class ContactUpdate(BaseModel):
    phone: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    timezone: Optional[str] = None
    metadata: Optional[dict] = None

class ContactResponse(BaseModel):
    id: UUID
    user_id: UUID
    phone: str
    name: Optional[str]
    email: Optional[str]
    timezone: Optional[str]
    metadata: Optional[dict]
    created_at: datetime
    updated_at: datetime


class BulkContactCreate(BaseModel):
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    timezone: str = "Asia/Kolkata"


class BulkImportRequest(BaseModel):
    contacts: list[BulkContactCreate]
    skip_duplicates: bool = True


class BulkImportResult(BaseModel):
    total: int
    imported: int
    skipped: int
    errors: list[dict]