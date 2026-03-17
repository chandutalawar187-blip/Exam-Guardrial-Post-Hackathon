# exam_guardrail/db.py
# Database client — wraps Supabase.

from supabase import create_client
from exam_guardrail.config import get_config

_client = None


def get_db():
    global _client
    if _client is None:
        cfg = get_config()
        _client = create_client(cfg.supabase_url, cfg.supabase_key)
    return _client


def reset_db():
    global _client
    _client = None
