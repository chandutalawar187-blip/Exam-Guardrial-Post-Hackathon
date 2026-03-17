# exam_guardrail/routes/submissions.py
# Exam submission & answer scoring middleware routes.

from fastapi import APIRouter
from exam_guardrail.models import AnswerSubmission, ExamSubmission
from exam_guardrail.services.ai_agents import score_answer_naturalness
from exam_guardrail.db import get_db
import datetime
import uuid

router = APIRouter(prefix='/api', tags=['guardrail-submissions'])


@router.post("/answers")
async def submit_single_answer(data: AnswerSubmission):
    db = get_db()

    db.table('answers').insert({
        'session_id': data.session_id,
        'question_id': data.question_id,
        'answer_text': data.student_answer,
        'time_taken': data.time_to_answer_seconds
    }).execute()

    scoring_result = await score_answer_naturalness(
        session_id=data.session_id,
        candidate_id=data.candidate_id,
        question_id=data.question_id,
        question_text=data.question_text,
        student_answer=data.student_answer,
        time_to_answer_seconds=data.time_to_answer_seconds
    )

    db.table('answer_scores').insert({
        'session_id': data.session_id,
        'question_id': data.question_id,
        'ai_probability': scoring_result.get('ai_probability', 0.0),
        'verdict': scoring_result.get('verdict', 'Human'),
        'flag_for_review': scoring_result.get('flag_for_review', False),
        'signals_detected': scoring_result.get('signals_detected', [])
    }).execute()

    return {"success": True, "verdict": scoring_result.get('verdict')}


@router.post("/student/exam/submit")
async def submit_exam(data: ExamSubmission):
    db = get_db()
    db.table('exam_sessions').update({
        'status': 'SUBMITTED',
        'submitted_at': datetime.datetime.now().isoformat()
    }).eq('id', data.sessionId).execute()

    session = db.table('exam_sessions').select('exam_name').eq('id', data.sessionId).execute()
    exam_name = session.data[0]['exam_name'] if session.data else 'unknown'

    token = str(uuid.uuid4())
    try:
        db.table('exam_tokens').insert({
            'student_id': data.studentUid,
            'exam_name': exam_name,
            'token': token,
            'session_id': data.sessionId
        }).execute()
    except Exception as e:
        print(f'[guardrail:submissions] Token error: {e}')

    return {"success": True, "token": token}
