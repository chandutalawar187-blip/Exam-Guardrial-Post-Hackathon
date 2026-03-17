# exam_guardrail/services/scanners/ai_agent_detector.py
# Detects hidden AI agents / overlay apps running on the system.
#
# Detection strategies:
#   1. Known process names (Cluely, ParakeetAI, LockedIn, Interview Coder, etc.)
#   2. Hidden window flags (WDA_EXCLUDEFROMCAPTURE on Windows, kCGWindowSharingNone on macOS)
#   3. Suspicious Electron-based apps with no visible window
#   4. Network connections to AI API endpoints
#   5. Process command-line argument inspection

import platform
import datetime
import socket

try:
    import psutil
except ImportError:
    psutil = None


# ── KNOWN AI OVERLAY / CHEAT TOOL PROCESS NAMES ─────────────
AI_AGENT_PROCESSES = {
    # AI overlay apps
    'cluely_helper.exe':    'Cluely AI overlay',
    'cluely_helper':        'Cluely AI overlay (macOS/Linux)',
    'cluely.exe':           'Cluely AI app',
    'cluely':               'Cluely AI app (macOS/Linux)',
    'pmodule.exe':          'ParakeetAI hidden overlay',
    'pmodule':              'ParakeetAI (macOS/Linux)',
    'ghost.exe':            'LockedIn AI ghost process',
    'ghost':                'LockedIn AI (macOS/Linux)',
    'interviewcoder.exe':   'Interview Coder AI overlay',
    'interviewcoder':       'Interview Coder (macOS/Linux)',
    'chegg.exe':            'Chegg desktop app',
    'chegg':                'Chegg (macOS/Linux)',
    'brainly.exe':          'Brainly desktop app',
    'photomath.exe':        'Photomath desktop',
    'socratic.exe':         'Socratic by Google',
    'copilot.exe':          'GitHub Copilot standalone',
    'cursor.exe':           'Cursor AI editor',
    'cursor':               'Cursor AI editor (macOS/Linux)',
    'windsurf.exe':         'Windsurf AI editor',
    'windsurf':             'Windsurf AI editor (macOS/Linux)',
    'chatgpt.exe':          'ChatGPT desktop app',
    'chatgpt':              'ChatGPT desktop app (macOS/Linux)',
    'claude.exe':           'Claude desktop app',
    'claude':               'Claude desktop app (macOS/Linux)',
    'gemini.exe':           'Google Gemini desktop app',
    'gemini':               'Google Gemini desktop app (macOS/Linux)',
    'mscopilot_proxy.exe':  'Microsoft Copilot proxy',
    'mscopilot_proxy':      'Microsoft Copilot proxy (macOS/Linux)',
}

# Electron-based apps that could be AI overlays when hidden
SUSPICIOUS_ELECTRON_NAMES = {
    'electron.exe':         'Unknown Electron app (possible AI overlay)',
    'electron':             'Unknown Electron app (macOS/Linux)',
}

# AI API domains to detect network connections
AI_API_DOMAINS = [
    'api.openai.com',
    'api.anthropic.com',
    'generativelanguage.googleapis.com',
    'api.groq.com',
    'api.cohere.ai',
    'api.mistral.ai',
    'api.perplexity.ai',
    'api.together.xyz',
    'api.replicate.com',
    'api.deepseek.com',
    'api.fireworks.ai',
    'api.x.ai',
]

# Command-line patterns that indicate AI usage
AI_CMD_PATTERNS = [
    'openai', 'anthropic', 'chatgpt', 'claude', 'gemini',
    'copilot', 'codewhisperer', 'gpt-4', 'gpt4', 'llama',
    '--ai-', '--model', 'huggingface',
]


# Pre-resolved AI API IPs (cached on first use)
_resolved_ips = {}
_dns_cache_built = False


