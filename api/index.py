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
from exam_guardrail import init_guardrail, GuardrailConfig

# Create the FastAPI app — Vercel detects `app` as the ASGI handler
app = FastAPI(title="ExamGuardrail", version="2.0.0")

# Load config from Vercel environment variables
config = GuardrailConfig()
init_guardrail(app, config)
