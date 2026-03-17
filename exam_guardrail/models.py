# exam_guardrail/models.py
# Pydantic models shared across the middleware.

from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class BehavioralEvent(BaseModel):
    model_config = {"extra": "ignore"}

    session_id: str
    event_type: str       # TAB_SWITCH | COPY_PASTE | IDLE_DETECTED | FACE_NOT_DETECTED | ...
    severity: str = "MEDIUM"  # CRITICAL | HIGH | MEDIUM | LOW
    score_delta: int = -5
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


class AnswerSubmission(BaseModel):
    session_id: str
    candidate_id: str
    question_id: str
    question_text: str
    student_answer: str
    time_to_answer_seconds: int


class ExamSubmission(BaseModel):
    studentUid: str
    sessionId: str
    answers: Dict[str, str]


class AIParams(BaseModel):
    topic: str
    difficulty: str
    count: int
    exam_name: str = "Exam"
