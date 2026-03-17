# exam_guardrail/routes/native_agent.py
# API routes for the native desktop agent — codes, heartbeats, findings, email.

import datetime
import random
import string
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from exam_guardrail.db import get_db
from exam_guardrail.services.email_report import send_report_email

router = APIRouter(prefix='/api/native-agent', tags=['native-agent'])

HEARTBEAT_TTL_SECONDS = 30


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

class GenerateCodePayload(BaseModel):
    session_id: str
    student_name: str = ''
    exam_name: str = ''
    admin_email: str = ''

class SendReportPayload(BaseModel):
    session_id: str
    admin_email: str = ''

class ScanRequestPayload(BaseModel):
    session_id: str
    block: bool = True


# ── Short code generation ────────────────────────────────────────────────────

def _gen_code(length=6):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))


@router.post('/generate-code')
async def generate_code(payload: GenerateCodePayload):
    """
    Generate a short 6-char agent code for a session.
    If one already exists for this session, return it.
    Called by the student waiting room on mount.
    """
    db = get_db()
    # Check for existing code for this session
    try:
        existing = db.table('agent_codes').select('code') \
            .eq('session_id', payload.session_id).maybe_single().execute()
        if existing.data:
            return {'status': 'ok', 'code': existing.data['code']}
    except Exception:
        pass

    # Generate a new unique code (retry up to 5 times)
    for _ in range(5):
        code = _gen_code()
        try:
            db.table('agent_codes').insert({
                'code': code,
                'session_id': payload.session_id,
                'student_name': payload.student_name,
                'exam_name': payload.exam_name,
                'admin_email': payload.admin_email,
            }).execute()
            return {'status': 'ok', 'code': code}
        except Exception:
            continue  # Code collision, retry

    return {'status': 'error', 'error': 'Could not generate unique code'}


@router.get('/resolve-code/{code}')
async def resolve_code(code: str):
    """Resolve a short code to its session details."""
    try:
        db = get_db()
        result = db.table('agent_codes').select('*') \
            .eq('code', code.upper()).maybe_single().execute()
        if result.data:
            return {'status': 'ok', **result.data}
        return {'status': 'not_found'}
    except Exception as e:
        return {'status': 'error', 'error': str(e)}


# ── Heartbeat ────────────────────────────────────────────────────────────────

@router.post('/heartbeat')
async def agent_heartbeat(payload: HeartbeatPayload):
    """Receive heartbeat from a running native agent."""
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
        logging.getLogger('native_agent').warning(f'Heartbeat write failed: {e}')
    return {'status': 'ok'}


@router.get('/status/{session_id}')
async def agent_status(session_id: str):
    """
    Check if agent is alive. Accepts either a UUID session_id or short code.
    The student waiting room calls this with its session UUID.
    We first check if there's an agent_codes entry mapping, then check heartbeats.
    """
    try:
        db = get_db()
        lookup_id = session_id

        # Check if this is a UUID — if so, look up if there's an agent_code pointing to it
        # and check the heartbeat using the short code instead
        code_result = db.table('agent_codes').select('code') \
            .eq('session_id', session_id).maybe_single().execute()
        if code_result.data:
            # An agent_code was generated for this session — the agent uses the short code
            lookup_id = code_result.data['code']

        result = db.table('agent_heartbeats').select('*') \
            .eq('session_id', lookup_id).maybe_single().execute()

        if not result.data:
            return {'status': 'disconnected', 'code': code_result.data['code'] if code_result.data else None}

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
    """Return all agent heartbeats for admin overview."""
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
async def post_agent_event(payload: AgentEventPayload, background_tasks: BackgroundTasks):
    """Record a threat event from the desktop agent."""
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

        # AUTOMATED INSTANT ALERT: If severity is high/critical, send email immediately
        severity = (payload.severity or 'MEDIUM').upper()
        if severity in ('CRITICAL', 'HIGH'):
            # Look up code info for context and email
            code_info = db.table('agent_codes').select('*') \
                .eq('session_id', payload.session_id).maybe_single().execute()
            if not code_info.data:
                code_info = db.table('agent_codes').select('*') \
                    .eq('code', payload.session_id.upper()).maybe_single().execute()
            
            if code_info.data and code_info.data.get('admin_email'):
                admin_email = code_info.data['admin_email']
                student_name = code_info.data.get('student_name', 'Student')
                exam_name = code_info.data.get('exam_name', 'Exam')
                
                # Fetch recent findings for this session to include in the alert
                findings_result = db.table('native_agent_events').select('*') \
                    .eq('session_id', payload.session_id) \
                    .order('created_at', desc=True).limit(5).execute()
                
                background_tasks.add_task(
                    send_report_email,
                    admin_email,
                    payload.session_id,
                    student_name,
                    exam_name,
                    findings_result.data or [],
                    {} # Stats not needed for instant alert
                )

    except Exception as e:
        import logging
        logging.getLogger('native_agent').warning(f'Event insert failed: {e}')
    return {'status': 'ok'}


