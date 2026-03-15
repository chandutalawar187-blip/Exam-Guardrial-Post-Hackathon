# backend/app/services/event_processor.py

from app.db.supabase_client import get_db
from datetime import datetime, timedelta


def get_verdict(score: int) -> str:
    if score >= 90:
        return 'CLEAR'
    if score >= 70:
        return 'UNDER_REVIEW'
    if score >= 50:
        return 'SUSPICIOUS'
    return 'FLAGGED'


async def apply_score_delta(session_id: str, delta: int) -> int:
    db = get_db()

    session = db.table('exam_sessions') \
        .select('credibility_score') \
        .eq('id', session_id) \
        .single() \
        .execute()

    current_score = session.data.get('credibility_score', 100)
    new_score = max(0, current_score + delta)

    # Compounding penalty: 3+ events in 5 minutes
    five_min_ago = (datetime.now() - timedelta(minutes=5)).isoformat()
    recent = db.table('events') \
        .select('id') \
        .eq('session_id', session_id) \
        .gte('created_at', five_min_ago) \
        .execute()

    if len(recent.data) >= 3:
        new_score = max(0, new_score - 10)

    verdict = get_verdict(new_score)

    db.table('exam_sessions').update({
        'credibility_score': new_score,
        'verdict': verdict
    }).eq('id', session_id).execute()

    return new_score
