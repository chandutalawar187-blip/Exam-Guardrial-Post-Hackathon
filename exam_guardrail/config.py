# exam_guardrail/config.py
# Centralized configuration for the guardrail middleware.

from pydantic_settings import BaseSettings
from typing import Optional


class GuardrailConfig(BaseSettings):
    """
    Configuration for the ExamGuardrail middleware.
    Can be populated from environment variables or passed directly.
    """
    supabase_url: str = ""
    supabase_key: str = ""
    anthropic_api_key: str = ""
    admin_username: str = "admin"
    admin_password: str = "admin"

    # Proctoring thresholds
    session_expiry_hours: int = 2
    compounding_penalty_window_minutes: int = 5
    compounding_penalty_threshold: int = 3
    compounding_penalty_extra: int = 10

    # Severity score deltas
    severity_critical: int = -15
    severity_high: int = -10
    severity_medium: int = -5
    severity_low: int = -2

    # CORS
    cors_origins: list = ["*"]

    # Monitoring-only mode — skips database routes, only uses events + sessions
    monitoring_only: bool = False

    # Native agent — auto-start background scanner when server starts
    native_agent_enabled: bool = True
    native_agent_block: bool = True
    native_agent_interval: int = 3

    class Config:
        env_file = ".env"
        extra = "ignore"


# Global config instance — set by init_guardrail()
_config: Optional[GuardrailConfig] = None


def get_config() -> GuardrailConfig:
    if _config is None:
        raise RuntimeError("ExamGuardrail not initialized. Call init_guardrail(app, config) first.")
    return _config


def set_config(config: GuardrailConfig):
    global _config
    _config = config
