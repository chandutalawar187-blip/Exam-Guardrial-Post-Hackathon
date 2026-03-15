# backend/app/services/event_processor.py

from app.db.supabase_client import get_db
from datetime import datetime, timedelta


def get_verdict(score: int) -> str:
    """Map score to verdict label."""
    if score >= 90:
        return 'CLEAR'
    if score >= 70:
        return 'UNDER_REVIEW'
    if score >= 50:
        return 'SUSPICIOUS'
    return 'FLAGGED'


async def apply_score_delta(session_id: str, delta: int) -> int:
    """
    Apply a score delta to a session and update the verdict.
    Includes compounding penalty: 3+ events in 5 minutes = extra -10.
    """
    db = get_db()

    # Get current score
    session = db.table('exam_sessions') \
        .select('credibility_score') \
        .eq('id', session_id) \
        .single() \
        .execute()

    current_score = session.data['credibility_score']
    new_score = max(0, current_score + delta)

    # Compounding penalty: 3+ events in 5 minutes
    five_min_ago = (datetime.now() - timedelta(minutes=5)).isoformat()
    recent = db.table('behavioral_events') \
        .select('id') \
        .eq('session_id', session_id) \
        .gte('timestamp', five_min_ago) \
        .execute()

    if len(recent.data) >= 3:
        new_score = max(0, new_score - 10)

    verdict = get_verdict(new_score)

    # Update session
    db.table('exam_sessions').update({
        'credibility_score': new_score,
        'verdict': verdict
    }).eq('id', session_id).execute()

    return new_score
