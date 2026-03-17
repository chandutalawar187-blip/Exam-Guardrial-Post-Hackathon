# exam_guardrail/routes/auth.py
# Authentication middleware routes.

from fastapi import APIRouter
from exam_guardrail.config import get_config
from exam_guardrail.db import get_db

router = APIRouter(prefix='/api/auth', tags=['guardrail-auth'])


@router.post('/admin-login')
async def admin_login(body: dict):
    cfg = get_config()
    if body.get('username') == cfg.admin_username and body.get('password') == cfg.admin_password:
        return {'success': True, 'token': 'admin-token'}
    return {'success': False}


@router.post('/student-login')
async def student_login(body: dict):
    try:
        db = get_db()
        subject_code = body.get('subject_code', '').strip()

        exam_name_override = None
        if subject_code:
            exam_lookup = db.table('exam_questions').select('exam_name, subject_code').eq('subject_code', subject_code).limit(1).execute()
            if not exam_lookup.data:
                return {'success': False, 'error': f'No exam found with subject code: {subject_code}'}
            exam_name_override = exam_lookup.data[0]['exam_name']

        result = db.table('student_users').select('*') \
            .eq('user_id', body['user_id']) \
            .eq('password', body['password']) \
            .eq('is_eligible', True) \
            .execute()

        if not result.data:
            return {'success': False, 'error': 'Invalid credentials or not eligible'}

        student = result.data[0]
        target_exam = exam_name_override or student['exam_name']

        # Check if already attended
        token_check = db.table('exam_tokens').select('*') \
            .eq('student_id', student['user_id']) \
            .eq('exam_name', target_exam) \
            .execute()

        if token_check.data:
            return {
                'success': False, 'already_attended': True,
                'error': f'You have already attended the exam: {target_exam}. You cannot retake this exam.'
            }

        # Look up exam schedule
        schedule = db.table('exam_questions').select('start_time, end_time').eq('exam_name', target_exam).limit(1).execute()
        start_time = schedule.data[0].get('start_time') if schedule.data else None
        end_time = schedule.data[0].get('end_time') if schedule.data else None

        session_data = {
            'student_id': student['user_id'],
            'student_name': student['name'],
            'exam_name': target_exam,
            'subject_code': subject_code or '',
            'credibility_score': 100,
            'verdict': 'CLEAR',
            'status': 'active'
        }
        if start_time:
            session_data['start_time'] = start_time
        if end_time:
            session_data['end_time'] = end_time

        session = db.table('exam_sessions').insert(session_data).execute().data[0]

        return {
            'success': True,
            'user_id': student['user_id'],
            'name': student['name'],
            'exam_name': target_exam,
            'subject_code': subject_code or '',
            'session_id': session['id'],
            'start_time': start_time,
            'end_time': end_time
        }
    except Exception as e:
        print(f'[guardrail:auth] student-login error: {e}')
        return {'success': False, 'error': 'Server error during login'}
