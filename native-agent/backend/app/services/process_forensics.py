# services/process_forensics.py

import psutil

SUSPICIOUS_PROCESSES = {
    'cluely_helper.exe': 'Cluely AI overlay app',
    'electron.exe':      'Interview Coder or unknown Electron app',
    'pmodule.exe':       'ParakeetAI hidden overlay',
    'Ghost.exe':         'LockedIn AI ghost process',
}

NON_STANDARD_PATHS = [
    '/Downloads/', '/Temp/', '/AppData/Local/Temp/',
    '/tmp/', '/var/tmp/'
]


def scan_processes() -> list:
    findings = []

    for proc in psutil.process_iter(['name', 'exe', 'cpu_percent']):
        try:
            name = proc.info['name'] or ''
            exe = proc.info['exe'] or ''
            cpu = proc.info['cpu_percent'] or 0

            if name in SUSPICIOUS_PROCESSES:
                findings.append({
                    'event_type': 'SUSPICIOUS_PROCESS',
                    'severity': 'HIGH',
                    'score_delta': -25,
                    'metadata': {
                        'process': name,
                        'reason': SUSPICIOUS_PROCESSES[name]
                    }
                })
            elif any(p in exe for p in NON_STANDARD_PATHS):
                findings.append({
                    'event_type': 'NON_STANDARD_INSTALL',
                    'severity': 'MEDIUM',
                    'score_delta': -10,
                    'metadata': {
                        'process': name,
                        'path': exe
                    }
                })
            elif cpu > 80:
                findings.append({
                    'event_type': 'CPU_SPIKE_ANOMALY',
                    'severity': 'MEDIUM',
                    'score_delta': -15,
                    'metadata': {
                        'process': name,
                        'cpu_percent': cpu
                    }
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    return findings
