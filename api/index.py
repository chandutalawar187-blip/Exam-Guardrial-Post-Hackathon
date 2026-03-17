"""
Vercel serverless handler for FastAPI + exam_guardrail
This exports the FastAPI app for use as a Vercel serverless function.
"""

import sys
import os

# Add parent directories to path for imports
_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_current_dir)
for p in [_current_dir, _project_root, os.path.join(_project_root, 'backend')]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI
from exam_guardrail import init_guardrail, GuardrailConfig
from fastapi.middleware.wsgi import WSGIMiddleware
import uvicorn

app = FastAPI(title='ExamGuardrail', version='2.0.0')

# Load config from environment variables
# On Vercel, you'll set these in Project Settings > Environment Variables
config = GuardrailConfig()
init_guardrail(app, config)
