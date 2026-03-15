# sentinel_svc.py (Cognivigil SaaS Stealth Service)
import asyncio
import httpx
import platform
import sys
import datetime
from datetime import UTC
from pathlib import Path

# Add backend services to path for shared scanners
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend' / 'app' / 'services'))

from window_scanner import scan_hidden_windows
from macos_scanner import scan_hidden_windows_macos
from network_monitor import scan_ai_connections
from process_forensics import scan_processes

API_BASE = 'http://localhost:8000/api'
SCAN_INTERVAL = 3  # Strictly enforce the 3-Second Rule


async def post_event(client, session_id, token, finding):
    """Post a detected finding to the backend API."""
    try:
        payload = {
            **finding,
            'session_id': session_id,
            'platform': platform.system().lower(),
            'device_type': 'laptop'
        }
        await client.post(
            f'{API_BASE}/events',
            json=payload,
            headers={'Authorization': f'Bearer {token}'},
            timeout=5.0
        )
    except Exception as e:
        print(f'Event post failed: {e}')


def log_message(msg):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] {msg}"
    print(formatted, flush=True)
    try:
        with open("agent_runtime.log", "a") as f:
            f.write(formatted + "\n")
    except:
        pass

async def agent_loop(session_id: str, token: str):
    """Main scanner loop — runs every 5 seconds."""
    is_windows = platform.system() == 'Windows'
    scan_windows = scan_hidden_windows if is_windows else scan_hidden_windows_macos

    log_message(f'[Sentinel Agent] STARTED | Session: {session_id}')
    log_message(f'[Sentinel Agent] Platform: {platform.system()}')

    async with httpx.AsyncClient() as client:
        while True:
            # Silent SaaS Scan Operation
            findings_l2 = scan_windows()
            findings_l3 = scan_ai_connections()
            findings_l4 = scan_processes()

            # --- ACTIVE ENFORCEMENT & REPORTING ---
            all_findings = [
                (findings_l2, 'L2'),
                (findings_l3, 'L3'),
                (findings_l4, 'L4')
            ]

            for finding_list, layer_id in all_findings:
                for f in finding_list:
                    f['layer'] = layer_id
                    
                    # 1. IMMEDIATE ENFORCEMENT (If Critical)
                    if f.get('severity') == 'CRITICAL':
                        try:
                            import psutil
                            pid = f['metadata'].get('pid')
                            if pid:
                                p = psutil.Process(pid)
                                p.terminate()
                                log_message(f"BLOCKED: {f['metadata'].get('process')} (PID: {pid})")
                        except Exception as e:
                            log_message(f"Block failed: {e}")

                    # 2. NETWORK LOGGING (Non-blocking)
                    await post_event(client, session_id, token, f)

            # Heartbeat
            try:
                await client.post(
                    f'{API_BASE}/native-agent/heartbeat',
                    json={
                        'session_id': session_id,
                        'platform': platform.system(),
                        'timestamp': datetime.datetime.now(UTC).isoformat()
                    },
                    headers={'Authorization': f'Bearer {token}'}
                )
            except Exception:
                pass

            await asyncio.sleep(SCAN_INTERVAL)


if __name__ == '__main__':
    import os
    # Move to the directory of the script to ensure log file location
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Hide from task list by minimizing footprint
    SESSION_ID = os.getenv('SESSION_ID', 'test-session-001')
    TOKEN = os.getenv('AGENT_TOKEN', 'dev-token')
    asyncio.run(agent_loop(SESSION_ID, TOKEN))
