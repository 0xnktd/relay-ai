from functools import lru_cache
from supabase import create_client, Client
from app.config import get_settings

@lru_cache()
def get_supabase_admin_client() -> Client:
    """
    Supabase client with secret key.
    Bypass RLS - use for backend/worker operations

    :return: Supabase client
    :rtype: Client
    """
    settings = get_settings()
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SECRET_KEY
    )

def get_supabase_client() -> Client:
    """
    Supabase client with publishable key.
    Use with user JWT for RLS-enabled queries.
    """
    settings = get_settings()
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_PUBLISHABLE_KEY
    )