@router.get('/findings')
async def get_findings(session_id: Optional[str] = None, limit: int = 200):
    """Return native agent events, optionally filtered by session_id."""
    try:
        db = get_db()
        query = db.table('native_agent_events').select('*')
        if session_id:
            query = query.eq('session_id', session_id)
        result = query.order('created_at', desc=True).limit(limit).execute()
        return {'status': 'ok', 'count': len(result.data or []), 'findings': result.data or []}
    except Exception as e:
        return {'status': 'error', 'count': 0, 'findings': [], 'error': str(e)}


# ── Email report ──────────────────────────────────────────────────────────────

@router.post('/send-report')
async def send_report(payload: SendReportPayload, background_tasks: BackgroundTasks):
    """
    Compile all findings for a session and email them to the admin.
    Looks up admin_email from agent_codes if not provided.
    """
    db = get_db()
    admin_email = payload.admin_email
    student_name = ''
    exam_name = ''

    # Look up code info
    try:
        code_info = db.table('agent_codes').select('*') \
            .eq('session_id', payload.session_id).maybe_single().execute()
        if not code_info.data:
            # Maybe session_id is the short code itself
            code_info = db.table('agent_codes').select('*') \
                .eq('code', payload.session_id.upper()).maybe_single().execute()
        if code_info.data:
            admin_email = admin_email or code_info.data.get('admin_email', '')
            student_name = code_info.data.get('student_name', '')
            exam_name = code_info.data.get('exam_name', '')
    except Exception:
        pass

    if not admin_email:
        return {'status': 'error', 'error': 'No admin email configured for this session'}

    # Fetch findings
    try:
        findings_result = db.table('native_agent_events').select('*') \
            .eq('session_id', payload.session_id) \
            .order('created_at', desc=True).limit(200).execute()
        findings = findings_result.data or []
    except Exception:
        findings = []

    # Fetch stats from heartbeat
    stats = {}
    try:
        hb = db.table('agent_heartbeats').select('stats') \
            .eq('session_id', payload.session_id).maybe_single().execute()
        if hb.data:
            stats = hb.data.get('stats', {})
    except Exception:
        pass

    background_tasks.add_task(
        send_report_email,
        admin_email,
        payload.session_id,
        student_name,
        exam_name,
        findings,
        stats
    )
    return {'status': 'pending', 'emailed_to': admin_email, 'findings_count': len(findings)}


# ── Utility endpoints ─────────────────────────────────────────────────────────

@router.post('/scan')
async def trigger_scan(payload: ScanRequestPayload):
    try:
        from exam_guardrail.services.scanners.agent_runner import NativeAgent
        agent = NativeAgent(session_id=payload.session_id, block=payload.block)
        findings = await agent.run_single_scan()
        return {'status': 'ok', 'findings_count': len(findings), 'findings': findings}
    except Exception as e:
        return {'status': 'error', 'error': str(e)}

@router.get('/blocked-list')
async def get_blocked_list():
    try:
        from exam_guardrail.services.scanners.process_blocker import get_blocked_process_names
        from exam_guardrail.services.scanners.extension_detector import get_blocked_extension_ids
        return {
            'processes': sorted(get_blocked_process_names()),
            'extensions': sorted(get_blocked_extension_ids()),
        }
    except Exception as e:
        return {'error': str(e)}

@router.get('/blocked-extensions')
async def get_blocked_extensions():
    try:
        from exam_guardrail.services.scanners.extension_detector import scan_extensions
        return {'extensions': scan_extensions(block=False)}
    except Exception as e:
        return {'extensions': [], 'error': str(e)}

@router.post('/restore-extensions')
async def restore_blocked_extensions():
    try:
        from exam_guardrail.services.scanners.extension_detector import restore_extensions
        return {'status': 'ok', 'restored_count': restore_extensions()}
    except Exception as e:
        return {'status': 'error', 'error': str(e)}
