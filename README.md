# exam-guardrail 🛡️

**Drop-in exam proctoring backend by [CogniVigil](https://github.com/chandutalawar187-blip/Exam-guardrial-middleware) — detect and terminate AI cheating tools, remote access apps, screen recorders, and cheat browser extensions in real time.**

[![PyPI](https://img.shields.io/pypi/v/exam-guardrail)](https://pypi.org/project/exam-guardrail/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)

---

## What It Does

`exam-guardrail` is a Python middleware that plugs into any **FastAPI** application and provides:

| Layer | What It Catches | Action |
|-------|----------------|--------|
| **L4 — Process Scanner** | AI agents (Interview Coder, Cluely, ChatGPT, Cursor, Claude), remote access (AnyDesk, TeamViewer, VNC), screen share (Zoom, Discord, Quick Assist), screen recorders (OBS, Loom, Camtasia) | **Detect + Kill** |
| **L3 — Network Monitor** | Active TCP connections to AI APIs (OpenAI, Anthropic, Google Gemini, Groq, DeepSeek, etc.) | **Detect + Flag** |
| **L2 — Hidden Window Detection** | Windows `WDA_EXCLUDEFROMCAPTURE` flag, macOS `kCGWindowSharingNone` (used by AI overlays to hide from screen capture) | **Detect + Flag** |
| **L1 — Browser Extension Scanner** | 26+ cheat extensions across Chrome, Edge, Brave (Monica AI, Brainly, Chegg, ChatGPT for Google, etc.) | **Detect + Disable** |

All findings are scored on a 0–100 credibility scale with automatic verdict assignment.

---

## Quick Start (5 Minutes)

### 1. Install

```bash
pip install exam-guardrail
```

Dependencies installed automatically: `fastapi`, `uvicorn`, `psutil`, `supabase`, `anthropic`

### 2. Minimal Server (Monitoring Only)

Create `server.py` — no database or API keys needed:

```python
from fastapi import FastAPI
from exam_guardrail import GuardrailConfig, init_guardrail

app = FastAPI()

config = GuardrailConfig(
    monitoring_only=True,       # Skip DB-dependent routes
    native_agent_block=True,    # Kill detected threats (set False to detect-only)
    native_agent_interval=3,    # Scan every 3 seconds
)

init_guardrail(app, config)
```

```bash
uvicorn server:app --host 0.0.0.0 --port 8001
```

> **Note:** Run as Administrator/root for full process termination capabilities on protected processes.

That's it. The scanner is now running in the background, terminating threats every 3 seconds.

### 3. Test It

```bash
# Trigger a scan
curl -X POST http://localhost:8001/api/native-agent/scan \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test", "block": true}'

# Check what's blocked
curl http://localhost:8001/api/native-agent/blocked-list

# Health check
curl http://localhost:8001/health
```

---

## Full Setup (With Database & AI)

For credibility reports, student management, AI-generated questions, and answer analysis:

### 1. Environment Variables

Create `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-key
ANTHROPIC_API_KEY=sk-ant-xxxxx
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

### 2. Full Server

```python
from fastapi import FastAPI
from exam_guardrail import GuardrailConfig, init_guardrail

app = FastAPI()

config = GuardrailConfig(
    # Reads from .env automatically, or set explicitly:
    supabase_url="https://your-project.supabase.co",
    supabase_key="your-key",
    anthropic_api_key="sk-ant-xxxxx",
    admin_username="admin",
    admin_password="secure-pass",
    monitoring_only=False,          # Enable all routes
    native_agent_block=True,
    native_agent_interval=3,
)

init_guardrail(app, config)
```

This mounts 30+ API routes for sessions, events, students, questions, exams, submissions, reports, and native agent scanning.

---

## Direct Scanner Usage (No Server)

Use the scanners as a library without running a server:

```python
from exam_guardrail.services.scanners.ai_agent_detector import (
    scan_ai_agents,
    scan_ai_network_connections,
    scan_hidden_windows,
)
from exam_guardrail.services.scanners.screen_share_detector import scan_screen_sharing
from exam_guardrail.services.scanners.process_blocker import scan_and_block
from exam_guardrail.services.scanners.extension_detector import (
    scan_extensions,
    restore_extensions,
)

# Detect only
ai_findings = scan_ai_agents()
network_findings = scan_ai_network_connections()
hidden_windows = scan_hidden_windows()
screen_share = scan_screen_sharing()
extensions = scan_extensions(block=False)

# Detect + Kill processes
blocked = scan_and_block()

# Detect + Disable extensions (renames folder to *.blocked)
disabled = scan_extensions(block=True)

# Re-enable extensions after exam
restore_extensions()
```

### CLI Scanner

```bash
# Run as standalone scanner (prints findings to console)
python -m exam_guardrail.services.scanners --session-id exam123

# Custom options
python -m exam_guardrail.services.scanners.agent_runner \
    --session-id exam123 \
    --api-base http://localhost:8001/api \
    --interval 3 \
    --no-block
```

---

## API Reference

### Always Available Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/events` | Ingest a behavioral event with severity and score delta |
| `POST` | `/api/sessions` | Create a new exam session |
| `GET` | `/api/sessions/{session_id}` | Get session details + all events |
| `GET` | `/api/dashboard/overview` | List all sessions (auto-marks stale ones ABANDONED) |
| `GET` | `/api/sessions/{session_id}/logs` | Detailed event logs |
| `GET` | `/api/sessions/{session_id}/logs/export` | Export logs as Excel (.xlsx) |
| `POST` | `/api/native-agent/scan` | On-demand scan with `{"session_id": "...", "block": true}` |
| `GET` | `/api/native-agent/status/{session_id}` | Agent connection status + latest findings |
| `GET` | `/api/native-agent/blocked-list` | Full list of blocked process names + extension IDs |
| `GET` | `/api/native-agent/blocked-extensions` | Currently detected cheat extensions |
| `POST` | `/api/native-agent/restore-extensions` | Re-enable all disabled extensions |
| `GET` | `/health` | Health check with version info |
| `WS` | `/ws/{session_id}` | WebSocket for real-time event streaming |

### Full Mode Routes (`monitoring_only=False`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/admin-login` | Admin authentication |
| `POST` | `/api/auth/student-login` | Student login (creates session automatically) |
| `POST` | `/api/students` | Create student record |
| `GET` | `/api/students` | List all students |
| `POST` | `/api/questions` | Deploy exam question |
| `GET` | `/api/questions?exam_name=...` | Get questions by exam or subject code |
| `POST` | `/api/exams/generate-questions` | AI-generated MCQ questions (Claude) |
| `POST` | `/api/answers` | Submit answer with AI naturalness scoring |
| `POST` | `/api/student/exam/submit` | Submit full exam |
| `GET` | `/api/reports/{session_id}` | Generate AI credibility report (Claude) |
| `GET` | `/api/reports/{session_id}/export` | Export report as Excel |
| `GET` | `/api/admin/reports` | List all credibility reports |

---

## Configuration Reference

### `GuardrailConfig` Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `supabase_url` | `str` | `""` | Supabase project URL |
| `supabase_key` | `str` | `""` | Supabase anon/service key |
| `anthropic_api_key` | `str` | `""` | For AI-powered reports & question generation |
| `admin_username` | `str` | `"admin"` | Admin login username |
| `admin_password` | `str` | `"admin"` | Admin login password |
| `monitoring_only` | `bool` | `False` | `True` = only events/sessions/agent routes; no DB needed |
| `native_agent_enabled` | `bool` | `True` | Auto-start background scanner |
| `native_agent_block` | `bool` | `True` | `True` = terminate threats; `False` = detect only |
| `native_agent_interval` | `int` | `3` | Seconds between scan cycles |
| `cors_origins` | `list` | `["*"]` | CORS allowed origins |
| `session_expiry_hours` | `int` | `2` | Mark sessions older than this as ABANDONED |
| `severity_critical` | `int` | `-15` | Score penalty for CRITICAL events |
| `severity_high` | `int` | `-10` | Score penalty for HIGH events |
| `severity_medium` | `int` | `-5` | Score penalty for MEDIUM events |
| `severity_low` | `int` | `-2` | Score penalty for LOW events |
| `compounding_penalty_window_minutes` | `int` | `5` | Time window for compounding violations |
| `compounding_penalty_threshold` | `int` | `3` | Events in window to trigger extra penalty |
| `compounding_penalty_extra` | `int` | `10` | Extra deduction when threshold met |

---

## What Gets Detected

### AI Agents & Coding Tools (16 processes)

| Tool | Process Name |
|------|-------------|
| Interview Coder | `interviewcoder.exe` |
| Cluely | `cluely.exe`, `cluely_helper.exe` |
| ParakeetAI | `pmodule.exe` |
| LockedIn AI | `ghost.exe` |
| ChatGPT Desktop | `chatgpt.exe` |
| Claude Desktop | `claude.exe` |
| Cursor | `cursor.exe` |
| GitHub Copilot | `copilot.exe` |
| Windsurf | `windsurf.exe` |
| Google Gemini | `gemini.exe` |
| MS Copilot Proxy | `mscopilot_proxy.exe` |
| Chegg | `chegg.exe` |
| Brainly | `brainly.exe` |
| Photomath | `photomath.exe` |
| Socratic | `socratic.exe` |
| Suspicious Electron | `electron.exe` (flagged as potential AI overlay) |

### AI API Network Connections (12 domains)

`api.openai.com` · `api.anthropic.com` · `generativelanguage.googleapis.com` · `api.groq.com` · `api.cohere.ai` · `api.mistral.ai` · `api.perplexity.ai` · `api.together.xyz` · `api.replicate.com` · `api.deepseek.com` · `api.fireworks.ai` · `api.x.ai`

### Command-Line Pattern Detection (13 patterns)

Inspects process command-line arguments for: `openai`, `anthropic`, `chatgpt`, `claude`, `gemini`, `copilot`, `codewhisperer`, `gpt-4`, `gpt4`, `llama`, `--ai-`, `--model`, `huggingface`

### Remote Access Tools (16 processes)

AnyDesk · TeamViewer · Chrome Remote Desktop · VNC Server/Viewer · UltraViewer · Parsec · RustDesk · Ammyy Admin · Supremo · Splashtop · LogMeIn · BeyondTrust · ScreenConnect

### Screen Share / Meeting Apps (13 processes)

Zoom · Microsoft Teams · Slack · Skype · Discord · Cisco Webex · GoToMeeting · join.me · BlueJeans · Zhumu · **Quick Assist** · Samsung Quick Share · Zoom Capture Host

### Screen Recorders (15 processes)

OBS Studio (32/64-bit) · Streamlabs · Camtasia · Snagit · Bandicam · vMix · XSplit · Screencastify · Loom · ShareX · ScreenPal · Screenpresso · Kazam · SimpleScreenRecorder · FFmpeg

### Browser Extensions (26 extensions)

**AI Assistants:** Monica AI · ChatGPT for Google · UseChatGPT · Merlin · Sider AI · MaxAI · Copilot Bing · Phind · Perplexity AI

**Cheating Tools:** Brainly · Chegg · CourseHero · Bartleby

**Writing AI:** Grammarly AI · QuillBot · Copy AI · Jasper AI

**Screen Capture:** Screencastify · Loom · GoFullPage · Scribe

**Remote Access:** Chrome Remote Desktop · AnyDesk

Scans Chrome, Edge, and Brave (all profiles).

---

## Credibility Scoring

Every event affects the session's credibility score (starts at 100):

| Score Range | Verdict | Meaning |
|-------------|---------|---------|
| 90–100 | `CLEAR` | No significant issues |
| 70–89 | `UNDER_REVIEW` | Minor issues detected |
| 50–69 | `SUSPICIOUS` | Multiple violations |
| 0–49 | `FLAGGED` | Strong evidence of cheating |

### Event Severity Levels

| Severity | Default Penalty | Example |
|----------|----------------|---------|
| `CRITICAL` | -15 | AI agent detected, remote access, hidden window |
| `HIGH` | -10 | Tab switch, clipboard, AI cmdline pattern |
| `MEDIUM` | -5 | Gaze away, loud audio, screen resize |
| `LOW` | -2 | Right-click attempt |

Compounding penalties apply when 3+ events occur within 5 minutes (configurable).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Browser)                 │
│  exam-guardrail (npm) — L1/L2 behavioral detection  │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐   │
│  │useGuardrail│ │ Overlay  │  │  GuardrailSDK   │   │
│  └──────┬─────┘ └──────────┘  └───────┬─────────┘   │
│         │                             │              │
│         └─── POST /api/events ────────┘              │
│         └─── POST /api/native-agent/scan ──────┐     │
└────────────────────────────────────────────────┼─────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────┐
│              Backend (FastAPI + Python)               │
│      exam-guardrail (pip) — L3/L4 native detection   │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │          NativeAgentMiddleware (ASGI)            │ │
│  │  ┌────────────────┐  ┌──────────────────────┐   │ │
│  │  │  AI Agent       │  │  Screen Share        │   │ │
│  │  │  Detector       │  │  Detector            │   │ │
│  │  ├────────────────┤  ├──────────────────────┤   │ │
│  │  │  Network        │  │  Extension           │   │ │
│  │  │  Monitor        │  │  Detector            │   │ │
│  │  ├────────────────┤  ├──────────────────────┤   │ │
│  │  │  Hidden Window  │  │  Process             │   │ │
│  │  │  Detector       │  │  Blocker (SIGKILL)   │   │ │
│  │  └────────────────┘  └──────────────────────┘   │ │
│  └─────────────────────────────────────────────────┘ │
│                        │                              │
│                        ▼                              │
│              Supabase (PostgreSQL)                    │
│              Claude AI (Reports)                     │
└─────────────────────────────────────────────────────┘
```

---

## Using with the npm Frontend Package

The Python backend is designed to work with the [`exam-guardrail`](https://www.npmjs.com/package/exam-guardrail) npm package:

```bash
# Frontend
npm install exam-guardrail

# Backend
pip install exam-guardrail
```

```jsx
// React frontend — connects to your Python backend
import { useGuardrail } from 'exam-guardrail/react';

function ExamPage() {
  const {
    violations, mediaState, faceStatus, audioLevel, agentStatus,
    requestMedia, startProctoring, triggerAgentScan, stop,
  } = useGuardrail({
    apiBase: '/api',          // Proxy to your Python backend
    sessionId: 'exam-123',
    userId: 'student-456',
    autoStart: true,
  });

  return (
    <div>
      <p>Violations: {violations}</p>
      <p>Face: {faceStatus}</p>
      <p>Agent: {agentStatus}</p>
      <button onClick={triggerAgentScan}>Scan for AI Agents</button>
    </div>
  );
}
```

Configure your frontend build tool to proxy `/api` to the Python backend:

```js
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:8001',
    },
  },
};
```

---

## Deployment

### Self-Hosted (Docker)

```bash
docker-compose up --build
# Starts: MongoDB + Backend + Frontend on ports 8000 & 5173
```

### Vercel (Cloud)

Deploy frontend + backend serverless to Vercel in minutes:

```bash
npm install -g vercel
vercel --prod
```

**See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for full guide:**
- Frontend auto-deployed to Vercel Edge
- Backend as Python serverless functions
- Set environment variables in Vercel dashboard
- Auto-scales with usage

### Other Platforms

- **Railway**: `railway up` — simplest for Python/FastAPI
- **Render**: Full managed database + backend support
- **Fly.io**: Docker-native, good pricing
- **AWS**: ECS, Lambda, RDS (most complex)

For production, ensure:
- ✅ Environment variables set (SUPABASE_URL, SUPABASE_KEY, etc.)
- ✅ HTTPS enabled (automatic on Vercel, Railway, Render)
- ✅ Admin credentials changed from defaults
- ✅ CORS origins restricted to your domain(s)

---

## Platform Support

| Platform | Process Scanning | Network Monitor | Extension Scanner | Process Blocking | Hidden Window Detection |
|----------|:---:|:---:|:---:|:---:|:---:|
| **Windows** | ✅ | ✅ | ✅ Chrome/Edge/Brave | ✅ (Admin recommended) | ✅ WDA_EXCLUDEFROMCAPTURE |
| **macOS** | ✅ | ✅ | ✅ Chrome/Edge/Brave | ✅ (sudo recommended) | ✅ kCGWindowSharingNone |
| **Linux** | ✅ | ✅ | ✅ Chrome/Edge/Brave | ✅ | ❌ |

---

## Important Notes

- **Run as Administrator** (Windows) or **sudo** (macOS/Linux) for full process termination capabilities. Without elevation, killing UWP/Store apps (e.g., Quick Assist) may fail with ACCESS_DENIED.
- The process blocker uses **SIGKILL** (not SIGTERM) because Electron-based apps intercept SIGTERM.
- Browser extensions are disabled by **renaming the extension folder** to `*.blocked`. They are automatically restored when the middleware shuts down, or manually via `POST /api/native-agent/restore-extensions`.
- System-critical processes (explorer.exe, svchost.exe, browsers, python, node, etc.) are on an allowlist and are **never terminated**.

---

## License

MIT © [CogniVigil](https://github.com/chandutalawar187-blip/Exam-guardrial-middleware)
