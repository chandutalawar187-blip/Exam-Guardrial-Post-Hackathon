# exam_guardrail/services/scanners/screen_share_detector.py
# Detects screen sharing / recording / remote access software.
#
# Three categories:
#   1. Remote access tools (AnyDesk, TeamViewer, VNC, etc.)
#   2. Screen sharing apps (Zoom screen share, Discord screen share, etc.)
#   3. Screen recording apps (OBS, Camtasia, etc.)

import platform
import datetime

try:
    import psutil
except ImportError:
    psutil = None


# ── REMOTE ACCESS TOOLS ─────────────────────────────────────
REMOTE_ACCESS = {
    'anydesk.exe':            'AnyDesk remote desktop',
    'anydesk':                'AnyDesk (macOS/Linux)',
    'teamviewer.exe':         'TeamViewer remote control',
    'teamviewer':             'TeamViewer (macOS/Linux)',
    'teamviewer_service.exe': 'TeamViewer background service',
    'tv_w32.exe':             'TeamViewer background service',
    'remoting_host.exe':      'Chrome Remote Desktop host',
    'chrome_remote_desktop':  'Chrome Remote Desktop (macOS/Linux)',
    'vncserver.exe':          'VNC Server',
    'vncserver':              'VNC Server (macOS/Linux)',
    'vncviewer.exe':          'VNC Viewer',
    'ultraviewer.exe':        'UltraViewer remote access',
    'parsecd.exe':            'Parsec remote desktop',
    'parsec':                 'Parsec (macOS/Linux)',
    'rustdesk.exe':           'RustDesk remote access',
    'rustdesk':               'RustDesk (macOS/Linux)',
    'ammyy_admin.exe':        'Ammyy Admin remote access',
    'supremo.exe':            'Supremo remote desktop',
    'splashtop.exe':          'Splashtop remote access',
    'splashtop':              'Splashtop (macOS/Linux)',
    'logmein.exe':            'LogMeIn remote access',
    'bomgar-rep-portable.exe':'BeyondTrust remote support',
    'screenconnect.exe':      'ConnectWise ScreenConnect',
}

# ── SCREEN SHARING / MEETING APPS ───────────────────────────
SCREEN_SHARE = {
    'zoom.exe':               'Zoom — screen sharing capable',
    'zoom.us':                'Zoom (macOS)',
    'zoom':                   'Zoom (Linux)',
    'caphost.exe':            'Zoom capture host (active screen share)',
    'teams.exe':              'Microsoft Teams — screen sharing capable',
    'teams':                  'Microsoft Teams (macOS/Linux)',
    'slack.exe':              'Slack — screen sharing capable',
    'slack':                  'Slack (macOS/Linux)',
    'skype.exe':              'Skype — screen sharing capable',
    'skype':                  'Skype (macOS/Linux)',
    'discord.exe':            'Discord — screen sharing capable',
    'discord':                'Discord (macOS/Linux)',
    'webex.exe':              'Cisco Webex — screen sharing',
    'webex':                  'Cisco Webex (macOS/Linux)',
    'gotomeeting.exe':        'GoToMeeting — screen sharing',
    'join.me.exe':            'join.me — screen sharing',
    'bluejeans.exe':          'BlueJeans — screen sharing',
    'zhumu.exe':              'Zhumu meeting app',
    'quickassist.exe':        'Microsoft Quick Assist — remote screen control',
    'quickshareservice.exe':  'Samsung Quick Share — file/screen sharing',
}

# ── SCREEN RECORDING APPS ───────────────────────────────────
SCREEN_RECORDERS = {
    'obs64.exe':              'OBS Studio (64-bit)',
    'obs32.exe':              'OBS Studio (32-bit)',
    'obs':                    'OBS Studio (macOS/Linux)',
    'streamlabs.exe':         'Streamlabs OBS',
    'camtasia.exe':           'Camtasia screen recorder',
    'camtasia':               'Camtasia (macOS)',
    'snagit.exe':             'Snagit screen capture',
    'snagit':                 'Snagit (macOS)',
    'bandicam.exe':           'Bandicam screen recorder',
    'vmix.exe':               'vMix professional streaming',
    'xsplit.exe':             'XSplit broadcaster',
    'screencastify.exe':      'Screencastify recorder',
    'loom.exe':               'Loom screen recorder',
    'loom':                   'Loom (macOS)',
    'sharex.exe':             'ShareX screen capture',
    'screenpal.exe':          'ScreenPal recorder',
    'screenpresso.exe':       'Screenpresso capture tool',
    'kazam':                  'Kazam screen recorder (Linux)',
    'simplescreenrecorder':   'SimpleScreenRecorder (Linux)',
    'ffmpeg':                 'FFmpeg (possible screen recording)',
}


def scan_screen_sharing():
    """
    Scan for screen sharing, remote access, and recording software.
    Returns a list of findings categorized by threat type.
    """
    if psutil is None:
        return []

    findings = []
    now = datetime.datetime.utcnow().isoformat()
    system = platform.system()

    for proc in psutil.process_iter(['pid', 'name', 'exe', 'status']):
        try:
            pid = proc.info['pid']
            name = (proc.info['name'] or '').lower()
            exe = proc.info['exe'] or ''

            # Remote access — highest threat
            if name in REMOTE_ACCESS:
                findings.append({
                    'event_type': 'REMOTE_ACCESS_DETECTED',
                    'severity': 'CRITICAL',
                    'score_delta': -50,
                    'layer': 'L4',
                    'metadata': {
                        'process': name,
                        'pid': pid,
                        'exe': exe,
                        'reason': REMOTE_ACCESS[name],
                        'category': 'remote_access',
                        'source': 'screen_share_detector',
                    },
                    'timestamp': now,
                    'platform': system,
                })

            # Screen sharing apps
            elif name in SCREEN_SHARE:
                findings.append({
                    'event_type': 'SCREEN_SHARE_DETECTED',
                    'severity': 'CRITICAL',
                    'score_delta': -50,
                    'layer': 'L4',
                    'metadata': {
                        'process': name,
                        'pid': pid,
                        'exe': exe,
                        'reason': SCREEN_SHARE[name],
                        'category': 'screen_share',
                        'source': 'screen_share_detector',
                    },
                    'timestamp': now,
                    'platform': system,
                })

            # Screen recording
            elif name in SCREEN_RECORDERS:
                findings.append({
                    'event_type': 'SCREEN_RECORDER_DETECTED',
                    'severity': 'CRITICAL',
                    'score_delta': -40,
                    'layer': 'L4',
                    'metadata': {
                        'process': name,
                        'pid': pid,
                        'exe': exe,
                        'reason': SCREEN_RECORDERS[name],
                        'category': 'screen_recorder',
                        'source': 'screen_share_detector',
                    },
                    'timestamp': now,
                    'platform': system,
                })

        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    return findings


def get_active_screen_share_pids():
    """
    Returns a set of PIDs for all detected screen sharing / remote access processes.
    Used by the process blocker to know what to terminate.
    """
    if psutil is None:
        return set()

    all_threats = {**REMOTE_ACCESS, **SCREEN_SHARE, **SCREEN_RECORDERS}
    pids = set()

    for proc in psutil.process_iter(['pid', 'name']):
        try:
            name = (proc.info['name'] or '').lower()
            if name in all_threats:
                pids.add(proc.info['pid'])
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    return pids
