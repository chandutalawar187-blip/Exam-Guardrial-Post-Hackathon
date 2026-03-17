# exam_guardrail — Exam Proctoring Middleware
# Drop-in middleware for any FastAPI-based exam platform.
#
# Usage:
#   from exam_guardrail import init_guardrail, GuardrailConfig
#
#   config = GuardrailConfig(
#       supabase_url="...",
#       supabase_key="...",
#       anthropic_api_key="...",       # optional
#       admin_username="admin",
#       admin_password="secret",
#   )
#   init_guardrail(app, config)
#
# This mounts all proctoring routes under /api/* and adds CORS middleware.

from exam_guardrail.config import GuardrailConfig
from exam_guardrail.core import init_guardrail
from exam_guardrail.middleware import NativeAgentMiddleware

__version__ = "1.0.0"
__all__ = ["init_guardrail", "GuardrailConfig", "NativeAgentMiddleware", "NativeAgent", "__version__"]

# Lazy import for optional native agent
def __getattr__(name):
    if name == 'NativeAgent':
        from exam_guardrail.services.scanners.agent_runner import NativeAgent
        return NativeAgent
    raise AttributeError(f'module {__name__!r} has no attribute {name!r}')

__all__ = ["init_guardrail", "GuardrailConfig"]
__version__ = "1.0.0"
