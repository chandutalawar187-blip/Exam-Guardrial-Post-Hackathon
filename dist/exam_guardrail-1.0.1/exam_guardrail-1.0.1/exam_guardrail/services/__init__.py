# exam_guardrail/services/scoring.py
# Event scoring and verdict engine.

from exam_guardrail.db import get_db
from exam_guardrail.config import get_config
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
    cfg = get_config()

    session = db.table('exam_sessions') \
        .select('credibility_score') \
        .eq('id', session_id) \
        .single() \
        .execute()

    current_score = session.data.get('credibility_score', 100)
    new_score = max(0, current_score + delta)

    # Compounding penalty: N+ events in M minutes
    window = (datetime.now() - timedelta(minutes=cfg.compounding_penalty_window_minutes)).isoformat()
    recent = db.table('events') \
        .select('id') \
        .eq('session_id', session_id) \
        .gte('created_at', window) \
        .execute()

    if len(recent.data) >= cfg.compounding_penalty_threshold:
        new_score = max(0, new_score - cfg.compounding_penalty_extra)

    verdict = get_verdict(new_score)

    db.table('exam_sessions').update({
        'credibility_score': new_score,
        'verdict': verdict
    }).eq('id', session_id).execute()

    return new_score
