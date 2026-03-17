# exam_guardrail/core.py
# Core initializer — the single entry point for the middleware.
#
# Usage:
#   from fastapi import FastAPI
#   from exam_guardrail import init_guardrail, GuardrailConfig
#
#   app = FastAPI()
#   config = GuardrailConfig(supabase_url="...", supabase_key="...")
#   init_guardrail(app, config)
#
# This mounts ALL proctoring routes, CORS, and the health endpoint.
# The native agent scanner runs as ASGI middleware — just like CORSMiddleware.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from exam_guardrail.config import GuardrailConfig, set_config
from exam_guardrail.middleware import NativeAgentMiddleware
from exam_guardrail.routes import auth, events, sessions, submissions, students, questions, exams, reports, native_agent


def init_guardrail(app: FastAPI, config: GuardrailConfig = None):
    """
    Initialize the ExamGuardrail middleware on a FastAPI application.

    This single call:
      1. Sets the global configuration
      2. Adds CORS middleware
      3. Mounts all proctoring API routes (/api/*)
      4. Adds a /health endpoint

    Args:
        app:    Your FastAPI application instance.
        config: GuardrailConfig with Supabase/Anthropic credentials.
                If None, reads from environment/.env.
    """
    if config is None:
        config = GuardrailConfig()

    set_config(config)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_credentials=False,
        allow_methods=['*'],
        allow_headers=['*']
    )

    # Mount all middleware routes
    app.include_router(events.router)
    app.include_router(sessions.router)
    app.include_router(native_agent.router)

    if not config.monitoring_only:
        app.include_router(auth.router)
        app.include_router(submissions.router)
        app.include_router(students.router)
        app.include_router(questions.router)
        app.include_router(exams.router)
        app.include_router(reports.router)

    # Health endpoint
    @app.get('/health')
    async def guardrail_health():
        return {'status': 'ok', 'middleware': 'exam_guardrail', 'version': '1.0.0'}

    # Native agent middleware — runs background scanner like CORSMiddleware
    app.add_middleware(
        NativeAgentMiddleware,
        block=config.native_agent_block,
        scan_interval=config.native_agent_interval,
        enabled=config.native_agent_enabled,
    )

    print(f"[ExamGuardrail] Middleware initialized — {'monitoring-only' if config.monitoring_only else 'full'} mode.")
    return app
