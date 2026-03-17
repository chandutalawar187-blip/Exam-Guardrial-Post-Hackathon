# exam-guardrail 🛡️

**Drop-in exam proctoring SDK for web apps by [CogniVigil](https://github.com/chandutalawar187-blip/Exam-guardrial-middleware) — camera monitoring, face detection, behavioral violation tracking, and native AI agent detection for any browser-based exam platform.**

[![npm](https://img.shields.io/npm/v/exam-guardrail)](https://www.npmjs.com/package/exam-guardrail)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What It Does

`exam-guardrail` is a client-side JavaScript/TypeScript SDK that adds real-time proctoring to any web-based exam:

| Layer | What It Monitors | How |
|-------|-----------------|-----|
| **L1 — Behavioral** | Tab switching, window blur, clipboard (copy/paste), DevTools (F12), right-click, screen resize | Browser event listeners |
| **L2 — Camera/Audio** | Face presence, gaze direction, loud audio/talking | Camera + skin-pixel analysis (no ML model needed) |
| **L3 — Native Agent** | AI tools (Interview Coder, ChatGPT, Cursor), remote access (AnyDesk, TeamViewer), screen share (Zoom, Quick Assist, Discord), screen recorders (OBS, Loom) | Connects to Python backend for OS-level scanning |

Works with **any framework** (React, Vue, Angular, vanilla JS). React hook and overlay component included.

---

## Quick Start

### Install

```bash
npm install exam-guardrail
```

### React (Recommended)

```jsx
import { useGuardrail } from 'exam-guardrail/react';
import { ProctoringOverlay } from 'exam-guardrail/overlay';

function ExamPage() {
  const {
    violations,
    mediaState,
    faceStatus,
    audioLevel,
    agentStatus,
    requestMedia,
    startProctoring,
    triggerAgentScan,
    stop,
    getVideoStream,
    getViolationLog,
  } = useGuardrail({
    apiBase: '/api',
    sessionId: 'exam-session-123',
    userId: 'student-456',
    autoStart: true,     // Auto-enables camera, monitoring, and agent polling
  });

  return (
    <div>
      <h1>Your Exam</h1>
      <p>Violations: {violations}</p>
      <p>Camera: {mediaState}</p>
      <p>Face: {faceStatus}</p>
      <p>Audio Level: {audioLevel}%</p>
      <p>Agent Status: {agentStatus}</p>

      <button onClick={triggerAgentScan}>Scan for AI Agents</button>
      <button onClick={stop}>End Exam</button>

      {/* Floating camera preview with face/audio indicators */}
      <ProctoringOverlay
        videoStream={getVideoStream()}
        faceStatus={faceStatus}
        audioLevel={audioLevel}
        position="bottom-right"
      />
    </div>
  );
}
```

### Vanilla JavaScript

```html
<script type="module">
  import { GuardrailSDK } from 'exam-guardrail';

  const sdk = new GuardrailSDK({
    apiBase: '/api',
    onViolation: (type, severity, count) => {
      console.log(`Violation #${count}: ${type} [${severity}]`);
    },
  });

  // 1. Start session
  sdk.startSession('exam-session-123', 'student-456');

  // 2. Enable behavioral monitoring (tab switch, clipboard, devtools, etc.)
  sdk.startMonitoring();

  // 3. Request camera + mic
  const granted = await sdk.requestMedia();
  if (granted) {
    // 4. Start face detection + audio analysis
    sdk.startProctoring();
  }

  // 5. Start polling the native agent backend
  sdk.startAgentPolling(5000);

  // 6. On-demand scan for AI tools
  const result = await sdk.triggerAgentScan();
  console.log(result.findings_count, 'threats found');
  console.log(result.blocked_count, 'processes terminated');

  // 7. End session
  sdk.stop();
