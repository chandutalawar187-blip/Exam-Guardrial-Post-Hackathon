"""
Vercel serverless handler for FastAPI + exam_guardrail
This exports the FastAPI `app` object as the ASGI handler for Vercel Python functions.

Environment variables are set in the Vercel dashboard under:
  Project Settings → Environment Variables
Required:
  SUPABASE_URL, SUPABASE_KEY, ADMIN_USERNAME, ADMIN_PASSWORD
Optional:
  ANTHROPIC_API_KEY
"""

import sys
import os

# Add project root to sys.path so exam_guardrail package is importable
_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_current_dir)
for p in [_current_dir, _project_root]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from exam_guardrail import init_guardrail, GuardrailConfig
import os

# Create the FastAPI app — Vercel detects `app` as the ASGI handler
app = FastAPI(title="ExamGuardrail", version="2.0.0")

# Load config from Vercel environment variables
# native_agent_enabled=False — scanning is done by the desktop app on the student's machine,
# not on the Vercel server. The /api/native-agent/* routes still work for heartbeat/status.
config = GuardrailConfig(native_agent_enabled=False)
init_guardrail(app, config)


@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    """
    Lightweight keep-alive endpoint.
    Ping this with UptimeRobot every 5 minutes to prevent
    Supabase free-tier cold starts.
    """
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if not url or not key:
            raise ValueError("Supabase credentials not configured")

        client = create_client(url, key)
        # Minimal query — just enough to wake the connection pool
        client.table("exam_sessions").select("id").limit(1).execute()

        return JSONResponse({"ok": True, "message": "Database awake"})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=503)
