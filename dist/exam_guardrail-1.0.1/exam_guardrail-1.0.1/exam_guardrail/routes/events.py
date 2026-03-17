# exam_guardrail/routes/events.py
# Event ingestion middleware routes.

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from exam_guardrail.models import BehavioralEvent
from exam_guardrail.services import apply_score_delta
from exam_guardrail.services.ai_agents import generate_haiku_alert
from exam_guardrail.config import get_config
from exam_guardrail.db import get_db
import json

router = APIRouter(tags=['guardrail-events'])

active_connections = {}


@router.post('/api/events')
async def receive_event(event: BehavioralEvent):
    db = get_db()
    cfg = get_config()

    severity_deltas = {
        'CRITICAL': cfg.severity_critical,
        'HIGH': cfg.severity_high,
        'MEDIUM': cfg.severity_medium,
        'LOW': cfg.severity_low
    }
    delta = severity_deltas.get(event.severity, event.score_delta)

    alert_data = None
    alert_sentence = None
    if event.severity == 'CRITICAL':
        try:
            alert_data = await generate_haiku_alert(event.dict())
            alert_sentence = alert_data.get('alert_sentence') if alert_data else None
        except Exception as e:
            print(f'[guardrail:events] AI alert failed: {e}')
            alert_sentence = f'CRITICAL: {event.event_type} detected'

    db.table('events').insert({
        'session_id': event.session_id,
        'layer': event.layer or 'L1',
        'event_type': event.event_type,
        'severity': event.severity,
        'payload': event.metadata or {},
        'alert_sentence': alert_sentence
    }).execute()

    new_score = await apply_score_delta(event.session_id, delta)
    return {'status': 'ok', 'new_score': new_score, 'alert': alert_data}


@router.websocket('/ws/{session_id}')
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    active_connections[session_id] = websocket
    try:
        while True:
            data = await websocket.receive_text()
            event_data = json.loads(data)
            event = BehavioralEvent(**event_data)
            new_score = await apply_score_delta(event.session_id, event.score_delta)
            await websocket.send_json({'status': 'ok', 'new_score': new_score})
    except WebSocketDisconnect:
        active_connections.pop(session_id, None)
