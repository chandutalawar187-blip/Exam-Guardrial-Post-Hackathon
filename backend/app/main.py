import sys
import os
# Add project root and backend root to path so exam_guardrail package is importable
_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
_project_root = os.path.abspath(os.path.join(_backend_dir, '..'))
for p in [_backend_dir, _project_root]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI
from exam_guardrail import init_guardrail, GuardrailConfig

app = FastAPI(title='ExamGuardrail', version='2.0.0')

# Load config from .env and initialize the middleware
config = GuardrailConfig()
init_guardrail(app, config)