</script>
```

---

## Exports

### `exam-guardrail` — Core SDK

```js
import { GuardrailSDK } from 'exam-guardrail';
```

### `exam-guardrail/react` — React Hook

```js
import { useGuardrail } from 'exam-guardrail/react';
```

### `exam-guardrail/overlay` — Floating Camera Widget

```js
import { ProctoringOverlay } from 'exam-guardrail/overlay';
```

---

## API Reference

### `GuardrailSDK` Constructor Options

```ts
new GuardrailSDK(options?: {
  apiBase?: string;              // Default: '/api'
  onViolation?: (eventType: string, severity: Severity, totalCount: number) => void;
  onMediaStateChange?: (state: MediaState) => void;
  onAgentAlert?: (data: AgentStatusData) => void;
})
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `startSession(sessionId, userId?)` | `void` | Initialize a proctoring session |
| `startMonitoring()` | `void` | Attach browser event listeners for violations |
| `requestMedia()` | `Promise<boolean>` | Request camera + mic access |
| `startProctoring()` | `void` | Start face detection + audio level analysis (call after `requestMedia`) |
| `startAgentPolling(intervalMs?)` | `void` | Poll backend for native agent status (default: 5000ms) |
| `triggerAgentScan()` | `Promise<ScanResult>` | On-demand scan — returns findings + blocked count |
| `getVideoStream()` | `MediaStream \| null` | Get the camera stream (for custom video display) |
| `getAudioLevel()` | `number` | Current audio level (0–100) |
| `getFaceStatus()` | `FaceStatus` | `'ok'`, `'looking_away'`, or `'no_face'` |
| `getViolationLog()` | `ViolationEntry[]` | Full chronological violation log |
| `getAgentStatus()` | `AgentStatus` | `'connected'`, `'disconnected'`, or `'unknown'` |
| `getBlockedProcessList()` | `Promise<BlockedList>` | Get list of all blocked process names + extension IDs |
| `reportViolation(type, severity?)` | `Promise<void>` | Manually report a custom violation |
| `stop()` | `void` | Stop everything, release camera/mic |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `violations` | `number` | Total violation count |
| `violationLog` | `ViolationEntry[]` | All recorded violations |
| `mediaState` | `MediaState` | Camera/mic permission state |
| `mediaStream` | `MediaStream \| null` | Active media stream |
| `agentStatus` | `AgentStatus` | Native agent connection status |

### `useGuardrail` Hook Options

```ts
useGuardrail({
  apiBase?: string,       // Default: '/api'
  sessionId?: string,     // Auto-starts session if provided
  userId?: string,        // Student identifier
  autoStart?: boolean,    // Default: false — auto-enable everything
})
```

Returns all methods above as reactive values, plus:

| Return Value | Type | Description |
|-------------|------|-------------|
| `sdk` | `GuardrailSDK` | The underlying SDK instance |
| `violations` | `number` | Reactive — re-renders on change |
| `mediaState` | `MediaState` | Reactive |
| `faceStatus` | `FaceStatus` | Reactive (polled every 500ms) |
| `audioLevel` | `number` | Reactive (polled every 500ms) |
| `agentStatus` | `AgentStatus` | Reactive (polled every 500ms) |

Automatically cleans up on component unmount.

### `ProctoringOverlay` Props

```tsx
<ProctoringOverlay
  videoStream={getVideoStream()}   // Camera stream
  faceStatus="ok"                  // 'ok' | 'looking_away' | 'no_face'
  audioLevel={30}                  // 0–100
  position="bottom-right"          // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  compact={false}                  // true: 120×90px, false: 180×135px
/>
```

Floating, fixed-position camera preview with:
- Mirrored video feed
- Face status indicator (green/yellow/red dot)
- Audio level bar with color gradient
- Minimize/expand toggle

---

## Violation Events Detected

### Behavioral (L1)

| Event | Severity | Trigger |
|-------|----------|---------|
| `TAB_HIDDEN` | HIGH | Student switches to another tab |
| `WINDOW_FOCUS_LOST` | HIGH | Browser window loses focus |
| `CLIPBOARD_ATTEMPT` | HIGH | Copy, cut, or paste (keyboard or context menu) |
| `DEVTOOLS_ATTEMPT` | CRITICAL | F12, Ctrl+Shift+I/J/C, Ctrl+U |
| `RIGHT_CLICK` | MEDIUM | Right-click (also blocked via `preventDefault`) |
| `SCREEN_RESIZE` | HIGH | Window resized by >50px (possible split-screen) |

### Camera/Audio (L2)

| Event | Severity | Trigger | Cooldown |
|-------|----------|---------|----------|
| `FACE_NOT_DETECTED` | HIGH | No face visible for 5+ consecutive frames | 10 sec |
| `GAZE_AWAY` | MEDIUM | Looking away from screen for 5+ frames | 10 sec |
| `LOUD_AUDIO_DETECTED` | MEDIUM | Loud audio for 8+ consecutive checks | 15 sec |

### How Face Detection Works

