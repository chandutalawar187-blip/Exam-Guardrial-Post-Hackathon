# ============================================================
# EXAMGUARDRAIL — NATIVE AGENT: PROCESS FORENSICS
# ============================================================
# Scans running processes for remote access tools, screen share
# apps, AI overlays, and suspicious executables.
# Posts CRITICAL violations to the backend API.
# ============================================================

import psutil
import requests
import datetime
import platform
import time

BACKEND_URL = 'http://localhost:8000/api/events'

# ── REMOTE ACCESS APPS ──────────────────────────────────────
# If any of these are running, the student may be letting someone
# else control their machine during the exam.
# Severity: CRITICAL | Score deduction: -50
REMOTE_ACCESS_APPS = {
    'anydesk.exe':        'AnyDesk remote desktop',
    'anydesk':            'AnyDesk remote desktop (Linux/Mac)',
    'teamviewer.exe':     'TeamViewer remote control',
    'teamviewer':         'TeamViewer (Linux/Mac)',
    'tv_w32.exe':         'TeamViewer background service',
    'remoting_host.exe':  'Chrome Remote Desktop host',
    'chrome_remote_desktop': 'Chrome Remote Desktop (Linux/Mac)',
    'vncserver.exe':      'VNC Server — remote desktop',
    'vncserver':          'VNC Server (Linux/Mac)',
    'ultraviewer.exe':    'UltraViewer remote access',
    'parsecd.exe':        'Parsec remote desktop / gaming',
    'parsec':             'Parsec (Linux/Mac)',
    'rustdesk.exe':       'RustDesk remote access',
    'rustdesk':           'RustDesk (Linux/Mac)',
}

# ── SCREEN SHARE / RECORDING APPS ───────────────────────────
# Could be sharing the screen with someone who feeds answers.
# Severity: CRITICAL | Score deduction: -50
SCREEN_SHARE_APPS = {
    'obs64.exe':          'OBS Studio (64-bit) — screen recording',
    'obs32.exe':          'OBS Studio (32-bit) — screen recording',
    'obs':                'OBS Studio (Linux/Mac)',
    'discord.exe':        'Discord — screen sharing possible',
    'discord':            'Discord (Linux/Mac)',
    'zoom.exe':           'Zoom — screen sharing possible',
    'zoom.us':            'Zoom (macOS)',
    'zoom':               'Zoom (Linux)',
    'vmix.exe':           'vMix — professional streaming',
    'teams.exe':          'Microsoft Teams — screen sharing',
    'teams':              'Microsoft Teams (Linux/Mac)',
    'slack.exe':          'Slack — screen sharing possible',
    'slack':              'Slack (Linux/Mac)',
    'skype.exe':          'Skype — screen sharing possible',
    'skype':              'Skype (Linux/Mac)',
}

# ── AI OVERLAY / CHEAT TOOLS ────────────────────────────────
# From the original process_forensics.py — known AI overlay apps.
SUSPICIOUS_PROCESSES = {
    'cluely_helper.exe':  'Cluely AI overlay app',
    'electron.exe':       'Interview Coder or unknown Electron app',
    'pmodule.exe':        'ParakeetAI hidden overlay',
    'ghost.exe':          'LockedIn AI ghost process',
}

# ── NON-STANDARD INSTALL PATHS ──────────────────────────────
NON_STANDARD_PATHS = [
    '/Downloads/', '/Temp/', '/AppData/Local/Temp/',
    '/tmp/', '/var/tmp/'
]


