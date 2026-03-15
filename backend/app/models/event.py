# backend/app/models/event.py

from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class BehavioralEvent(BaseModel):
    model_config = {"extra": "ignore"}

    session_id: str
    event_type: str       # TAB_SWITCH | COPY_PASTE | IDLE_DETECTED | ...
    severity: str = "MEDIUM"  # CRITICAL | HIGH | MEDIUM | LOW
    score_delta: int = -5 # Negative integer (e.g. -10, -35)
    platform: str = "web"
    device_type: str = "laptop"
    metadata: Optional[Dict[str, Any]] = {}
    layer: Optional[str] = "L1"
    timestamp: Optional[datetime] = None


class ExamSession(BaseModel):
    student_id: str
    student_name: Optional[str] = None
    org_id: Optional[str] = None
    exam_name: Optional[str] = None
    platform: Optional[str] = None
    device_type: Optional[str] = None
