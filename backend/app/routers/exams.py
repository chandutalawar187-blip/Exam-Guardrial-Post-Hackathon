# backend/app/routers/exams.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid

from app.services.claude_analyzer import generate_exam_questions
from app.db.supabase_client import get_db

router = APIRouter(prefix='/api', tags=['exams'])


class AIParams(BaseModel):
    topic: str
    difficulty: str
    count: int
    exam_name: str = "Exam"


@router.post("/exams/generate-questions")
async def generate_questions_api(params: AIParams):
    try:
        questions = await generate_exam_questions(
            topic=params.topic,
            difficulty=params.difficulty,
            question_count=params.count,
            exam_name=params.exam_name
        )
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Generation failed: {str(e)}")


@router.get("/exams/{exam_id}/status")
async def get_exam_status(exam_id: str):
    return {"status": "published"}


@router.post("/exams/{exam_id}/students/generate")
async def generate_exam_students(exam_id: str, payload: dict):
    count = payload.get("count", 30)
    credentials = []
    for _ in range(count):
        student_uid = f"STU-{str(uuid.uuid4())[:8].upper()}"
        plain_password = str(uuid.uuid4())[:8]
        credentials.append({
            "student_uid": student_uid,
            "plain_password": plain_password,
            "exam_id": exam_id
        })
    return {"credentials": credentials}


@router.get("/exams/list")
async def list_exams():
    """List all distinct exams with their subject codes and question count."""
    try:
        db = get_db()
        result = db.table('exam_questions').select('exam_name, subject_code, start_time, end_time').execute()
        # Aggregate unique exams
        exams = {}
        for row in result.data:
            key = row['exam_name']
            if key not in exams:
                exams[key] = {
                    'exam_name': row['exam_name'],
                    'subject_code': row.get('subject_code', ''),
                    'start_time': row.get('start_time'),
                    'end_time': row.get('end_time'),
                    'question_count': 0
                }
            exams[key]['question_count'] += 1
        return list(exams.values())
    except Exception as e:
        print(f'[exams] list error: {e}')
        return []
