# backend/app/db/supabase_client.py

from supabase import create_client, Client
from app.config import settings

_client: Client = None


def get_db() -> Client:
    global _client
    if _client is None:
        url = settings.supabase_url
        key = settings.supabase_key
        if not url or not key:
            raise Exception('SUPABASE_URL and SUPABASE_KEY must be set in .env')
        _client = create_client(url, key)
    return _client
