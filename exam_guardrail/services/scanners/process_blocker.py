# exam_guardrail/services/scanners/process_blocker.py
# Active enforcement — terminates prohibited processes while exam session is active.
#
# This module provides:
#   1. Block-on-detect: terminate disallowed processes when found
#   2. Continuous guard: background loop that keeps blocking while session is active
#   3. Allowlist: never kill system-critical or exam-related processes

import platform
import datetime
import logging

try:
    import psutil
except ImportError:
    psutil = None

log = logging.getLogger('exam_guardrail.blocker')

# PIDs that returned ACCESS DENIED — skip on future scans
_access_denied_pids = set()

# ── NEVER KILL THESE ─────────────────────────────────────────
ALLOWLIST = {
    # System
    'system', 'svchost.exe', 'csrss.exe', 'wininit.exe', 'winlogon.exe',
    'lsass.exe', 'services.exe', 'smss.exe', 'explorer.exe', 'dwm.exe',
    'taskhostw.exe', 'runtimebroker.exe', 'searchhost.exe', 'ctfmon.exe',
    'conhost.exe', 'dllhost.exe', 'sihost.exe', 'fontdrvhost.exe',
    'spoolsv.exe', 'wudfhost.exe', 'audiodg.exe',
    'systemd', 'init', 'launchd', 'kernel_task', 'loginwindow',
    'windowserver', 'coreaudiod', 'bluetoothd',
    # Browser (needed for exam)
    'chrome.exe', 'chrome', 'msedge.exe', 'firefox.exe', 'firefox',
    'safari', 'brave.exe', 'brave',
    # Our own processes
    'python.exe', 'python', 'python3', 'node.exe', 'node',
    'uvicorn', 'gunicorn',
}

# ── PROCESSES TO BLOCK ───────────────────────────────────────
# Combines all threat categories into one lookup
from exam_guardrail.services.scanners.ai_agent_detector import (
    AI_AGENT_PROCESSES, SUSPICIOUS_ELECTRON_NAMES
)
from exam_guardrail.services.scanners.screen_share_detector import (
    REMOTE_ACCESS, SCREEN_SHARE, SCREEN_RECORDERS
)

BLOCKED_PROCESSES = {
    **AI_AGENT_PROCESSES,
    **SUSPICIOUS_ELECTRON_NAMES,
    **REMOTE_ACCESS,
    **SCREEN_SHARE,
    **SCREEN_RECORDERS,
}


def terminate_process(pid, reason=''):
    """
    Terminate a process and its entire child tree by PID.
    Uses kill() (SIGKILL) instead of terminate() because Electron apps
    catch SIGTERM and ignore it.
    Returns True if the main process was terminated.
    """
    if psutil is None:
        return False

    try:
        proc = psutil.Process(pid)
        proc_name = proc.name().lower()

        # Safety: never kill allowlisted processes
        if proc_name in ALLOWLIST:
            return False

        # Kill entire process tree (children first, then parent)
        children = []
        try:
            children = proc.children(recursive=True)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

        for child in children:
            try:
                child_name = child.name().lower()
                if child_name not in ALLOWLIST:
                    child.kill()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        # Kill the main process
        proc.kill()
        try:
            proc.wait(timeout=0.5)
        except psutil.TimeoutExpired:
            pass

        log.info(f'BLOCKED: {proc_name} (PID {pid}) + {len(children)} children — {reason}')
        return True

    except psutil.NoSuchProcess:
        return False
    except psutil.AccessDenied:
        _access_denied_pids.add(pid)
        log.warning(f'ACCESS DENIED: Cannot terminate PID {pid} — requires elevated privileges (skipping future attempts)')
        return False
    except Exception as e:
        log.warning(f'Block failed for PID {pid}: {e}')
        return False


def scan_and_block():
    """
    Single pass: scan all processes, terminate any that match the block list.
    Returns a list of actions taken (for reporting to backend).
    """
    if psutil is None:
        return []

    # Clear cache to ensure freshly-spawned / restarted processes are seen
    try:
        psutil.process_iter.cache_clear()
    except AttributeError:
        pass

    actions = []
    now = datetime.datetime.utcnow().isoformat()
    system = platform.system()

    for proc in psutil.process_iter(['pid', 'name', 'exe']):
        try:
            pid = proc.info['pid']
            name = (proc.info['name'] or '').lower()
            exe = proc.info['exe'] or ''

            if name in ALLOWLIST:
                continue

            # Skip PIDs we already failed to kill
            if pid in _access_denied_pids:
                continue

            if name in BLOCKED_PROCESSES:
                reason = BLOCKED_PROCESSES[name]
                killed = terminate_process(pid, reason)

                # Determine category
                if name in AI_AGENT_PROCESSES or name in SUSPICIOUS_ELECTRON_NAMES:
                    event_type = 'AI_AGENT_BLOCKED'
                    category = 'ai_agent'
                elif name in REMOTE_ACCESS:
                    event_type = 'REMOTE_ACCESS_BLOCKED'
                    category = 'remote_access'
                elif name in SCREEN_SHARE:
                    event_type = 'SCREEN_SHARE_BLOCKED'
                    category = 'screen_share'
                else:
                    event_type = 'SCREEN_RECORDER_BLOCKED'
                    category = 'screen_recorder'

                actions.append({
                    'event_type': event_type,
                    'severity': 'CRITICAL',
                    'score_delta': -50,
                    'layer': 'L4',
                    'blocked': killed,
                    'metadata': {
                        'process': name,
                        'pid': pid,
                        'exe': exe,
                        'reason': reason,
                        'category': category,
                        'action': 'terminated' if killed else 'access_denied',
                        'source': 'process_blocker',
                    },
                    'timestamp': now,
                    'platform': system,
                })

        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    return actions


def get_blocked_process_names():
    """Returns the set of all process names that will be blocked."""
    return set(BLOCKED_PROCESSES.keys()) - ALLOWLIST
