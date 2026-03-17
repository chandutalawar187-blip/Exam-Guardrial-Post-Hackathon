# exam_guardrail/routes/reports.py
# Credibility report generation & export middleware routes.

from fastapi import APIRouter
from fastapi.responses import Response
from exam_guardrail.db import get_db
from exam_guardrail.services.ai_agents import generate_credibility_report
from exam_guardrail.services.excel_export import generate_admin_excel_report

router = APIRouter(tags=['guardrail-reports'])


@router.get('/api/reports/{session_id}')
async def get_report(session_id: str):
    db = get_db()

    existing = db.table('credibility_reports').select('*').eq('session_id', session_id).execute()
    if existing.data:
        return existing.data[0]

    session = db.table('exam_sessions').select('*').eq('id', session_id).single().execute()
    if not session.data:
        return {"error": "Session not found"}

    events_raw = db.table('events').select('*').eq('session_id', session_id).execute()
    l1 = [e for e in events_raw.data if e.get('layer') == 'L1']
    l2 = [e for e in events_raw.data if e.get('layer') == 'L2']
    l3 = [e for e in events_raw.data if e.get('layer') == 'L3']
    l4 = [e for e in events_raw.data if e.get('layer') == 'L4']

    answers = db.table('answer_scores').select('*').eq('session_id', session_id).execute()

    ml_scores = {
        "anomaly_count": len([e for e in l1 if e.get('severity') == 'HIGH']),
        "total_events": len(events_raw.data)
    }

    return await generate_credibility_report(
        session_metadata=session.data,
        l1_events={"events": l1}, l2_events={"events": l2},
        l3_events={"events": l3}, l4_events={"events": l4},
        l5_ml_scores=ml_scores,
        webcam_signals={"look_away_events": 0},
        answer_naturalness={"scores": answers.data}
    )


@router.get('/api/reports/{session_id}/export')
async def export_report_excel(session_id: str):
    db = get_db()

    session = db.table('exam_sessions').select('*').eq('id', session_id).single().execute()
    if not session.data:
        return {"error": "Session not found"}

    events = db.table('events').select('*').eq('session_id', session_id).execute()
    l1 = [e for e in events.data if e.get('layer') == 'L1']
    l4 = [e for e in events.data if e.get('layer') == 'L4']

    answers = db.table('answer_scores').select('*').eq('session_id', session_id).execute()
    report = db.table('credibility_reports').select('*').eq('session_id', session_id).execute()

    excel_bytes = generate_admin_excel_report(
        session_details=session.data,
        events_l1=l1, events_l4=l4,
        answer_scores=answers.data,
        credibility_report=report.data[0] if report.data else {}
    )

    date_str = session.data.get("created_at", "date").split('T')[0]
    filename = f"exam_{session_id}_report_{date_str}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get('/api/admin/reports')
async def get_all_reports():
    try:
        db = get_db()
        result = db.table('credibility_reports').select('*').order('generated_at', desc=True).execute()
        return result.data
    except Exception as e:
        print(f'[guardrail:reports] GET error: {e}')
        return []
