from typing import Optional
from uuid import UUID

from app.core.supabase import get_supabase_admin_client

class TemplateRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client()
        self.table = "call_templates"
    
    async def create(self, user_id: UUID, data: dict) -> dict:
        data['user_id'] = str(user_id)
        result = self.supabase.table(self.table).insert(data).execute()
        return result.data[0]
    
    async def get_by_id(self, template_id: UUID, user_id: UUID) -> Optional[dict]:
        result = (
            self.supabase.table(self.table)
            .select('*')
            .eq('id', str(template_id))
            .eq('user_id', str(user_id))
            .execute()
        )
        return result.data[0] if result.data else None
    
    async def list_by_user(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[dict]:
        result = (
            self.supabase.table(self.table)
            .select('*')
            .eq('user_id', str(user_id))
            .order('created_at', desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data
    
    async def update(self, tempalte_id: UUID, user_id: UUID, data: dict) -> Optional[dict]:
        data = {k:v for k, v in data.items() if v is not None}
        result = (
            self.supabase.table(self.table)
            .update(data)
            .eq('id', str(tempalte_id))
            .eq('user_id', str(user_id))
            .execute()
        )
        return result.data[0] if result.data else None
    
    async def delete(self, template_id: UUID, user_id: UUID) -> bool:
        result = (
            self.supabase.table(self.table)
            .delete()
            .eq('id', str(template_id))
            .eq('user_id', str(user_id))
            .execute()
        )
        return len(result.data) > 0