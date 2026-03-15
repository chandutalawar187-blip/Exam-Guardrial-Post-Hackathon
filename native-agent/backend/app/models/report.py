# backend/app/models/report.py

from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class RedFlag(BaseModel):
    timestamp: str
    event: str
    severity: str
    explanation: str


class CredibilityReport(BaseModel):
    id: Optional[str] = None
    session_id: str
    verdict: str
    executive_summary: Optional[str] = None
    red_flags: Optional[List[RedFlag]] = []
    recommendation: Optional[str] = None
    confidence: float = 0.0
    generated_by: str = 'claude-sonnet-4-6'
    pdf_url: Optional[str] = None
    created_at: Optional[datetime] = None