# Skip cmdline inspection for these (system/browser — too slow, never AI agents)
_SKIP_CMDLINE = {
    'system', 'svchost.exe', 'csrss.exe', 'wininit.exe', 'winlogon.exe',
    'lsass.exe', 'services.exe', 'smss.exe', 'explorer.exe', 'dwm.exe',
    'taskhostw.exe', 'runtimebroker.exe', 'searchhost.exe', 'ctfmon.exe',
    'conhost.exe', 'dllhost.exe', 'sihost.exe', 'fontdrvhost.exe',
    'chrome.exe', 'msedge.exe', 'firefox.exe', 'brave.exe',
    'chrome', 'firefox', 'brave', 'safari',
    'spoolsv.exe', 'audiodg.exe', 'searchindexer.exe',
    'wmiprvse.exe', 'wudfhost.exe', 'smartscreen.exe',
}


def _build_dns_cache():
    """Resolve AI API domains to IPs once, cache for all future scans."""
    global _dns_cache_built
    if _dns_cache_built:
        return
    for domain in AI_API_DOMAINS:
        try:
            ips = socket.getaddrinfo(domain, 443, proto=socket.IPPROTO_TCP)
            for info in ips:
                _resolved_ips[info[4][0]] = domain
        except Exception:
            pass
    _dns_cache_built = True


def _match_ai_ip(ip):
    """Check if an IP belongs to a known AI API (uses cached lookups)."""
    _build_dns_cache()
    if ip in _resolved_ips:
        return _resolved_ips[ip]
    return None


def scan_ai_agents():
    """
    Scan for hidden AI agents. Returns a list of findings.
    Each finding is a dict with event_type, severity, metadata, etc.
    """
    if psutil is None:
        return []

    findings = []
    now = datetime.datetime.utcnow().isoformat()
    system = platform.system()

    for proc in psutil.process_iter(['pid', 'name', 'exe']):
        try:
            pid = proc.info['pid']
            name = (proc.info['name'] or '').lower()
            exe = proc.info['exe'] or ''

            # Check known AI agent processes (fast — name lookup only)
            if name in AI_AGENT_PROCESSES:
                findings.append({
                    'event_type': 'AI_AGENT_DETECTED',
                    'severity': 'CRITICAL',
                    'score_delta': -40,
                    'layer': 'L4',
                    'metadata': {
                        'process': name,
                        'pid': pid,
                        'exe': exe,
                        'reason': AI_AGENT_PROCESSES[name],
                        'source': 'process_name_match',
                    },
                    'timestamp': now,
                    'platform': system,
                })
                continue

            # Check suspicious Electron apps
            if name in SUSPICIOUS_ELECTRON_NAMES:
                findings.append({
                    'event_type': 'SUSPICIOUS_ELECTRON_APP',
                    'severity': 'HIGH',
                    'score_delta': -25,
                    'layer': 'L4',
                    'metadata': {
                        'process': name,
                        'pid': pid,
                        'exe': exe,
                        'reason': SUSPICIOUS_ELECTRON_NAMES[name],
                        'source': 'electron_detection',
                    },
                    'timestamp': now,
                    'platform': system,
                })
                continue

            # Cmdline check — only for non-system/non-browser processes to avoid slowdown
            if name not in _SKIP_CMDLINE:
                try:
                    cmdline = proc.cmdline()
                    cmdline_str = ' '.join(cmdline).lower() if cmdline else ''
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    cmdline_str = ''

                if cmdline_str:
                    matched_pattern = next(
                        (p for p in AI_CMD_PATTERNS if p in cmdline_str),
                        None
                    )
                    if matched_pattern:
                        findings.append({
                            'event_type': 'AI_CMDLINE_DETECTED',
                            'severity': 'HIGH',
                            'score_delta': -20,
                            'layer': 'L4',
                            'metadata': {
                                'process': name,
                                'pid': pid,
                                'pattern': matched_pattern,
                                'cmdline_snippet': cmdline_str[:200],
                                'source': 'cmdline_inspection',
                            },
                            'timestamp': now,
                            'platform': system,
                        })

        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    return findings


