# Browser Extension Integration Guide

This document explains how the Cognivigil Sentinel browser extension integrates with the backend and frontend to monitor exam integrity.

## Overview

The **Cognivigil Sentinel** browser extension is a self-contained proctoring system that:

1. **Detects** violations of exam policies (tab switching, window blur, right-click, clipboard, dev tools, fullscreen exit)
2. **Reports** violations to the FastAPI backend in real-time
3. **Displays** a monitoring banner and violation log during exams
4. **Enforces** exam compliance by blocking input when sentinel is inactive

## Architecture

### Components

```
browser-extension/
├── manifest.json          # Extension metadata and permissions
├── background.js          # Service worker for message routing
├── content.js            # DOM manipulation and violation detection
├── popup.js              # Violation log UI
├── popup.html            # Popup interface
└── test-page.html        # Local testing page
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Student Exam Page (Dashboard/Root Frontend)                 │
│ - useSentinelMonitoring hook                                │
│ - Calls activateSentinel() on exam start                   │
│ - Listens for VIOLATION_COUNT_UPDATE messages               │
└────────────────────────┬────────────────────────────────────┘
                         │
                    chrome.runtime.sendMessage()
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Browser Extension Background Service Worker (background.js) │
│ - Routes messages                                             │
│ - Forwards violations to backend API                         │
│ - Stores violations locally                                  │
│ - Broadcasts updates back to content script                  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
   POST /api/events               chrome.storage.local
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ FastAPI Backend (/api/events)                               │
│ - Receives violation events                                  │
│ - Stores in database                                         │
│ - Updates session credibility score                          │
│ - AI analysis via AGENT-B (Claude Sonnet)                   │
└─────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Backend Integration (`background.js`)

The extension's background service worker sends violations to the backend:

```javascript
POST http://localhost:8000/api/events
Content-Type: application/json
Authorization: Bearer {authToken}

{
  "session_id": "session-uuid",
  "event_type": "TAB_HIDDEN|WINDOW_BLUR|RIGHT_CLICK|CLIPBOARD|DEVTOOLS|FULLSCREEN_EXIT",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "timestamp": "2024-03-14T10:30:00Z",
  "violation_number": 1
}
```

**Severity Levels:**
- `LOW` - Minor policy violations (right-click)
- `MEDIUM` - Moderate concerns (clipboard attempt)
- `HIGH` - Serious violations (tab hidden, window blur)
- `CRITICAL` - Critical integrity issues (dev tools, fullscreen exit)

### 2. Dashboard Frontend Integration

#### Step 1: Install Extension

Install the extension in Chrome:
1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `browser-extension/` folder
5. Extension should appear as "ExamGuardrail Sentinel"

#### Step 2: Activate for Exam

When student starts exam, activate the sentinel:

```javascript
import { activateSentinel } from './utils/sentinelExtension';

// In exam start handler
await activateSentinel(sessionId, studentUid, authToken);
```

#### Step 3: Monitor Violations

Listen for violation updates:

```javascript
import { useSentinelMonitoring } from './hooks/useSentinelMonitoring';

function ExamPage() {
  const {
    violations,           // Current violation count
    extensionActive,      // Is sentinel active?
    extensionAvailable,   // Is extension installed?
    lastViolation,        // Last violation event
    loading,              // Is initializing?
    getAllViolations      // Get all violations
  } = useSentinelMonitoring(sessionId, studentUid, authToken);

  return (
    <div>
      <ExamMonitor 
        sessionId={sessionId}
        studentUid={studentUid}
        authToken={authToken}
        onViolation={(violation) => console.log('Violation:', violation)}
      />
      {/* Exam content */}
    </div>
  );
}
```

#### Step 4: End Exam

When exam completes, deactivate sentinel:

```javascript
import { deactivateSentinel } from './utils/sentinelExtension';

