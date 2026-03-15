# backend/app/routers/events.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.models.event import BehavioralEvent
from app.services.event_processor import apply_score_delta
from app.services.claude_analyzer import generate_haiku_alert
from app.db.supabase_client import get_db
import json

router = APIRouter()


# REST endpoint — from browser extension and PWA
@router.post('/events')
async def receive_event(event: BehavioralEvent):
    db = get_db()

    # Store event
    db.table('behavioral_events').insert({
        'session_id': event.session_id,
        'event_type': event.event_type,
        'severity': event.severity,
        'score_delta': event.score_delta,
        'platform': event.platform,
        'device_type': event.device_type,
        'metadata': event.metadata or {}
    }).execute()

    # Update score
    new_score = await apply_score_delta(event.session_id, event.score_delta)

    # Claude alert on CRITICAL events
    alert_text = None
    if event.severity == 'CRITICAL':
        alert_text = await generate_haiku_alert(event.dict())

    return {'status': 'ok', 'new_score': new_score, 'alert': alert_text}


# WebSocket endpoint — for native agent streaming
active_connections = {}


@router.websocket('/ws/{session_id}')
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    active_connections[session_id] = websocket

    try:
        while True:
            data = await websocket.receive_text()
            event_data = json.loads(data)
            event = BehavioralEvent(**event_data)

            new_score = await apply_score_delta(
                event.session_id, event.score_delta
            )
            await websocket.send_json({
                'status': 'ok',
                'new_score': new_score
            })
    except WebSocketDisconnect:
        del active_connections[session_id]
