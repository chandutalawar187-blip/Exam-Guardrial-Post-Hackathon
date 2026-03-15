# backend/app/routers/reports.py

from fastapi import APIRouter
from app.db.supabase_client import get_db
from app.services.claude_analyzer import generate_credibility_report

router = APIRouter()


@router.get('/reports/{session_id}')
async def get_report(session_id: str):
    db = get_db()

    # Check if a report already exists
    existing = db.table('credibility_reports') \
        .select('*') \
        .eq('session_id', session_id) \
        .execute()

    if existing.data:
        return existing.data[0]

    # Generate a new report
    session = db.table('exam_sessions') \
        .select('*') \
        .eq('id', session_id) \
        .single() \
        .execute()

    events = db.table('behavioral_events') \
        .select('*') \
        .eq('session_id', session_id) \
        .order('timestamp', desc=True) \
        .execute()

    score = session.data['credibility_score']
    report_data = await generate_credibility_report(
        session_id, events.data, score
    )

    # Store the report
    stored = db.table('credibility_reports').insert({
        'session_id': session_id,
        'verdict': report_data.get('verdict', 'UNDER_REVIEW'),
        'executive_summary': report_data.get('executive_summary', ''),
        'flags_json': report_data.get('red_flags', []),
        'recommendation': report_data.get('recommendation', ''),
        'confidence': report_data.get('confidence', 0.0),
        'generated_by': 'claude-sonnet-4-6'
    }).execute()

    return stored.data[0]