def scan_processes():
    """
    Iterate over all running processes, check against known
    remote access, screen share, and suspicious app dictionaries.
    Returns a list of violation findings.
    """
    findings = []

    for proc in psutil.process_iter(['pid', 'name', 'exe', 'status', 'cpu_percent']):
        try:
            pid  = proc.info['pid']
            name = (proc.info['name'] or '').lower()
            exe  = proc.info['exe'] or ''
            cpu  = proc.info['cpu_percent'] or 0

            # ── Check REMOTE ACCESS apps ──
            if name in REMOTE_ACCESS_APPS:
                finding = {
                    'type': 'VIOLATION',
                    'violationType': 'REMOTE_ACCESS',
                    'event_type': 'REMOTE_ACCESS_DETECTED',
                    'severity': 'CRITICAL',
                    'score_delta': -50,
                    'processName': name,
                    'pid': pid,
                    'metadata': {
                        'process': name,
                        'reason': REMOTE_ACCESS_APPS[name],
                        'pid': pid
                    },
                    'timestamp': datetime.datetime.utcnow().isoformat(),
                    'platform': platform.system()
                }
                findings.append(finding)

                # POST to backend immediately
                try:
                    resp = requests.post(BACKEND_URL, json=finding, timeout=5)
                    print(f'[CRITICAL] Remote access detected: {name} (PID {pid}) — reported ({resp.status_code})')
                except requests.exceptions.RequestException as e:
                    print(f'[CRITICAL] Remote access detected: {name} (PID {pid}) — API offline ({e})')

            # ── Check SCREEN SHARE apps ──
            elif name in SCREEN_SHARE_APPS:
                finding = {
                    'type': 'VIOLATION',
                    'violationType': 'SCREEN_SHARE',
                    'event_type': 'SCREEN_SHARE_DETECTED',
                    'severity': 'CRITICAL',
                    'score_delta': -50,
                    'processName': name,
                    'pid': pid,
                    'metadata': {
                        'process': name,
                        'reason': SCREEN_SHARE_APPS[name],
                        'pid': pid
                    },
                    'timestamp': datetime.datetime.utcnow().isoformat(),
                    'platform': platform.system()
                }
                findings.append(finding)

                try:
                    resp = requests.post(BACKEND_URL, json=finding, timeout=5)
                    print(f'[CRITICAL] Screen share detected: {name} (PID {pid}) — reported ({resp.status_code})')
                except requests.exceptions.RequestException as e:
                    print(f'[CRITICAL] Screen share detected: {name} (PID {pid}) — API offline ({e})')

            # ── Check AI OVERLAY / SUSPICIOUS apps ──
            elif name in SUSPICIOUS_PROCESSES:
                finding = {
                    'type': 'VIOLATION',
                    'violationType': 'SUSPICIOUS_PROCESS',
                    'event_type': 'SUSPICIOUS_PROCESS',
                    'severity': 'HIGH',
                    'score_delta': -25,
                    'processName': name,
                    'pid': pid,
                    'metadata': {
                        'process': name,
                        'reason': SUSPICIOUS_PROCESSES[name]
                    },
                    'timestamp': datetime.datetime.utcnow().isoformat(),
                    'platform': platform.system()
                }
                findings.append(finding)

                try:
                    resp = requests.post(BACKEND_URL, json=finding, timeout=5)
                    print(f'[HIGH] Suspicious process: {name} (PID {pid}) — reported ({resp.status_code})')
                except requests.exceptions.RequestException as e:
                    print(f'[HIGH] Suspicious process: {name} (PID {pid}) — API offline ({e})')

            # ── Check NON-STANDARD install paths ──
            elif any(p in exe for p in NON_STANDARD_PATHS):
                finding = {
                    'type': 'VIOLATION',
                    'violationType': 'NON_STANDARD_INSTALL',
                    'event_type': 'NON_STANDARD_INSTALL',
                    'severity': 'MEDIUM',
                    'score_delta': -10,
                    'processName': name,
                    'pid': pid,
                    'metadata': {
                        'process': name,
                        'path': exe
                    },
                    'timestamp': datetime.datetime.utcnow().isoformat(),
                    'platform': platform.system()
                }
                findings.append(finding)

                try:
                    resp = requests.post(BACKEND_URL, json=finding, timeout=5)
                    print(f'[MEDIUM] Non-standard path: {name} at {exe} — reported ({resp.status_code})')
                except requests.exceptions.RequestException as e:
                    print(f'[MEDIUM] Non-standard path: {name} — API offline ({e})')

            # ── CPU spike anomaly ──
            elif cpu > 80:
                finding = {
                    'type': 'VIOLATION',
                    'violationType': 'CPU_SPIKE_ANOMALY',
                    'event_type': 'CPU_SPIKE_ANOMALY',
                    'severity': 'MEDIUM',
                    'score_delta': -15,
                    'processName': name,
                    'pid': pid,
                    'metadata': {
                        'process': name,
                        'cpu_percent': cpu
                    },
                    'timestamp': datetime.datetime.utcnow().isoformat(),
                    'platform': platform.system()
                }
                findings.append(finding)

        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            # Process disappeared or we don't have permission — skip silently
            pass

    return findings


if __name__ == '__main__':
    print(f'[Sentinel Native Agent] Process scanner active...')
    print(f'[Sentinel Native Agent] Platform: {platform.system()}')
    print(f'[Sentinel Native Agent] Backend: {BACKEND_URL}')
    print(f'[Sentinel Native Agent] Scanning every 10 seconds...\n')

    while True:
        try:
            results = scan_processes()
            if results:
                print(f'  → {len(results)} finding(s) this cycle.')
            else:
                print(f'  → Clean scan. No threats detected.')
        except Exception as e:
            print(f'  → Scan error: {e}')

        time.sleep(10)
