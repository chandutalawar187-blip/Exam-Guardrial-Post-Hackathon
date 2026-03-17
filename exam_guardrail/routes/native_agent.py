# exam_guardrail/routes/native_agent.py
# API routes for the native agent — heartbeat, scan status, on-demand triggers.

import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from exam_guardrail.db import get_db

router = APIRouter(prefix='/api/native-agent', tags=['native-agent'])

# How many seconds old a heartbeat can be before we consider the agent disconnected
HEARTBEAT_TTL_SECONDS = 30


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
    """Receive heartbeat from a running native agent and persist to Supabase."""
    try:
        db = get_db()
        db.table('agent_heartbeats').upsert({
            'session_id': payload.session_id,
            'platform': payload.platform,
            'stats': payload.stats or {},
            'last_seen': datetime.datetime.utcnow().isoformat(),
        }).execute()
    except Exception as e:
        # Don't crash the agent if DB write fails — just log it
        import logging
        logging.getLogger('exam_guardrail.native_agent').warning(
            f'Heartbeat DB write failed: {e}'
        )
    return {'status': 'ok'}


@router.get('/status/{session_id}')
async def agent_status(session_id: str):
    """Check if a native agent is alive for a given session (within last 30s)."""
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
            # Parse and check if within TTL
            last_seen = datetime.datetime.fromisoformat(
                last_seen_str.replace('Z', '+00:00')
            )
            now = datetime.datetime.now(datetime.timezone.utc)
            age_seconds = (now - last_seen).total_seconds()
            if age_seconds > HEARTBEAT_TTL_SECONDS:
                return {
                    'status': 'disconnected',
                    'last_seen': last_seen_str,
                    'age_seconds': int(age_seconds),
                }

        return {
            'status': 'connected',
            'platform': row.get('platform', ''),
            'last_seen': last_seen_str,
            'stats': row.get('stats', {}),
        }

    except Exception as e:
        import logging
        logging.getLogger('exam_guardrail.native_agent').warning(
            f'Heartbeat status check failed: {e}'
        )
        return {'status': 'disconnected', 'error': str(e)}


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


@router.get('/findings')
async def get_agent_findings(session_id: Optional[str] = None, limit: int = 200):
    """
    Return native agent events (threats detected/blocked by the desktop app).
    Optionally filter by session_id.
    """
    try:
        db = get_db()
        # Native agent events are stored in the events table with layer=L4
        # they come from AI_AGENT_DETECTED, HIDDEN_WINDOW_WDA, etc.
        NATIVE_EVENT_TYPES = {
            'AI_AGENT_DETECTED', 'AI_AGENT_BLOCKED', 'AI_CMDLINE_DETECTED',
            'AI_API_CONNECTION', 'HIDDEN_WINDOW_WDA', 'HIDDEN_WINDOW_MACOS',
            'SUSPICIOUS_ELECTRON_APP', 'SCREEN_SHARE_DETECTED', 'SCREEN_SHARE_BLOCKED',
            'REMOTE_ACCESS_DETECTED', 'REMOTE_ACCESS_BLOCKED',
            'SCREEN_RECORDER_DETECTED', 'SCREEN_RECORDER_BLOCKED',
            'CHEAT_EXTENSION_DETECTED', 'CHEAT_EXTENSION_BLOCKED',
        }

        query = db.table('events').select('*').in_('event_type', list(NATIVE_EVENT_TYPES))
        if session_id:
            query = query.eq('session_id', session_id)
        result = query.order('created_at', desc=True).limit(limit).execute()
        return {'status': 'ok', 'count': len(result.data or []), 'findings': result.data or []}
    except Exception as e:
        import logging
        logging.getLogger('exam_guardrail.native_agent').warning(f'Findings fetch failed: {e}')
        return {'status': 'error', 'count': 0, 'findings': [], 'error': str(e)}


@router.get('/all-heartbeats')
async def get_all_heartbeats():
    """Return all agent heartbeats (for admin overview)."""
    try:
        db = get_db()
        result = db.table('agent_heartbeats').select('*') \
            .order('last_seen', desc=True).execute()
        now = datetime.datetime.now(datetime.timezone.utc)
        rows = []
        for row in (result.data or []):
            last_seen_str = row.get('last_seen', '')
            connected = False
            age = None
            if last_seen_str:
                try:
                    last_seen = datetime.datetime.fromisoformat(last_seen_str.replace('Z', '+00:00'))
                    age = int((now - last_seen).total_seconds())
                    connected = age <= HEARTBEAT_TTL_SECONDS
                except Exception:
                    pass
            rows.append({**row, 'connected': connected, 'age_seconds': age})
        return {'status': 'ok', 'count': len(rows), 'agents': rows}
    except Exception as e:
        return {'status': 'error', 'count': 0, 'agents': [], 'error': str(e)}

