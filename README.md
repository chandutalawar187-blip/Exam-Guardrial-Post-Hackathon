# ExamGuardrail

> **Integrity-First Middleware** · 5-Layer Detection · Claude AI · $0 Stack

ExamGuardrail is a lightweight middleware that monitors students' browser environments during online exams and generates a **Credibility Report** based on their digital behaviour.

## 🏗️ Architecture

| Component | Tech | Purpose |
|-----------|------|---------|
| **Sentinel Client** | Chrome MV3 Extension + React PWA | Real-time browser monitoring |
| **Auditor Dashboard** | Python FastAPI + Supabase + React | Event processing, scoring, AI reports |
| **Native Agent** | Python (psutil + Win32/CoreGraphics) | OS-level scanning |

## 🔍 Five Detection Layers

| Layer | Name | What It Catches |
|-------|------|-----------------|
| L1 | Browser Sensor | Tab switches, clipboard, keyboard hijacking, DevTools, idle |
| L2 | Hidden Window Scanner | WDA_EXCLUDEFROMCAPTURE — catches invisible AI overlays |
| L3 | Network Monitor | Outbound TCP to OpenAI, Anthropic, Groq, Gemini APIs |
| L4 | Process Forensics | Disguised process names, non-standard paths, CPU spikes |
| L5 | AI Behavioural Analysis | AI-generated answer detection, credibility reports |

## 📂 Project Structure

```
exam-guardrail/
├── backend/            Python FastAPI server
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/
│   │   ├── routers/
│   │   └── services/
│   ├── db/schema.sql
│   ├── Dockerfile
│   └── requirements.txt
├── native-agent/       OS-level scanner
│   ├── agent.py
│   ├── test_wda.py
│   └── build.py
├── browser-extension/  Chrome MV3
│   ├── manifest.json
│   ├── content.js
│   ├── background.js
│   └── popup.html
├── dashboard/          React + Vite frontend
│   ├── public/
│   └── src/
├── docker-compose.yml
└── README.md
```

## 🚀 Quick Start

### 1. Set Up Environment Variables

```bash
cp backend/.env.example backend/.env
cp dashboard/.env.example dashboard/.env
# Edit both files with your Supabase and Anthropic keys
```

### 2. Run Database Schema

Copy `backend/db/schema.sql` into Supabase SQL Editor and run it.

### 3. Start Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Start Dashboard

```bash
cd dashboard
npm install
npm run dev
```

### 5. Load Extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `browser-extension/` folder

### 6. Docker (Full Stack)

```bash
docker-compose up --build
# Dashboard: http://localhost:5173
# API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## 📊 Scoring Reference

| Score | Verdict | Action |
|-------|---------|--------|
| 90–100 | ✅ CLEAR | No action needed |
| 70–89 | 🟡 UNDER REVIEW | Flag for manual review |
| 50–69 | 🟠 SUSPICIOUS | Alert proctor immediately |
| 0–49 | 🔴 FLAGGED | Terminate and escalate |

## 🔑 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/events` | Receive violation event |
| POST | `/api/sessions` | Create new exam session |
| GET | `/api/sessions/{id}` | Full session with events |
| GET | `/api/reports/{session_id}` | Generate/get credibility report |
| WS | `/ws/{session_id}` | WebSocket for native agent |
| GET | `/api/dashboard/overview` | All active sessions |
| GET | `/health` | Health check |

---

**ExamGuardrail** · All Devices · All OS · All Students
