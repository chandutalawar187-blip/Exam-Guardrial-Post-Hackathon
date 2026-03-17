"""
ExamGuardrail Desktop Agent
============================
Standalone agent that students run before attending an online exam.
Scans the local machine for AI tools, screen-sharing software, and
cheating browser extensions, then reports findings to the backend API.

Usage:
    python guardrail_agent.py
    python guardrail_agent.py --session-id ABC123 --api-url https://yourapp.vercel.app

Build to EXE (Windows):
    pip install pyinstaller
    pyinstaller --onefile --windowed --name ExamGuardrailAgent guardrail_agent.py
"""

import asyncio
import sys
import os
import argparse
import threading
import platform
import datetime
import logging

# ---------------------------------------------------------------------------
# Add project root to sys.path so exam_guardrail package is importable
# when running as a script directly from the repo
# ---------------------------------------------------------------------------
_here = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_here)
for _p in [_here, _project_root]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    import httpx
except ImportError:
    httpx = None

try:
    import psutil
except ImportError:
    psutil = None

# ---------------------------------------------------------------------------
# Logging — redirect to a file when running as a windowed .exe (stdout=None)
# ---------------------------------------------------------------------------
_IS_WINDOWED = (sys.stdout is None)  # True when built with PyInstaller --windowed

_log_handlers = []
if not _IS_WINDOWED:
    _log_handlers.append(logging.StreamHandler(sys.stdout))

# Always log to a file in the user's home directory
_log_file = os.path.join(os.path.expanduser("~"), "ExamGuardrailAgent.log")
try:
    _log_handlers.append(logging.FileHandler(_log_file, encoding="utf-8"))
except Exception:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    handlers=_log_handlers,
)
log = logging.getLogger("guardrail_agent")


def _print(msg: str):
    """Safe print — no-op when stdout is None (windowed exe)."""
    if sys.stdout is not None:
        try:
            print(msg)
        except Exception:
            pass
    log.info(msg.strip())


if httpx is None:
    log.error("httpx is required. Run: pip install httpx")
    sys.exit(1)

if psutil is None:
    log.error("psutil is required. Run: pip install psutil")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Try to import scanner modules from the installed/local exam_guardrail pkg
# ---------------------------------------------------------------------------
try:
    from exam_guardrail.services.scanners.ai_agent_detector import (
        scan_ai_agents, scan_ai_network_connections, scan_hidden_windows,
    )
    from exam_guardrail.services.scanners.screen_share_detector import scan_screen_sharing
    from exam_guardrail.services.scanners.process_blocker import scan_and_block
    from exam_guardrail.services.scanners.extension_detector import scan_extensions, restore_extensions
    SCANNERS_AVAILABLE = True
except ImportError as e:
    log.warning(f"Scanner modules not available ({e}). Running in heartbeat-only mode.")
    SCANNERS_AVAILABLE = False


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DEFAULT_API_URL = "https://exam-guardrial-post-hackathon.vercel.app"
HEARTBEAT_INTERVAL = 5   # seconds between heartbeats
SCAN_INTERVAL = 10        # seconds between full scans


# ---------------------------------------------------------------------------
# Core agent logic
# ---------------------------------------------------------------------------
class DesktopAgent:
    def __init__(self, session_id: str, api_url: str, block: bool = True):
        self.session_id = session_id
        self.api_base = api_url.rstrip("/")
        self.block = block
        self._running = False
        self.stats = {"scans": 0, "findings": 0, "blocked": 0, "errors": 0}

    async def run(self):
        self._running = True
        log.info(f"Agent started | session={self.session_id} | api={self.api_base}")
        log.info(f"Platform: {platform.system()} {platform.release()}")
        log.info(f"Block mode: {'ON' if self.block else 'OFF (detect only)'}")
        _print("\n" + "=" * 60)
        _print("  ExamGuardrail Agent — RUNNING")
        _print(f"  Session : {self.session_id}")
        _print(f"  API     : {self.api_base}")
        _print(f"  Block   : {'ON' if self.block else 'DETECT ONLY'}")
        _print("=" * 60)
        _print("  Keep this window open during the exam.")
        _print("  Press Ctrl+C to stop.\n")

        async with httpx.AsyncClient(timeout=10.0) as client:
            # Register with backend immediately
            await self._heartbeat(client)

            scan_counter = 0
            while self._running:
                try:
                    # Every HEARTBEAT_INTERVAL, send heartbeat
                    await asyncio.sleep(HEARTBEAT_INTERVAL)
                    await self._heartbeat(client)

                    # Every SCAN_INTERVAL, run a full scan
                    scan_counter += HEARTBEAT_INTERVAL
                    if scan_counter >= SCAN_INTERVAL:
                        scan_counter = 0
                        findings = await self._scan()
                        if findings:
                            await self._report_findings(client, findings)
                        self.stats["scans"] += 1
                        if findings:
                            log.warning(f"Scan complete — {len(findings)} threat(s) found")
                        else:
                            log.info("Scan complete — no threats detected")

                except asyncio.CancelledError:
                    break
                except Exception as e:
                    self.stats["errors"] += 1
                    log.error(f"Agent error: {e}")

        log.info(f"Agent stopped | stats={self.stats}")
        if SCANNERS_AVAILABLE and self.block:
            try:
                restored = restore_extensions()
                if restored:
                    log.info(f"Restored {restored} blocked extension(s)")
            except Exception:
                pass

    async def _heartbeat(self, client: httpx.AsyncClient):
        try:
            payload = {
                "session_id": self.session_id,
                "platform": f"{platform.system()} {platform.release()}",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "stats": self.stats,
            }
            resp = await client.post(f"{self.api_base}/api/native-agent/heartbeat", json=payload)
            if resp.status_code == 200:
                log.debug("Heartbeat OK")
            else:
                log.warning(f"Heartbeat returned {resp.status_code}")
        except Exception as e:
            log.warning(f"Heartbeat failed: {e}")

    async def _scan(self) -> list:
        if not SCANNERS_AVAILABLE:
            return []

        findings = []
        for scanner in (scan_hidden_windows, scan_ai_network_connections,
                         scan_ai_agents, scan_screen_sharing):
            try:
                findings.extend(scanner())
            except Exception as e:
                log.debug(f"Scanner {scanner.__name__} error: {e}")

        try:
            findings.extend(scan_extensions(block=self.block))
        except Exception as e:
            log.debug(f"Extension scanner error: {e}")

        if self.block:
            try:
                blocked = scan_and_block()
                self.stats["blocked"] += sum(1 for b in blocked if b.get("blocked"))
                findings.extend(blocked)
            except Exception as e:
                log.debug(f"Blocker error: {e}")

        self.stats["findings"] += len(findings)
        return findings

    async def _report_findings(self, client: httpx.AsyncClient, findings: list):
        for f in findings:
            try:
                payload = {
                    "session_id": self.session_id,
                    "event_type": f.get("event_type", "unknown"),
                    "severity": f.get("severity", "medium"),
                    "layer": f.get("layer", "L4"),
                    "score_delta": f.get("score_delta", -10),
                    "metadata": f.get("metadata", {}),
                }
                await client.post(f"{self.api_base}/api/events", json=payload)
            except Exception as e:
                log.warning(f"Failed to report finding: {e}")

    def stop(self):
        self._running = False


