# native-agent/test_wda.py

"""
WDA Detection Verification Test.
Run this on Windows to verify hidden window detection is working.
"""

import platform

if platform.system() != 'Windows':
    print('[ERROR] This test only works on Windows.')
    exit(1)

import sys
sys.path.insert(0, '../backend/app/services')

from window_scanner import scan_hidden_windows


def main():
    print('[TEST] Scanning for hidden WDA windows...')
    findings = scan_hidden_windows()

    if findings:
        print(f'[FOUND] {len(findings)} hidden window(s) detected:')
        for f in findings:
            meta = f['metadata']
            print(f'  - PID: {meta["pid"]} | Process: {meta["process"]}')
            print(f'    Reason: {meta["reason"]}')
    else:
        print('[CLEAN] No hidden windows detected.')
        print('TIP: Run an app with WDA_EXCLUDEFROMCAPTURE to test detection.')


if __name__ == '__main__':
    main()
