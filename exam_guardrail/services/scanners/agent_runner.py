# exam_guardrail/services/scanners/agent_runner.py
# Background native agent — runs all scanners in a loop while a session is active.
#
# Usage (standalone):
#   python -m exam_guardrail.services.scanners.agent_runner --session-id abc --api-base http://localhost:8000/api
#
# Usage (from code):
#   from exam_guardrail.services.scanners.agent_runner import NativeAgent
#   agent = NativeAgent(session_id='abc', api_base='http://localhost:8000/api', block=True)
#   await agent.start()

import asyncio
import platform
import datetime
import logging
import json

try:
    import httpx
except ImportError:
    httpx = None

try:
    import psutil
except ImportError:
    psutil = None

from exam_guardrail.services.scanners.ai_agent_detector import (
    scan_ai_agents, scan_ai_network_connections, scan_hidden_windows
)
from exam_guardrail.services.scanners.screen_share_detector import scan_screen_sharing
from exam_guardrail.services.scanners.process_blocker import scan_and_block
from exam_guardrail.services.scanners.extension_detector import scan_extensions

log = logging.getLogger('exam_guardrail.agent')


class NativeAgent:
    """
    Background native agent that continuously scans for threats.

    Args:
        session_id:     Exam session identifier (sent with all events)
        api_base:       Backend API URL (e.g. 'http://localhost:8000/api')
        scan_interval:  Seconds between scan cycles (default: 3)
        block:          If True, terminate detected threats (default: True)
        token:          Optional auth token for API calls
    """

    def __init__(self, session_id, api_base='http://localhost:8000/api',
                 scan_interval=3, block=True, token=None, embedded=False):
        self.session_id = session_id
        self.api_base = api_base.rstrip('/')
        self.scan_interval = scan_interval
        self.block = block
        self.token = token
        self.embedded = embedded  # True when running inside the server process
        self._running = False
        self._task = None
        self.stats = {
            'scans': 0,
            'findings': 0,
            'blocked': 0,
            'errors': 0,
        }

    async def start(self):
        """Start the scanning loop."""
        self._running = True
        log.info(f'[NativeAgent] STARTED | session={self.session_id} | '
                 f'platform={platform.system()} | block={self.block} | '
                 f'interval={self.scan_interval}s | embedded={self.embedded}')

        if self.embedded:
            # Running inside the server — store events directly to DB
            await self._loop(None)
        else:
            # Running standalone — POST events via HTTP
            headers = {}
            if self.token:
                headers['Authorization'] = f'Bearer {self.token}'

            client_cls = httpx.AsyncClient if httpx else None

            if client_cls:
                async with client_cls(timeout=5.0, headers=headers) as client:
                    await self._loop(client)
            else:
                log.warning('[NativeAgent] httpx not installed — running in offline mode (no API reporting)')
                await self._loop(None)

    async def _loop(self, client):
        while self._running:
            try:
                self.stats['scans'] += 1
                all_findings = []

                # Clear psutil cache so freshly-spawned processes are detected
                if psutil:
                    try:
                        psutil.process_iter.cache_clear()
                    except AttributeError:
                        pass  # older psutil versions

                # Each scanner is isolated — one failure must not skip the others
                for scanner in (scan_hidden_windows,
                                scan_ai_network_connections,
                                scan_ai_agents,
                                scan_screen_sharing):
                    try:
                        all_findings.extend(scanner())
                    except Exception as e:
                        log.debug(f'[NativeAgent] Scanner {scanner.__name__} error: {e}')

                # Chrome extension scan (block if blocking is enabled)
                try:
                    all_findings.extend(scan_extensions(block=self.block))
                except Exception as e:
                    log.debug(f'[NativeAgent] Extension scanner error: {e}')

                # L4: Block if enabled (always runs regardless of scanner errors)
                if self.block:
                    try:
                        block_actions = scan_and_block()
                        self.stats['blocked'] += sum(
                            1 for a in block_actions if a.get('blocked'))
                        all_findings.extend(block_actions)

                        # Re-scan: catch processes that respawned during blocking
                        if block_actions:
                            if psutil:
                                try:
                                    psutil.process_iter.cache_clear()
                                except AttributeError:
                                    pass
                            retry = scan_and_block()
                            self.stats['blocked'] += sum(
                                1 for a in retry if a.get('blocked'))
                            all_findings.extend(retry)
                    except Exception as e:
                        log.error(f'[NativeAgent] Blocker error: {e}')

                self.stats['findings'] += len(all_findings)

                # Report findings
                if all_findings:
                    if self.embedded:
                        await self._store_events_direct(all_findings)
                    elif client:
                        for finding in all_findings:
                            await self._post_event(client, finding)

                # Heartbeat (only for standalone mode)
                if client and not self.embedded:
                    await self._heartbeat(client)

            except Exception as e:
                self.stats['errors'] += 1
                log.error(f'[NativeAgent] Scan error: {e}')

            await asyncio.sleep(self.scan_interval)

    async def _store_events_direct(self, findings):
        """Store events directly to DB (embedded mode — no HTTP)."""
        try:
            from exam_guardrail.db import get_db
            db = get_db()
            for f in findings:
                try:
                    db.table('events').insert({
                        'session_id': self.session_id,
                        'layer': f.get('layer', 'L4'),
                        'event_type': f['event_type'],
                        'severity': f['severity'],
                        'payload': f.get('metadata', {}),
                        'alert_sentence': f"Native agent: {f['event_type']} — {f.get('metadata', {}).get('reason', '')}",
                    }).execute()
                except Exception:
                    pass
        except Exception as e:
            log.warning(f'[NativeAgent] Direct DB store failed: {e}')

    async def _post_event(self, client, finding):
        try:
            payload = {
                'session_id': self.session_id,
                'event_type': finding['event_type'],
                'severity': finding['severity'],
                'layer': finding.get('layer', 'L4'),
                'score_delta': finding.get('score_delta', -10),
                'metadata': finding.get('metadata', {}),
            }
            await client.post(f'{self.api_base}/events', json=payload)
        except Exception as e:
            log.warning(f'[NativeAgent] Event post failed: {e}')

    async def _heartbeat(self, client):
        try:
            await client.post(f'{self.api_base}/native-agent/heartbeat', json={
                'session_id': self.session_id,
                'platform': platform.system(),
                'stats': self.stats,
                'timestamp': datetime.datetime.utcnow().isoformat(),
            })
        except Exception:
            pass

    def stop(self):
        """Stop the scanning loop."""
        self._running = False
        log.info(f'[NativeAgent] STOPPED | session={self.session_id} | stats={self.stats}')

    async def run_single_scan(self):
        """
        Run a single scan cycle and return all findings.
        Useful for on-demand scanning without the background loop.
        """
        findings = []
        findings.extend(scan_hidden_windows())
        findings.extend(scan_ai_network_connections())
        findings.extend(scan_ai_agents())
        findings.extend(scan_screen_sharing())
        findings.extend(scan_extensions(block=self.block))

        if self.block:
            block_actions = scan_and_block()
            findings.extend(block_actions)

        return findings


# ── CLI ENTRY POINT ──────────────────────────────────────────
async def _main():
    import argparse
    parser = argparse.ArgumentParser(description='ExamGuardrail Native Agent')
    parser.add_argument('--session-id', required=True, help='Exam session ID')
    parser.add_argument('--api-base', default='http://localhost:8000/api', help='Backend API base URL')
    parser.add_argument('--interval', type=int, default=3, help='Scan interval (seconds)')
    parser.add_argument('--no-block', action='store_true', help='Detect only, do not terminate processes')
    parser.add_argument('--token', default=None, help='Auth token')
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')

    agent = NativeAgent(
        session_id=args.session_id,
        api_base=args.api_base,
        scan_interval=args.interval,
        block=not args.no_block,
        token=args.token,
    )
    try:
        await agent.start()
    except KeyboardInterrupt:
        agent.stop()


if __name__ == '__main__':
    asyncio.run(_main())
