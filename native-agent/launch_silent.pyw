import subprocess
import sys
import os
from pathlib import Path

def launch_proctor(session_id="dev-demo-session"):
    base = Path(__file__).parent
    agent_script = base / 'agent.py'
    
    # Environment for the agent
    env = os.environ.copy()
    env["SESSION_ID"] = session_id
    env["PYTHONPATH"] = str(base.parent / 'backend' / 'app')

    # CREATE_NO_WINDOW = 0x08000000
    # DETACHED_PROCESS = 0x00000008
    subprocess.Popen(
        [sys.executable, str(agent_script)],
        env=env,
        creationflags=0x08000000 | 0x00000008,
        cwd=str(base),
        start_new_session=True
    )

if __name__ == "__main__":
    sid = sys.argv[1] if len(sys.argv) > 1 else "TEST_SESSION"
    launch_proctor(sid)
