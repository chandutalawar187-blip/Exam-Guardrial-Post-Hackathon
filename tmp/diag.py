"""Quick diagnostic — run all native agent scanners once."""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

start = time.time()

from exam_guardrail.services.scanners.ai_agent_detector import scan_ai_agents, scan_hidden_windows
from exam_guardrail.services.scanners.process_blocker import scan_and_block

print("=== AI AGENTS DETECTED ===")
agents = scan_ai_agents()
for a in agents:
    m = a["metadata"]
    print(f"  {a['event_type']}: {m['process']} (PID {m['pid']})")
print(f"  Total: {len(agents)}")

print("\n=== HIDDEN WINDOWS (WDA) ===")
hidden = scan_hidden_windows()
for h in hidden:
    m = h["metadata"]
    print(f"  {h['event_type']}: {m['process']} (PID {m['pid']})")
print(f"  Total: {len(hidden)}")

print("\n=== BLOCKING ===")
blocked = scan_and_block()
for b in blocked:
    m = b["metadata"]
    print(f"  {b['event_type']}: {m['process']} (PID {m['pid']}) blocked={b['blocked']}")
print(f"  Total blocked: {len(blocked)}")

print(f"\n=== Scan completed in {time.time()-start:.2f}s ===")
