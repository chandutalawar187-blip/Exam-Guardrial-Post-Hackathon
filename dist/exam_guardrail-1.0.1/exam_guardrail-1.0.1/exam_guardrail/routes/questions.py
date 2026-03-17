# exam_guardrail/routes/questions.py
# Exam question CRUD middleware routes.

from fastapi import APIRouter, HTTPException
from exam_guardrail.db import get_db

router = APIRouter(prefix='/api/questions', tags=['guardrail-questions'])


@router.post('')
async def deploy_question(body: dict):
    try:
        db = get_db()
        row = {
            'exam_name': body['exam_name'],
            'question_text': body['question_text'],
            'options': body['options'],
            'correct_answer': body.get('correct_answer', '')
        }
        if body.get('subject_code'):
            row['subject_code'] = body['subject_code']
        if body.get('start_time'):
            row['start_time'] = body['start_time']
        if body.get('end_time'):
            row['end_time'] = body['end_time']
        result = db.table('exam_questions').insert(row).execute()
        return result.data[0]
    except Exception as e:
        print(f'[guardrail:questions] POST error: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@router.get('')
async def get_questions(exam_name: str = None, subject_code: str = None):
    try:
        db = get_db()
        query = db.table('exam_questions').select('*')
        if subject_code:
            query = query.eq('subject_code', subject_code)
        elif exam_name:
            query = query.eq('exam_name', exam_name)
        result = query.order('order_index').execute()
        return result.data
    except Exception as e:
        print(f'[guardrail:questions] GET error: {e}')
        return []