// In exam end handler
await deactivateSentinel();
```

## Files Provided

### Dashboard Frontend

**New Files:**
1. `dashboard/src/utils/sentinelExtension.js` - Core extension API
2. `dashboard/src/hooks/useSentinelMonitoring.js` - React hook for monitoring
3. `dashboard/src/components/ExamMonitor.jsx` - Monitoring UI component

**Key Functions:**

```javascript
// Activation
activateSentinel(sessionId, studentUid, authToken?) → Promise<boolean>
deactivateSentinel() → Promise<boolean>

// Violation tracking
onViolationCountUpdate(callback) → unsubscribe function
getViolationCount() → Promise<number>
clearViolationCount() → Promise<void>
getViolations() → Promise<Array>

// Helper
isExtensionAvailable() → boolean
```

**New Hook:**

```javascript
useSentinelMonitoring(sessionId, studentUid, authToken?)
→ {
    violations: number,
    extensionActive: boolean,
    extensionAvailable: boolean,
    lastViolation: { count, severity, timestamp },
    loading: boolean,
    clearViolations: () => Promise,
    getAllViolations: () => Promise<Array>
  }
```

**New Component:**

```jsx
<ExamMonitor 
  sessionId={string}
  studentUid={string}
  authToken={string}
  onViolation={callback}
