# services/window_scanner.py  (Windows ONLY)

import ctypes
import ctypes.wintypes as wintypes
import psutil

WDA_EXCLUDEFROMCAPTURE = 0x00000011


def get_process_name(pid: int) -> str:
    try:
        return psutil.Process(pid).name()
    except Exception:
        return 'unknown'


def scan_hidden_windows() -> list:
    """
    Scan all running windows for the WDA_EXCLUDEFROMCAPTURE flag.
    This flag is used by AI cheating tools (Cluely, ParakeetAI, etc.)
    to hide their windows from screen recording.
    """
    user32 = ctypes.windll.user32
    findings = []

    def enum_callback(hwnd, lparam):
        affinity = ctypes.c_uint(0)
        user32.GetWindowDisplayAffinity(hwnd, ctypes.byref(affinity))

        if affinity.value == WDA_EXCLUDEFROMCAPTURE:
            pid = ctypes.c_uint(0)
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            proc_name = get_process_name(pid.value)

            findings.append({
                'event_type': 'HIDDEN_WINDOW_WDA',
                'severity': 'CRITICAL',
                'score_delta': -40,
                'metadata': {
                    'pid': pid.value,
                    'process': proc_name,
                    'reason': 'WDA_EXCLUDEFROMCAPTURE flag detected'
                }
            })
        return True

    EnumWindowsProc = ctypes.WINFUNCTYPE(
        ctypes.c_bool, wintypes.HWND, wintypes.LPARAM
    )
    user32.EnumWindows(EnumWindowsProc(enum_callback), 0)

    return findings
