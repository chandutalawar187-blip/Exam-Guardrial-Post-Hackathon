# backend/app/models/event.py

from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class BehavioralEvent(BaseModel):
    session_id: str
    event_type: str       # TAB_SWITCH | KEYBOARD_HIJACK | IDLE_DETECTED | ...
    severity: str         # CRITICAL | HIGH | MEDIUM | LOW
    score_delta: int      # Negative integer (e.g. -10, -35)
    platform: str         # windows | macos | android | ios | chromeos
    device_type: str      # laptop | tablet | phone
    metadata: Optional[Dict[str, Any]] = {}
    timestamp: Optional[datetime] = None


class ExamSession(BaseModel):
    student_id: str
    student_name: Optional[str] = None
    org_id: str
    exam_name: Optional[str] = None
    platform: Optional[str] = None
    device_type: Optional[str] = None
