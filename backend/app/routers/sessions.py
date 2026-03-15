# backend/app/routers/sessions.py

from fastapi import APIRouter
from fastapi.responses import Response
from app.models.event import ExamSession
from app.db.supabase_client import get_db
import pandas as pd
import io
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix='/api', tags=['sessions'])


@router.post('/sessions')
async def create_session(session: ExamSession):
    db = get_db()
    result = db.table('exam_sessions').insert({
        'student_id': session.student_id,
        'student_name': session.student_name,
        'org_id': session.org_id,
        'exam_name': session.exam_name,
        'platform': session.platform,
        'device_type': session.device_type,
        'credibility_score': 100,
        'verdict': 'CLEAR',
        'status': 'active'
    }).execute()

    return {'session_id': result.data[0]['id']}


@router.get('/sessions/{session_id}')
async def get_session(session_id: str):
    try:
        db = get_db()
        session = db.table('exam_sessions').select('*').eq('id', session_id).single().execute()
        events = db.table('events').select('*').eq('session_id', session_id).order('created_at', desc=True).execute()
        return {'session': session.data, 'events': events.data}
    except Exception as e:
        print(f'[sessions] GET /sessions/{session_id} error: {e}')
        return {'session': None, 'events': []}


@router.get('/dashboard/overview')
async def dashboard_overview():
    try:
        db = get_db()
        # Auto-expire stale active sessions older than 2 hours
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        db.table('exam_sessions').update({'status': 'ABANDONED'}).eq('status', 'active').lt('created_at', cutoff).execute()

        sessions = db.table('exam_sessions').select('*').order('created_at', desc=True).execute()
        return {'sessions': sessions.data}
    except Exception as e:
        print(f'[sessions] GET /dashboard/overview error: {e}')
        return {'sessions': []}


@router.get('/sessions/{session_id}/logs')
async def get_session_logs(session_id: str):
    """Get all monitoring logs for a specific session."""
    try:
        db = get_db()
        session = db.table('exam_sessions').select('*').eq('id', session_id).single().execute()
        events = db.table('events').select('*').eq('session_id', session_id).order('created_at', desc=False).execute()
        answers = db.table('answer_scores').select('*').eq('session_id', session_id).execute()

        logs = []
        for e in events.data:
            logs.append({
                'id': e.get('id'),
                'timestamp': e.get('created_at'),
                'layer': e.get('layer', 'L1'),
                'event_type': e.get('event_type'),
                'severity': e.get('severity', 'MEDIUM'),
                'payload': e.get('payload', {}),
                'alert_sentence': e.get('alert_sentence'),
                'is_violation': e.get('severity') in ('HIGH', 'CRITICAL'),
            })

        return {
            'session': session.data,
            'logs': logs,
            'answer_scores': answers.data,
            'total_events': len(logs),
            'violations': len([l for l in logs if l['is_violation']]),
        }
    except Exception as e:
        print(f'[sessions] GET /sessions/{session_id}/logs error: {e}')
        return {'session': None, 'logs': [], 'answer_scores': [], 'total_events': 0, 'violations': 0}


@router.get('/sessions/{session_id}/logs/export')
async def export_session_logs_excel(session_id: str):
    """Export all monitoring logs for a session to a single Excel file."""
    db = get_db()

    session = db.table('exam_sessions').select('*').eq('id', session_id).single().execute()
    if not session.data:
        return {"error": "Session not found"}

    s = session.data
    events = db.table('events').select('*').eq('session_id', session_id).order('created_at', desc=False).execute()
    answers = db.table('answer_scores').select('*').eq('session_id', session_id).execute()

    # Sheet 1: Student Info
    df_info = pd.DataFrame([{
        "Student Name": s.get("student_name", "Unknown"),
        "Student ID": s.get("student_id", ""),
        "Exam Name": s.get("exam_name", ""),
        "Session ID": session_id,
        "Credibility Score": s.get("credibility_score", 100),
        "Verdict": s.get("verdict", "CLEAR"),
        "Status": s.get("status", "active"),
        "Started At": s.get("created_at", ""),
    }])

    # Sheet 2: All Monitoring Logs
    logs_data = []
    for e in events.data:
        logs_data.append({
            "Timestamp": e.get("created_at", ""),
            "Layer": e.get("layer", "L1"),
            "Event Type": e.get("event_type", ""),
            "Severity": e.get("severity", "MEDIUM"),
            "Is Violation": "YES" if e.get("severity") in ("HIGH", "CRITICAL") else "NO",
            "Alert": e.get("alert_sentence", ""),
            "Details": str(e.get("payload", {})),
        })
    df_logs = pd.DataFrame(logs_data) if logs_data else pd.DataFrame([{"Message": "No monitoring events recorded."}])

    # Sheet 3: Answer Analysis
    ai_data = []
    for a in answers.data:
        ai_data.append({
            "Question ID": a.get("question_id", ""),
            "AI Probability": f"{(a.get('ai_probability', 0) * 100):.1f}%",
            "Verdict": a.get("verdict", ""),
            "Flagged": "YES" if a.get("flag_for_review") else "NO",
            "Signals": ", ".join(a.get("signals_detected", [])) if isinstance(a.get("signals_detected"), list) else str(a.get("signals_detected", "")),
        })
    df_ai = pd.DataFrame(ai_data) if ai_data else pd.DataFrame([{"Message": "No answer analysis available."}])

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_info.to_excel(writer, sheet_name='Student Info', index=False)
        df_logs.to_excel(writer, sheet_name='Monitoring Logs', index=False)
        df_ai.to_excel(writer, sheet_name='Answer Analysis', index=False)

    student_name = s.get("student_name", "student").replace(" ", "_")
    student_id = s.get("student_id", "unknown")
    filename = f"{student_name}_{student_id}_logs.xlsx"

    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
