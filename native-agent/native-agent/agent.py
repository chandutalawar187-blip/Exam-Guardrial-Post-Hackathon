# native-agent/agent.py

import asyncio
import httpx
import platform
import sys
from pathlib import Path

# Add backend services to path for shared scanners
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend' / 'app' / 'services'))

from window_scanner import scan_hidden_windows
from macos_scanner import scan_hidden_windows_macos
from network_monitor import scan_ai_connections
from process_forensics import scan_processes

API_BASE = 'http://localhost:8000/api'
SCAN_INTERVAL = 5  # seconds


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


async def agent_loop(session_id: str, token: str):
    """Main scanner loop — runs every 5 seconds."""
    is_windows = platform.system() == 'Windows'
    scan_windows = scan_hidden_windows if is_windows else scan_hidden_windows_macos

    print(f'[ExamGuardrail Agent] Started for session {session_id}')
    print(f'[ExamGuardrail Agent] Platform: {platform.system()}')

    async with httpx.AsyncClient() as client:
        while True:
            findings = []
            findings += scan_windows()
            findings += scan_ai_connections()
            findings += scan_processes()

            for finding in findings:
                await post_event(client, session_id, token, finding)
                print(f'[DETECTION] {finding["event_type"]} | {finding["severity"]}')

            # Heartbeat
            await client.post(
                f'{API_BASE}/native-agent/heartbeat',
                json={
                    'session_id': session_id,
                    'platform': platform.system()
                },
                headers={'Authorization': f'Bearer {token}'}
            )

            await asyncio.sleep(SCAN_INTERVAL)


if __name__ == '__main__':
    import os
    SESSION_ID = os.getenv('SESSION_ID', 'test-session-001')
    TOKEN = os.getenv('AGENT_TOKEN', 'dev-token')
    asyncio.run(agent_loop(SESSION_ID, TOKEN))
