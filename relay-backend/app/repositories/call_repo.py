from typing import Optional
from uuid import UUID
from datetime import datetime

from app.core.supabase import get_supabase_admin_client

class CallRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client()
        self.scheduled_calls_table = "scheduled_calls"
        self.call_records_table = "call_records"

    async def create(self, user_id: UUID, data: dict) -> dict:
        data['user_id'] = str(user_id)
        if 'scheduled_at' in data and isinstance(data['scheduled_at'], datetime):
            data['scheduled_at'] = data['scheduled_at'].isoformat()
        result = self.supabase.table(self.scheduled_calls_table).insert(data).execute()
        return result.data[0]
    
    async def get_by_id(self, call_id: UUID, user_id: UUID) -> Optional[dict]:
        result = (
            self.supabase.table(self.scheduled_calls_table)
            .select('*, contacts(*), call_templates(*)')
            .eq('id', str(call_id))
            .eq('user_id', str(user_id))
            .execute()
        )
        return result.data[0] if result.data else None
    
    async def get_by_id_admin(self, call_id: UUID) -> Optional[dict]:
        """Get call by ID without user check (for workers only)"""
        result = (
            self.supabase.table('scheduled_calls')
            .select('*, contacts(*), call_templates(*)')
            .eq('id', str(call_id))
            .execute()
        )
        return result.data[0] if result.data else None
    
    async def list_by_user(self, user_id: UUID, status: Optional[str] = None, limit: int = 50, offset: int = 0) -> list[dict]:
        query = (
            self.supabase.table(self.scheduled_calls_table)
            .select('*, contacts(name, phone), call_templates(name)')
            .eq('user_id', str(user_id))
            .order('scheduled_at', desc=True)
            .range(offset, offset + limit - 1)
        )
        if status:
            query = query.eq('status', status)
        result = query.execute()
        return result.data
    
    async def update(self, call_id: UUID, data: dict) -> Optional[dict]:
        data = {k:v for k, v in data.items() if v is not None}
        if "scheduled_at" in data and isinstance(data['scheduled_at'], datetime):
            data['scheduled_at'] = data['scheduled_at'].isoformat()
        result = (
            self.supabase.table(self.scheduled_calls_table)
            .update(data)
            .eq('id', str(call_id))
            .execute()
        )
        return result.data[0] if result.data else None

    async def cancel(self, call_id: UUID, user_id: UUID) -> Optional[dict]:
        result = (
            self.supabase.table(self.scheduled_calls_table)
            .update({'status': "cancelled"})
            .eq('id', str(call_id))
            .eq('user_id', str(user_id))
            .in_('status', ['scheduled', 'queued'])
            .execute()
        )
        return result.data[0] if result.data else None
    
    async def create_record(self, scheduled_call_id: UUID, data: dict) -> dict:
        data['scheduled_call_id'] = str(scheduled_call_id)
        result = self.supabase.table(self.call_records_table).insert(data).execute()
        return result.data[0]
    
    async def update_record(self, record_id: UUID, data: dict) -> Optional[dict]:
        data = {k:v for k, v in data.items() if v is not None}
        result = (
            self.supabase.table(self.call_records_table)
            .update(data)
            .eq('id', str(record_id))
            .execute()
        )
        return result.data[0] if result.data else None
    
    async def get_records(self, call_id: UUID) -> list[dict]:
        result = (
            self.supabase.table(self.call_records_table)
            .select('*, extracted_data(*)')
            .eq('scheduled_call_id', str(call_id))
            .order('created_at', desc=True)
            .execute()
        )
        return result.data
    
    async def create_extracted_data(self, call_record_id: UUID, data: dict) -> dict:
        data['call_record_id'] = str(call_record_id)
        result = self.supabase.table('extracted_data').insert(data).execute()
        return result.data[0]