# ---------------------------------------------------------------------------
# Session ID prompt (GUI dialog if tkinter available, else terminal)
# ---------------------------------------------------------------------------
def prompt_session_id_gui() -> str:
    """Show a simple Tkinter dialog to collect the session/exam code."""
    try:
        import tkinter as tk
        from tkinter import simpledialog, messagebox

        root = tk.Tk()
        root.withdraw()  # hide main window

        session_id = simpledialog.askstring(
            "ExamGuardrail Agent",
            "Enter your Exam Session Code\n(provided by your instructor):",
            parent=root,
        )
        root.destroy()

        if not session_id or not session_id.strip():
            messagebox.showerror("ExamGuardrail", "Session code is required. Exiting.")
            sys.exit(1)

        return session_id.strip().upper()

    except Exception:
        # Tkinter not available — fall back to terminal
        return prompt_session_id_terminal()


def prompt_session_id_terminal() -> str:
    print("=" * 60)
    print("  ExamGuardrail Agent — Startup")
    print("=" * 60)
    session_id = input("  Enter your Exam Session Code: ").strip().upper()
    if not session_id:
        print("ERROR: Session code is required.")
        sys.exit(1)
    return session_id


# ---------------------------------------------------------------------------
# System tray icon (optional — requires pystray + Pillow)
# ---------------------------------------------------------------------------
def start_tray_icon(agent: DesktopAgent, loop: asyncio.AbstractEventLoop):
    """Start a system tray icon so students can see the agent is running."""
    try:
        import pystray
        from PIL import Image, ImageDraw

        # Draw a simple green shield icon
        size = 64
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.ellipse([4, 4, size - 4, size - 4], fill=(78, 142, 162, 255))
        draw.text((20, 20), "G", fill="white")

        def on_quit(icon, item):
            agent.stop()
            icon.stop()
            loop.call_soon_threadsafe(loop.stop)

        menu = pystray.Menu(
            pystray.MenuItem(f"Session: {agent.session_id}", None, enabled=False),
            pystray.MenuItem("Quit Agent", on_quit),
        )
        icon = pystray.Icon("ExamGuardrail", img, "ExamGuardrail Agent — Running", menu)
        icon.run()

    except ImportError:
        # pystray/Pillow not installed — no tray, just run in terminal
        pass
    except Exception as e:
        log.warning(f"Tray icon error: {e}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="ExamGuardrail Desktop Agent — run this before your exam.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--session-id", default=None,
                        help="Exam session code (prompted if not provided)")
    parser.add_argument("--api-url", default=DEFAULT_API_URL,
                        help=f"Backend API URL (default: {DEFAULT_API_URL})")
    parser.add_argument("--no-block", action="store_true",
                        help="Detect only — do not terminate/block threat processes")
    args = parser.parse_args()

    # Resolve session ID
    session_id = args.session_id
    if not session_id:
        # Use GUI dialog when: running as windowed exe (stdout=None) or not in a real terminal
        has_tty = sys.stdout is not None and hasattr(sys.stdout, 'isatty') and sys.stdout.isatty()
        if has_tty:
            session_id = prompt_session_id_terminal()
        else:
            session_id = prompt_session_id_gui()

    agent = DesktopAgent(
        session_id=session_id,
        api_url=args.api_url,
        block=not args.no_block,
    )

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    # Start tray icon in a background thread (non-blocking)
    tray_thread = threading.Thread(
        target=start_tray_icon, args=(agent, loop), daemon=True
    )
    tray_thread.start()

    try:
        loop.run_until_complete(agent.run())
    except KeyboardInterrupt:
        log.info("Interrupted by user. Stopping agent...")
        agent.stop()
    finally:
        loop.close()


if __name__ == "__main__":
    main()
