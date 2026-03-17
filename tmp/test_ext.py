"""Test extension scanner."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from exam_guardrail.services.scanners.extension_detector import scan_extensions

findings = scan_extensions(block=False)
for f in findings:
    m = f["metadata"]
    print(f'  {m["browser"]}/{m["profile"]}: {m["reason"]}  (ID: {m["extension_id"]})')

print(f'\nTotal cheating extensions found: {len(findings)}')
