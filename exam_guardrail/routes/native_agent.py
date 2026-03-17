# exam_guardrail/routes/native_agent.py
# API routes for the native desktop agent — heartbeats, findings, status.
#
# KEY DESIGN DECISION:
#   The desktop app uses a plain TEXT exam code (e.g. "GO", "ABC-123") as
#   its session_id, NOT a UUID FK into exam_sessions.  All native-agent data
#   therefore lives in two dedicated tables:
#       agent_heartbeats     — one row per code, upserted every 5 s
#       native_agent_events  — one row per detected threat
#   This avoids FK constraint errors from the existing events table.

import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from exam_guardrail.db import get_db

router = APIRouter(prefix='/api/native-agent', tags=['native-agent'])

HEARTBEAT_TTL_SECONDS = 30  # seconds before we call an agent "disconnected"


# ── Pydantic models ──────────────────────────────────────────────────────────

class HeartbeatPayload(BaseModel):
    session_id: str
    platform: str = ''
    timestamp: str = ''
    stats: Optional[dict] = None


class AgentEventPayload(BaseModel):
    session_id: str
    event_type: str
    severity: str = 'MEDIUM'
    layer: str = 'L4'
    score_delta: int = -10
    metadata: Optional[dict] = None
    platform: str = ''


class ScanRequestPayload(BaseModel):
    session_id: str
    block: bool = True


# ── Heartbeat ────────────────────────────────────────────────────────────────

@router.post('/heartbeat')
async def agent_heartbeat(payload: HeartbeatPayload):
    """Receive heartbeat from a running native agent and upsert into agent_heartbeats."""
    try:
        db = get_db()
        db.table('agent_heartbeats').upsert({
            'session_id': payload.session_id,
            'platform': payload.platform,
            'stats': payload.stats or {},
            'last_seen': datetime.datetime.utcnow().isoformat(),
        }, on_conflict='session_id').execute()
    except Exception as e:
        import logging
        logging.getLogger('native_agent').warning(f'Heartbeat DB write failed: {e}')
    return {'status': 'ok'}


@router.get('/status/{session_id}')
async def agent_status(session_id: str):
    """Check if a native agent is alive for a given session (heartbeat within TTL)."""
    try:
        db = get_db()
        result = db.table('agent_heartbeats') \
            .select('*') \
            .eq('session_id', session_id) \
            .maybe_single() \
            .execute()

        if not result.data:
            return {'status': 'disconnected'}

        row = result.data
        last_seen_str = row.get('last_seen', '')
        if last_seen_str:
            last_seen = datetime.datetime.fromisoformat(last_seen_str.replace('Z', '+00:00'))
            now = datetime.datetime.now(datetime.timezone.utc)
            age = (now - last_seen).total_seconds()
            if age > HEARTBEAT_TTL_SECONDS:
                return {'status': 'disconnected', 'last_seen': last_seen_str, 'age_seconds': int(age)}

        return {
            'status': 'connected',
            'platform': row.get('platform', ''),
            'last_seen': last_seen_str,
            'stats': row.get('stats', {}),
        }
    except Exception as e:
        return {'status': 'disconnected', 'error': str(e)}


@router.get('/all-heartbeats')
async def get_all_heartbeats():
    """Return all agent heartbeats with live/offline status (for admin overview)."""
    try:
        db = get_db()
        result = db.table('agent_heartbeats').select('*') \
            .order('last_seen', desc=True).execute()
        now = datetime.datetime.now(datetime.timezone.utc)
        rows = []
        for row in (result.data or []):
            ls = row.get('last_seen', '')
            connected, age = False, None
            if ls:
                try:
                    last_seen = datetime.datetime.fromisoformat(ls.replace('Z', '+00:00'))
                    age = int((now - last_seen).total_seconds())
                    connected = age <= HEARTBEAT_TTL_SECONDS
                except Exception:
                    pass
            rows.append({**row, 'connected': connected, 'age_seconds': age})
        return {'status': 'ok', 'count': len(rows), 'agents': rows}
    except Exception as e:
        return {'status': 'error', 'count': 0, 'agents': [], 'error': str(e)}


# ── Native agent events ───────────────────────────────────────────────────────

@router.post('/event')
async def post_agent_event(payload: AgentEventPayload):
    """
    Record a single threat-detection event from the desktop agent.
    Stored in native_agent_events (TEXT session_id — no UUID FK).
    """
    try:
        db = get_db()
        db.table('native_agent_events').insert({
            'session_id':  payload.session_id,
            'event_type':  payload.event_type,
            'severity':    payload.severity,
            'layer':       payload.layer,
            'score_delta': payload.score_delta,
            'metadata':    payload.metadata or {},
            'platform':    payload.platform,
        }).execute()
    except Exception as e:
        import logging
        logging.getLogger('native_agent').warning(f'Event insert failed: {e}')
    return {'status': 'ok'}


@router.get('/findings')
async def get_findings(session_id: Optional[str] = None, limit: int = 200):
    """Return native agent threat events, optionally filtered by session_id."""
    try:
        db = get_db()
        query = db.table('native_agent_events').select('*')
        if session_id:
            query = query.eq('session_id', session_id)
        result = query.order('created_at', desc=True).limit(limit).execute()
        return {'status': 'ok', 'count': len(result.data or []), 'findings': result.data or []}
    except Exception as e:
        return {'status': 'error', 'count': 0, 'findings': [], 'error': str(e)}


# ── On-demand scan (server-side, for testing) ─────────────────────────────────

@router.post('/scan')
async def trigger_scan(payload: ScanRequestPayload):
    """Run an on-demand scan in the backend process (testing only)."""
    try:
        from exam_guardrail.services.scanners.agent_runner import NativeAgent
        agent = NativeAgent(session_id=payload.session_id, block=payload.block)
        findings = await agent.run_single_scan()
        return {'status': 'ok', 'findings_count': len(findings), 'findings': findings}
    except Exception as e:
        return {'status': 'error', 'error': str(e)}


@router.get('/blocked-list')
async def get_blocked_list():
    """Return the list of process names and extension IDs that will be blocked."""
    try:
        from exam_guardrail.services.scanners.process_blocker import get_blocked_process_names
        from exam_guardrail.services.scanners.extension_detector import get_blocked_extension_ids
        return {
            'processes': {'count': len(sorted(get_blocked_process_names())), 'names': sorted(get_blocked_process_names())},
            'extensions': {'count': len(sorted(get_blocked_extension_ids())), 'ids': sorted(get_blocked_extension_ids())},
        }
    except Exception as e:
        return {'error': str(e)}


@router.get('/blocked-extensions')
async def get_blocked_extensions():
    """Scan and return all detected cheating extensions across browsers."""
    try:
        from exam_guardrail.services.scanners.extension_detector import scan_extensions
        findings = scan_extensions(block=False)
        return {'count': len(findings), 'extensions': findings}
    except Exception as e:
        return {'count': 0, 'extensions': [], 'error': str(e)}


@router.post('/restore-extensions')
async def restore_blocked_extensions():
    """Re-enable all previously blocked extensions (call after exam ends)."""
    try:
        from exam_guardrail.services.scanners.extension_detector import restore_extensions
        restored = restore_extensions()
        return {'status': 'ok', 'restored_count': restored}
    except Exception as e:
        return {'status': 'error', 'error': str(e)}
