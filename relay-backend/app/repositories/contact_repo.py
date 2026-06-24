from typing import Optional
from uuid import UUID

from app.core.supabase import get_supabase_admin_client

class ContactRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client()
        self.table = "contacts"

    async def create(self, user_id: UUID, data: dict) -> dict:
        data['user_id'] = str(user_id)
        result = self.supabase.table(self.table).insert(data).execute()
        return result.data[0]
    
    async def get_by_id(self, contact_id: UUID, user_id: UUID) -> Optional[dict]:
        result = (
            self.supabase.table(self.table)
            .select('*')
            .eq('id', str(contact_id))
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
    
    async def update(self, contact_id: UUID, user_id: UUID, data: dict) -> Optional[dict]:
        result = (
            self.supabase.table(self.table)
            .update(data)
            .eq('user_id', str(user_id))
            .eq('id', str(contact_id))
            .execute()
        )

        return result.data[0] if result.data else None
    
    async def delete(self, contact_id: UUID, user_id: UUID) -> bool:
        result = (
            self.supabase.table(self.table)
            .delete()
            .eq('id', str(contact_id))
            .eq('user_id', str(user_id))
            .execute()
        )
        return len(result.data) > 0

    async def bulk_create(self, user_id: UUID, contacts: list[dict]) -> list[dict]:
        """Create multiple contacts in a single operation."""
        for contact in contacts:
            contact['user_id'] = str(user_id)
        result = self.supabase.table(self.table).insert(contacts).execute()
        return result.data

    async def get_by_phone(self, phone: str, user_id: UUID) -> Optional[dict]:
        """Get contact by phone number."""
        result = (
            self.supabase.table(self.table)
            .select('*')
            .eq('phone', phone)
            .eq('user_id', str(user_id))
            .execute()
        )
        return result.data[0] if result.data else None