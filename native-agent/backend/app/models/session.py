# backend/app/models/session.py

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ExamSessionResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    org_id: str
    exam_name: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    status: str = 'active'
    credibility_score: int = 100
    verdict: str = 'CLEAR'
    platform: Optional[str] = None
    device_type: Optional[str] = None