No ML models or external APIs — pure pixel analysis:
1. Draws camera frame to a 160×120 canvas
2. Analyzes center region for skin-colored pixels
3. Skin detection: RGB thresholds (R>60, G>40, B>20, R>G, R>B)
4. Face present: >4% skin pixels in detection region
5. Gaze direction: weighted centroid of skin pixels vs. center point

---

## Connecting to the Python Backend

The SDK's native agent features (`triggerAgentScan`, `agentStatus`, `getBlockedProcessList`) require the [`exam-guardrail`](https://pypi.org/project/exam-guardrail/) Python backend for OS-level process scanning:

```bash
pip install exam-guardrail
```

```python
# server.py
from fastapi import FastAPI
from exam_guardrail import GuardrailConfig, init_guardrail

app = FastAPI()
config = GuardrailConfig(
    monitoring_only=True,
    native_agent_block=True,    # Kill detected AI agents
    native_agent_interval=3,
)
init_guardrail(app, config)
```

```bash
uvicorn server:app --port 8001
```

Then proxy `/api` from your frontend dev server:

```js
// vite.config.js
export default {
  server: {
    proxy: { '/api': 'http://localhost:8001' },
  },
};
```

```js
// next.config.js
module.exports = {
  rewrites: () => [{ source: '/api/:path*', destination: 'http://localhost:8001/api/:path*' }],
};
```

The Python backend detects and terminates 80+ threats including Interview Coder, Cluely, ChatGPT, AnyDesk, Quick Assist, OBS, and 26 browser extensions.

---

## Backend API Endpoints (Used by SDK)

These endpoints are called automatically by the SDK:

| Method | Endpoint | Called By |
|--------|----------|-----------|
| `POST` | `/api/events` | `reportViolation()` + automatic violation reporting |
| `GET` | `/api/native-agent/status/{sessionId}` | `startAgentPolling()` — polled every 5s |
| `POST` | `/api/native-agent/scan` | `triggerAgentScan()` — on-demand |
| `GET` | `/api/native-agent/blocked-list` | `getBlockedProcessList()` |

### Scan Response Format

```json
{
  "status": "completed",
  "findings_count": 3,
  "findings": [
    {
      "event_type": "SCREEN_SHARE_DETECTED",
      "severity": "CRITICAL",
      "metadata": {
        "process": "quickassist.exe",
        "pid": 34248,
        "reason": "Microsoft Quick Assist — remote screen control"
      }
    }
  ],
  "blocked_count": 1
}
```

---

## TypeScript Types

```ts
type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type MediaState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
type FaceStatus = 'ok' | 'looking_away' | 'no_face';
type AgentStatus = 'connected' | 'disconnected' | 'unknown';

interface ViolationEntry {
  eventType: string;
  severity: Severity;
  timestamp: string;
  count: number;
}

interface AgentScanResult {
  status: string;
  findings_count: number;
  findings: Finding[];
  blocked_count: number;
}
```

Full type definitions included at `exam-guardrail/dist/index.d.ts` and `exam-guardrail/dist/react.d.ts`.

---

## Framework Compatibility

| Framework | Works? | Notes |
|-----------|:------:|-------|
| React 16.8+ | ✅ | Use `useGuardrail` hook + `ProctoringOverlay` |
| React 18/19 | ✅ | Fully compatible |
| Next.js | ✅ | Use in client components (`"use client"`) |
| Vue 3 | ✅ | Import `GuardrailSDK` directly |
| Angular | ✅ | Import `GuardrailSDK` directly |
| Svelte | ✅ | Import `GuardrailSDK` directly |
| Vanilla JS | ✅ | ESM import or script tag |

---

## Browser Support

| Feature | Chrome | Edge | Firefox | Safari |
|---------|:------:|:----:|:-------:|:------:|
| Behavioral monitoring | ✅ | ✅ | ✅ | ✅ |
| Camera/Mic access | ✅ | ✅ | ✅ | ✅ |
| Face detection | ✅ | ✅ | ✅ | ✅ |
| Native agent polling | ✅ | ✅ | ✅ | ✅ |

HTTPS required for camera/mic access in production.

---

## Full Example

See the [GitHub repository](https://github.com/chandutalawar187-blip/Exam-guardrial-middleware) for a complete working exam app with:
- Landing page with student login
- Exam page with MCQ questions, timer, camera preview
- AI Agent Detection panel with scan & block
- Violation tracking with severity badges
- Results screen with score and violation summary

---

## License

MIT © [CogniVigil](https://github.com/chandutalawar187-blip/Exam-guardrial-middleware)
