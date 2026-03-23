# ExamGuardrail Agent 🛡️

**The most comprehensive, drop-in exam proctoring ecosystem for [CogniVigil](https://github.com/chandutalawar187-blip/Exam-guardrial-middleware) — detecting and neutralizing AI cheating tools, local LLMs, remote access apps, and specialized interview software in real-time.**

[![Version](https://img.shields.io/badge/version-1.7.0-blue.svg)](https://github.com/chandutalawar187-blip/Exam-Guardrial-Post-Hackathon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Status](https://img.shields.io/badge/status-active-success.svg)](#)

---

## 🚀 What's New in v1.7.0 (The AI Shield Update)

ExamGuardrail has evolved. Version 1.7.0 introduces deep-tissue detection for the next generation of academic integrity threats:

- **🤖 Next-Gen AI Detection**: Native tracking for **Perplexity**, **Poe AI**, **Jan AI**, and **Microsoft Copilot**.
- **🏠 Local Engine Blocking**: First-in-class detection of local LLM runners like **Ollama** and **LM Studio**.
- **📡 Interview Integrity**: Integrated signatures for specialized proctoring tools like **ProctorU** and **Mercer Mettl**.
- **📝 Interactive Guidance**: Professional, OS-specific setup guidance integrated directly into the web download center.

---

## 🛡️ Multi-Layer Defense Architecture

ExamGuardrail operates at four distinct layers to ensure a level playing field for every student:

| Layer | Target | Defense Mechanism |
|-------|--------|------------------|
| **L4 — Process Scanner** | **100+ Tools**: ChatGPT, Perplexity, Copilot, Ollama, LM Studio, ProctorU, AnyDesk, Zoom | **Detect + Kill (SIGKILL)** |
| **L3 — Network Monitor** | **20+ Endpoints**: OpenAI, Anthropic, Gemini, Poe, Perplexity, Microsoft AI services | **L3 Heartbeat Hijack** |
| **L2 — Overlay Detection** | Hidden AI windows (`WDA_EXCLUDEFROMCAPTURE` on Win, `kCGWindowSharingNone` on Mac) | **Window Display Affinity Check** |
| **L1 — Browser Guard** | **30+ Extensions**: Monica AI, Sider, Brainly, Merlin, Grammarly, Screen Recorders | **Automatic Extension Disabling** |

---

## 🛠️ Installation & Setup

### 📥 Download the Agent
Visit our official **[Download Center](https://exam-guardrial-post-hackathon.vercel.app/download)** for the latest v1.7.0 installers.
*We provide interactive, step-by-step guidance for Windows, macOS, and Linux to help you bypass OS security filters (SmartScreen/Gatekeeper) seamlessly.*

### 🛠️ Developer Integration (FastAPI Middleware)

```bash
pip install exam-guardrail
```

```python
from fastapi import FastAPI
from exam_guardrail import GuardrailConfig, init_guardrail

app = FastAPI()

config = GuardrailConfig(
    monitoring_only=False,          # Set True for ad-hoc monitoring
    native_agent_block=True,        # Enable active process termination
    native_agent_interval=5,        # 5-second precision scanning
    anthropic_api_key="your-key",   # For AI-powered credibility reports
)

init_guardrail(app, config)
```

---

## 🔍 Comprehensive Signature Registry (v1.7.0)

### 🤖 AI Desktop & Web Apps
ChatGPT (Desktop/Web) · Claude · **Perplexity** · **Poe AI** · **Jan AI** · **Microsoft Copilot** · Gemini · Cluely · ParakeetAI · Ghost/LockedIn · Interview Coder · Windsurf · Cursor

### 🏠 Local LLM Runners
**Ollama** · **LM Studio** · **vLLM** · Llama.cpp · Hugging Face CLI · Jan Local Engine

### 📡 Proctoring & Interview Tools
**ProctorU** · **Mercer Mettl** · SafeExamBrowser · Proctorio Service · Lockdown Browser Proxy

### 🖥️ Remote Access & Meetings
AnyDesk · TeamViewer · Zoom · Microsoft Teams · Discord · Slack · Skype · Quick Assist · Chrome Remote Desktop · RustDesk · VNC · Parsec

### 🎥 Screen Recorders
OBS Studio · Streamlabs · Loom · ShareX · Camtasia · Snagit · FFmpeg · Screencastify

---

## 📊 Intelligent Credibility Scoring

ExamGuardrail doesn't just block; it analyzes. Every violation feeds into a **0-100 Credibility Score** with automated verdicts:

- **90-100**: ✅ **CLEAR** (Pristine Session)
- **70-89**: ⚠️ **UNDER REVIEW** (Minor overlap or tab switches)
- **50-69**: 🚩 **SUSPICIOUS** (Active AI agent or network calls detected)
- **0-49**: 🚫 **FLAGGED** (Confirmed cheating attempt / Forbidden software used)

---

## 🌐 Platform Support

| Platform | Process Scan | Network Scan | Browser Guard | Active Block | Hidden Window |
|----------|:------------:|:------------:|:-------------:|:------------:|:-------------:|
| **Windows** | ✅ | ✅ | ✅ (Chrome/Edge/Brave) | ✅ (Elevated) | ✅ (WDA) |
| **macOS** | ✅ | ✅ | ✅ (Chrome/Edge/Brave) | ✅ (Sudo) | ✅ (Quartz) |
| **Linux** | ✅ | ✅ | ✅ (Chrome/Edge/Brave) | ✅ | ❌ |

---

## 📜 License
MIT © [CogniVigil](https://github.com/chandutalawar187-blip/Exam-guardrial-middleware)

---
*Built with ❤️ for academic integrity during the POST-HACKATHON cycle.*
