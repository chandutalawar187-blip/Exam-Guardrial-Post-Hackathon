# ExamGuardrail Agent — Desktop App

A lightweight desktop application that students must run **before** starting their online exam.
It monitors the local machine for AI tools, screen-sharing software, and cheating browser
extensions, then reports findings to the exam server in real-time.

---

## For Admins — Setup Instructions

### Prerequisites
- Python 3.9+ installed on your machine
- The exam_guardrail repo cloned locally

### Build the .exe (distribute to students)

```bat
cd agent_app
build.bat
```

This creates `agent_app/dist/ExamGuardrailAgent.exe` — share this file with students
via your LMS, Google Classroom, or exam portal.

> You can also share a download link pointing to a hosted version of the .exe.

### Telling students to run it

Add this message to your exam instructions:

> **⚠️ Before joining the exam:**
> 1. Download `ExamGuardrailAgent.exe` from [download link]
> 2. Run it and enter your **Exam Session Code** when prompted
> 3. Keep the window open throughout the exam
> 4. The exam portal will verify the agent is running before allowing you to start

---

## For Students — How to Use

1. **Download** `ExamGuardrailAgent.exe` (link provided by your instructor)
2. **Run** the file — Windows may show a SmartScreen warning; click "More info → Run anyway"
3. **Enter your Exam Session Code** in the dialog box (same code you use to enter the exam)
4. **Keep the window open** — it will show `RUNNING` in green while active
5. Go to the exam portal and start your exam — the system will verify the agent is connected

> ❌ Do NOT close the agent window during the exam. Your session will be flagged.

---

## Running from Source (developers)

```bash
cd agent_app
pip install -r requirements.txt
python guardrail_agent.py --session-id YOUR_CODE
```

Optional flags:
```
--api-url    Backend API URL (default: https://exam-guardrial-post-hackathon.vercel.app)
--no-block   Detect threats only — do not terminate processes
```

---

## How It Detects Threats

| Layer | What it detects |
|---|---|
| L1 | Hidden AI windows (ChatGPT, Copilot, Claude desktop apps) |
| L2 | AI network connections (API calls to openai.com, anthropic.com, etc.) |
| L3 | Screen sharing software (Zoom, Teams, OBS, AnyDesk, etc.) |
| L4 | Cheating browser extensions and process termination |

All findings are sent to the exam dashboard in real-time and appear in the admin monitoring view.