/>
```

### Root Frontend (`/src/`)

**New File:**
- `src/utils/sentinelExtension.js` - Same as dashboard version

Can be integrated into existing exam pages using the same utilities and hooks.

## Violation Events

The extension detects and reports the following violation types:

| Violation Type | Severity | Description |
|---|---|---|
| `TAB_HIDDEN` | HIGH | Student switched away from browser tab |
| `WINDOW_FOCUS_LOST` | HIGH | Exam window lost focus |
| `RIGHT_CLICK` | MEDIUM | Right-click context menu attempted |
| `CLIPBOARD_ATTEMPT` | HIGH | Copy/cut/paste attempted |
| `DEVTOOLS_ATTEMPT` | CRITICAL | Developer tools opened (F12, Ctrl+I, etc.) |
| `FULLSCREEN_EXIT` | CRITICAL | Exited fullscreen mode |

## Backend Response

When violations are received, the backend:

1. **Stores** the event in the database
2. **Updates** session credibility score (based on violation count)
3. **Triggers** AI analysis via Claude Sonnet (AGENT-B)
4. **Returns** response to extension

```javascript
Response 200 OK
{
  "id": "event-uuid",
  "session_id": "session-uuid",
  "event_type": "TAB_HIDDEN",
  "severity": "HIGH",
  "timestamp": "2024-03-14T10:30:00Z",
  "credibility_impact": -5.2
}
```

## Popup Interface

The extension popup (`popup.html`) shows:

- **Status Pill:** Extension status (LIVE/IDLE)
- **Violation Summary:**
  - Total violations
  - High/Critical violation count
  - Score impact
- **Violation Log:** Timeline of all violations with:
  - Violation type
  - Severity badge
  - Timestamp
  - Score delta
- **Clear Button:** Reset violation log

Access via clicking extension icon in Chrome toolbar.

## Security Features

### 1. Input Blocker
When sentinel is **inactive** but page is in exam route (`/exam/*`):
- Semi-transparent blur overlay appears
- All pointer events blocked
- User cannot interact with page

### 2. Window Focus Lock
Monitors window focus changes:
- Re-focuses exam window if focus lost during active exam
- Logs focus events as violations

### 3. Banner Display
When sentinel is **active**:
- Dark navy banner appears at top of page
- Shows "🛡 Cognivigil Sentinel Active — Integrity Monitored"
- Blinking indicator shows extension is monitoring

### 4. Re-injection Guard
Mutation observer ensures:
- Banner stays injected into DOM
- Blocker overlay reappears if removed
- Extension remains active throughout exam

## Configuration

### Environment

The extension uses fixed URLs:
- **Backend API:** `http://localhost:8000/api`
- **Frontend URLs:** `localhost:5173` (dashboard), `localhost:3000` (root)

To change API URL, edit `background.js`:
```javascript
const API_BASE = 'http://your-backend-url/api';
```

### Manifest Configuration

Key manifest settings in `manifest.json`:

```json
{
  "version": "3.0.0",
  "permissions": ["scripting", "tabs", "windows", "storage", "activeTab", "webNavigation"],
  "host_permissions": [
    "http://localhost:5173/*",
    "http://localhost:3000/*",
    "http://localhost:8000/*"
  ]
}
```

## Testing

### Local Testing

Open `browser-extension/test-page.html` to test:
1. Violation detection
2. UI rendering
3. Message passing

```bash
# In browser, open:
file:///path/to/browser-extension/test-page.html
```

### Integration Testing

1. **Start backend:** `python -m uvicorn app.main:app --reload`
2. **Start frontend:** `npm run dev`
3. **Load extension:** `chrome://extensions` → Load unpacked
4. **Login and start exam**
5. **Trigger violations:** Tab switch, dev tools, etc.
6. **Verify** violations appear in:
   - Extension popup
   - Backend logs
   - SessionDetail page (admin view)

### Debug Mode

Extension logs to console with `[Sentinel]` prefix:

```javascript
[Sentinel] Content script active
[Sentinel BG] Violation forwarded to backend: TAB_HIDDEN
```

Enable debug logs in Chrome DevTools:
1. Right-click extension icon
2. Select "Inspect popup" or "Inspect background page"
3. Watch console output

## Troubleshooting

### Extension Not Installing
- Manifest version 3 required (not v2)
- Enable "Developer mode" in chrome://extensions
- Path to folder must contain manifest.json at root

### Violations Not Showing in Dashboard
- Check backend logs for POST /api/events errors
- Verify auth token is provided
- Check extension popup shows violations being recorded
- Verify CORS settings in backend

### Sentinel Banner Not Appearing
- Extension may not be installed
- Page may not be on exam route
- Check browser extensions are enabled

### Violations Not Forwarded to Backend
- Check API_BASE URL is correct
- Verify backend is running on http://localhost:8000
- Check network tab in DevTools for POST requests
- Verify auth token is valid

## Performance Considerations

### Low Overhead
- Extension uses Service Worker (lightweight)
- Minimal DOM manipulation (single shadow DOM)
- Efficient event listeners
- Storage limited to session/local

### Network Impact
- One POST per violation (5-10 requests typical)
- Small payload (~200 bytes)
- Asynchronous (doesn't block exam UI)
- No polling (event-driven)

## Security Considerations

### Token Management
- Auth token never stored in extension permanently
- Passed in memory only during exam
- Cleared on deactivation
- Not accessible to other extensions

### Data Privacy
- Violations stored locally only
- Backend handles persistent storage
- Extension does not track personal data
- Logs deleted on extension update

### CORS Policy
- Manifest allows localhost origins only
- Production deployment requires domain whitelist
- Backend CORS headers must include extension origin

## Next Steps

1. **Install** extension from `browser-extension/` folder
2. **Test** with dashboard by creating and starting exam
3. **Verify** violations appear in SessionDetail page
4. **Monitor** proctoring effectiveness in AdminDashboard

## Related Documentation

- [Dashboard Integration Guide](./dashboard/INTEGRATION_GUIDE.md) - Frontend wiring
- [Quick Start Guide](./dashboard/QUICK_START.md) - Setup instructions
- [Backend API Reference](./backend/README.md) - `/api/events` endpoint

## Support

For issues:
1. Check extension console: `Right-click extension → Inspect popup`
2. Check background service worker: `Right-click extension → Inspect background page`
3. Check browser DevTools Network tab for API requests
4. Verify backend logs: `tail -f backend/app.log`
5. Test manually with test-page.html

---

**Version:** 3.0.0  
**Last Updated:** March 2024  
**Status:** Production Ready
