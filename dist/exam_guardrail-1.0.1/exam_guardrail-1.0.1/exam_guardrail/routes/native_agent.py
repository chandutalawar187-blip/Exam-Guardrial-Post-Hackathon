# exam_guardrail/routes/native_agent.py
# API routes for the native agent — heartbeat, scan status, on-demand triggers.

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from exam_guardrail.db import get_db

router = APIRouter(prefix='/api/native-agent', tags=['native-agent'])

# In-memory storage for agent heartbeats
_agent_heartbeats = {}


class HeartbeatPayload(BaseModel):
    session_id: str
    platform: str = ''
    timestamp: str = ''
    stats: Optional[dict] = None


class ScanRequestPayload(BaseModel):
    session_id: str
    block: bool = True


@router.post('/heartbeat')
async def agent_heartbeat(payload: HeartbeatPayload):
    """Receive heartbeat from a running native agent."""
    _agent_heartbeats[payload.session_id] = {
        'platform': payload.platform,
        'timestamp': payload.timestamp,
        'stats': payload.stats or {},
        'alive': True,
    }
    return {'status': 'ok'}


@router.get('/status/{session_id}')
async def agent_status(session_id: str):
    """Check if a native agent is alive for a given session."""
    hb = _agent_heartbeats.get(session_id)
    if hb:
        return {'status': 'connected', **hb}
    return {'status': 'disconnected'}


@router.post('/scan')
async def trigger_scan(payload: ScanRequestPayload):
    """
    Run a single on-demand scan (for testing or manual checks).
    This runs the scanners in the backend process itself.
    """
    from exam_guardrail.services.scanners.agent_runner import NativeAgent

    agent = NativeAgent(
        session_id=payload.session_id,
        block=payload.block,
    )
    findings = await agent.run_single_scan()

    # Store findings as events
    if findings:
        db = get_db()
        for f in findings:
            try:
                db.table('events').insert({
                    'session_id': payload.session_id,
                    'layer': f.get('layer', 'L4'),
                    'event_type': f['event_type'],
                    'severity': f['severity'],
                    'payload': f.get('metadata', {}),
                    'alert_sentence': f"Native agent: {f['event_type']} — {f.get('metadata', {}).get('reason', '')}"
                }).execute()
            except Exception:
                pass

    return {
        'status': 'ok',
        'findings_count': len(findings),
        'findings': findings,
        'blocked_count': sum(1 for f in findings if f.get('blocked')),
    }


@router.get('/blocked-list')
async def get_blocked_list():
    """Return the full list of process names and extension IDs that will be blocked."""
    from exam_guardrail.services.scanners.process_blocker import get_blocked_process_names
    from exam_guardrail.services.scanners.extension_detector import get_blocked_extension_ids
    process_names = sorted(get_blocked_process_names())
    extension_ids = sorted(get_blocked_extension_ids())
    return {
        'processes': {'count': len(process_names), 'names': process_names},
        'extensions': {'count': len(extension_ids), 'ids': extension_ids},
    }


@router.get('/blocked-extensions')
async def get_blocked_extensions():
    """Scan and return all detected cheating extensions across browsers."""
    from exam_guardrail.services.scanners.extension_detector import scan_extensions
    findings = scan_extensions(block=False)
    return {
        'count': len(findings),
        'extensions': findings,
    }


@router.post('/restore-extensions')
async def restore_blocked_extensions():
    """Re-enable all previously blocked extensions (call after exam ends)."""
    from exam_guardrail.services.scanners.extension_detector import restore_extensions
    restored = restore_extensions()
    return {'status': 'ok', 'restored_count': restored}
