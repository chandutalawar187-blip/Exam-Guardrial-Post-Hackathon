# exam_guardrail/routes/students.py
# Student management middleware routes.

from fastapi import APIRouter, HTTPException
from exam_guardrail.db import get_db

router = APIRouter(prefix='/api/students', tags=['guardrail-students'])


@router.post('')
async def create_student(body: dict):
    try:
        db = get_db()
        existing = db.table('student_users').select('user_id').eq('user_id', body['user_id']).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail=f"Student ID '{body['user_id']}' already exists.")

        result = db.table('student_users').insert({
            'user_id': body['user_id'],
            'name': body['name'],
            'password': body['password'],
            'exam_name': body['exam_name'],
            'is_eligible': True
        }).execute()
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f'[guardrail:students] POST error: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@router.get('')
async def get_students():
    try:
        db = get_db()
        result = db.table('student_users').select('*').execute()
        return result.data
    except Exception as e:
        print(f'[guardrail:students] GET error: {e}')
        return []