def scan_ai_network_connections():
    """
    Scan active TCP connections for outbound calls to known AI API endpoints.
    """
    if psutil is None:
        return []

    findings = []
    now = datetime.datetime.utcnow().isoformat()
    system = platform.system()

    try:
        for conn in psutil.net_connections(kind='tcp'):
            if conn.raddr and conn.status == 'ESTABLISHED':
                matched = _match_ai_ip(conn.raddr.ip)
                if matched:
                    proc_name = 'unknown'
                    try:
                        proc_name = psutil.Process(conn.pid).name()
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass

                    findings.append({
                        'event_type': 'AI_API_CONNECTION',
                        'severity': 'CRITICAL',
                        'score_delta': -35,
                        'layer': 'L3',
                        'metadata': {
                            'remote_ip': conn.raddr.ip,
                            'remote_port': conn.raddr.port,
                            'domain': matched,
                            'process': proc_name,
                            'pid': conn.pid,
                            'source': 'network_monitor',
                        },
                        'timestamp': now,
                        'platform': system,
                    })
    except psutil.AccessDenied:
        pass

    return findings


def scan_hidden_windows():
    """
    Detect windows using WDA_EXCLUDEFROMCAPTURE (Windows) or
    kCGWindowSharingNone (macOS) — commonly used by AI overlays.
    """
    system = platform.system()
    if system == 'Windows':
        return _scan_hidden_windows_win()
    elif system == 'Darwin':
        return _scan_hidden_windows_mac()
    return []


def _scan_hidden_windows_win():
    try:
        import ctypes
        import ctypes.wintypes as wintypes
    except ImportError:
        return []

    WDA_EXCLUDEFROMCAPTURE = 0x00000011
    user32 = ctypes.windll.user32
    findings = []
    now = datetime.datetime.utcnow().isoformat()

    def _get_proc_name(pid):
        try:
            return psutil.Process(pid).name()
        except Exception:
            return 'unknown'

    def enum_callback(hwnd, _lparam):
        affinity = ctypes.c_uint(0)
        user32.GetWindowDisplayAffinity(hwnd, ctypes.byref(affinity))
        if affinity.value == WDA_EXCLUDEFROMCAPTURE:
            pid = ctypes.c_uint(0)
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            findings.append({
                'event_type': 'HIDDEN_WINDOW_WDA',
                'severity': 'CRITICAL',
                'score_delta': -40,
                'layer': 'L2',
                'metadata': {
                    'pid': pid.value,
                    'process': _get_proc_name(pid.value),
                    'reason': 'WDA_EXCLUDEFROMCAPTURE flag — window hidden from screen capture',
                    'source': 'window_scanner',
                },
                'timestamp': now,
                'platform': 'Windows',
            })
        return True

    EnumWindowsProc = ctypes.WINFUNCTYPE(
        ctypes.c_bool, wintypes.HWND, wintypes.LPARAM
    )
    user32.EnumWindows(EnumWindowsProc(enum_callback), 0)
    return findings


def _scan_hidden_windows_mac():
    import subprocess
    import json as json_mod

    script = '''
import Quartz, json, sys
windows = Quartz.CGWindowListCopyWindowInfo(
    Quartz.kCGWindowListOptionAll, Quartz.kCGNullWindowID
)
hidden = [
    {"name": w.get("kCGWindowOwnerName",""), "number": w.get("kCGWindowNumber",0)}
    for w in windows
    if w.get("kCGWindowSharingState") == 1
    and w.get("kCGWindowOwnerName") not in ["Dock","SystemUIServer","Window Server"]
]
print(json.dumps(hidden))
'''
    try:
        result = subprocess.run(
            ['python3', '-c', script],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            return []

        now = datetime.datetime.utcnow().isoformat()
        return [{
            'event_type': 'HIDDEN_WINDOW_MACOS',
            'severity': 'CRITICAL',
            'score_delta': -40,
            'layer': 'L2',
            'metadata': {
                'process': w['name'],
                'window_number': w['number'],
                'reason': 'kCGWindowSharingNone — window hidden from screen capture',
                'source': 'window_scanner',
            },
            'timestamp': now,
            'platform': 'Darwin',
        } for w in json_mod.loads(result.stdout or '[]')]
    except Exception:
        return []
