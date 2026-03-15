# Cognivigil Sentinel Browser Extension

**Version:** 3.0.0  
**Platform:** Chrome / Chromium-based browsers  
**Purpose:** Real-time exam proctoring and integrity monitoring

## Overview

The Cognivigil Sentinel is a browser extension that monitors exam integrity by detecting and reporting policy violations in real-time. It provides a self-contained proctoring system that works seamlessly with the Exam Guardrial dashboard.

### Key Features

🛡️ **Real-Time Violation Detection**
- Tab switching detection
- Window focus loss monitoring
- Developer tools prevention
- Clipboard activity blocking
- Right-click and keyboard shortcuts prevention
- Fullscreen enforcement

📊 **Live Monitoring**
- Violation counter in browser toolbar
- Status banner on exam page
- Timestamped violation log
- Severity-based color coding

🔗 **Backend Integration**
- Automatic violation forwarding to API
- Session-aware event submission
- Credibility score impact tracking
- AI-powered forensic analysis

📈 **Admin Dashboard Integration**
- View all violations for a session
- Forensic analysis of patterns
- Red flags and recommendations
- Automated credibility scoring

## Quick Start

### Installation

1. Clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `browser-extension/` folder
6. Extension appears in toolbar as 🛡️

### Test

1. Open `test-page.html` in your browser
2. Click the "Trigger Violation" button
3. Watch violation appear in extension popup
4. Check console logs for debug output

### Deploy

1. Start the backend: `python -m uvicorn app.main:app --reload`
2. Start the frontend: `npm run dev`
3. Login to dashboard
4. Start an exam
5. Sentinel automatically activates
6. Violations are forwarded and logged

## File Structure

```
browser-extension/
├── README.md                    # This file
├── SETUP_GUIDE.md              # Installation and setup instructions
├── INTEGRATION_GUIDE.md         # Technical integration details
├── manifest.json               # Extension configuration
│   └── version: 3.0.0
│   └── permissions: scripting, tabs, windows, storage
│   └── target URLs: localhost:5173, localhost:3000, localhost:8000
│
├── background.js               # Service Worker
│   ├── SENTINEL_ACTIVATE/DEACTIVATE handlers
│   ├── Violation event forwarding to backend
│   ├── Storage proxy for CSP issues
│   └── Message routing (600+ lines)
│
├── content.js                 # Content Script
│   ├── Violation detection (8+ event types)
│   ├── Banner rendering (Shadow DOM)
│   ├── Input blocker when inactive
│   ├── Re-injection guard
│   └── Event listeners for all violation types
│
├── popup.html                 # Popup UI
│   ├── Status pill (LIVE/IDLE)
│   ├── Violation statistics
│   ├── Timestamped violation log
│   └── Clear button
│
├── popup.js                   # Popup Controller
│   ├── Reads from chrome.storage.local
│   ├── Renders violation log
│   ├── Live refresh every 2 seconds
│   └── Auto-formatting and timestamps
│
└── test-page.html            # Local testing page
    ├── Standalone test UI
    ├── Sample violation triggers
    └── No external dependencies
```

## Violation Types

The extension detects these violation types:

| Type | Severity | Action | Detection |
|---|---|---|---|
| TAB_HIDDEN | HIGH | Report | Document visibility change |
| WINDOW_FOCUS_LOST | HIGH | Report | Window blur event |
| RIGHT_CLICK | MEDIUM | Block + Report | contextmenu event |
| CLIPBOARD_ATTEMPT | HIGH | Block + Report | copy/cut/paste events |
| DEVTOOLS_ATTEMPT | CRITICAL | Block + Report | F12, Ctrl+I, Ctrl+U, Ctrl+J, Ctrl+Shift+C |
| FULLSCREEN_EXIT | CRITICAL | Report | fullscreenchange event |

## Message Protocol

### Frontend → Extension

```javascript
// Activate
{
  type: 'SENTINEL_ACTIVATE',
  sessionId: 'session-uuid',
  studentUid: 'student-uid'
}

// Deactivate
{
  type: 'SENTINEL_DEACTIVATE'
}
```

### Extension → Backend

```javascript
POST /api/events
{
  "session_id": "session-uuid",
  "event_type": "TAB_HIDDEN|...",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "timestamp": "2024-03-14T10:30:00Z",
  "violation_number": 1
}
```

### Extension → Frontend

```javascript
// Violation update
{
  type: 'VIOLATION_COUNT_UPDATE',
  count: 5,
  severity: 'HIGH'
}
```

## Integration Points

### With Dashboard Frontend

```javascript
// Activate on exam start
import { activateSentinel } from './utils/sentinelExtension';
await activateSentinel(sessionId, studentUid, authToken);

// Monitor violations
import { useSentinelMonitoring } from './hooks/useSentinelMonitoring';
const { violations, extensionActive } = useSentinelMonitoring(...);

// Deactivate on exam end
import { deactivateSentinel } from './utils/sentinelExtension';
await deactivateSentinel();
```

### With Backend

Extension forwards violations to:
```
POST http://localhost:8000/api/events
```

Backend stores violation and updates session status:
- Credibility score impact
- Event log entry
- AI analysis trigger

### With Admin Dashboard

Admin views violations in SessionDetail page:
- **Events Tab:** Violation timeline
- **Report Tab:** AI forensic analysis
- **Analysis Tab:** Verdict reasoning

## Architecture

### Message Flow

1. **Content Script** detects violation
2. Sends `VIOLATION` message to **Background Worker**
3. **Background Worker** stores locally and forwards to backend
4. **Backend** stores event and updates credibility
5. **Background Worker** sends update back to Content Script
6. **Dashboard** receives and displays update

### Storage

- **chrome.storage.session:** activeSessionId, activeStudentUid
- **chrome.storage.local:** violation history for popup

### Permissions

- `scripting` - Inject detection scripts
- `tabs` - Monitor tab switching
- `windows` - Monitor window focus
- `storage` - Store violation data
- `activeTab` - Access current tab
- `webNavigation` - Track navigation

## Security

### Token Handling
- Auth tokens passed at activation time
- Never persisted to storage
- Cleared on deactivation

### Data Privacy
- Violations stored locally only during exam
- Backend handles persistent storage
- No personal data tracked
- Logs cleared on extension update

### Access Control
- Extension only injects on exam URLs
- Cross-origin requests restricted to backend API
- CSP-compliant message passing
- Shadow DOM isolation for UI

## Performance

### Memory
- ~5-10 MB total memory
- Lightweight Service Worker
- Single DOM node with shadow DOM

### Network
- One HTTP POST per violation
- ~200 bytes per event
- Asynchronous (non-blocking)
- No polling overhead

### CPU
- Minimal event listener overhead
- Efficient DOM operations
- No continuous polling
- Event-driven architecture

## Troubleshooting

### Extension Won't Load
- Check `manifest.json` syntax
- Ensure all files present
- Reload page: Cmd/Ctrl+Shift+R

### Violations Not Showing
- Verify sentinel is active (red banner visible)
- Check browser console for errors
- Verify backend is running

### Backend Not Receiving
- Check API URL in `background.js`
- Verify backend CORS settings
- Check network tab for POST requests

### Popup Shows No Data
- Clear browser cache
- Reload extension (chrome://extensions)
- Check browser console for JS errors

## Testing Checklist

- [ ] Extension installs without errors
- [ ] Icon appears in browser toolbar
- [ ] Popup opens and shows statistics
- [ ] Test page violation triggers work
- [ ] Backend receives violation HTTP posts
- [ ] Dashboard shows violations in SessionDetail
- [ ] Admin can view forensic analysis
- [ ] Extension deactivates on exam end
- [ ] Multiple sessions handled correctly
- [ ] Error states gracefully degraded

## Development

### Build From Source

No build step required - direct source files.

### Testing Locally

```bash
# 1. Start backend
cd backend
python -m uvicorn app.main:app --reload

# 2. Start frontend
cd dashboard  
npm run dev

# 3. Load extension
# - Open chrome://extensions
# - Click "Load unpacked"
# - Select browser-extension/ folder

# 4. Test
# - Open dashboard
# - Start exam
# - Trigger violations
# - Check popup and backend logs
```

### Debug Mode

Already enabled - set in `background.js`:
```javascript
const DEBUG = true;
```

Console logs:
- `[Sentinel]` - Content script
- `[Sentinel BG]` - Background worker

## Deployment

### For Production

1. Update `API_BASE` to production domain in `background.js`
2. Update `host_permissions` in `manifest.json`
3. Submit to Chrome Web Store (paid)
4. Distribute extension ID to students
5. Ensure backend is HTTPS only

### For Local Development

```javascript
const API_BASE = 'http://localhost:8000/api';
```

### For Self-Hosted

```javascript
const API_BASE = 'https://your-domain.com/api';
```

Then update `manifest.json`:
```json
"host_permissions": [
  "https://your-domain.com/*"
]
```

## API Compatibility

**Backend Required Endpoint:**
```
POST /api/events
{
  "session_id": string,
  "event_type": string,
  "severity": string,
  "timestamp": string
}
```

**Expected Response:**
```json
{
  "id": "string",
  "session_id": "string",
  "event_type": "string",
  "severity": "string",
  "timestamp": "string",
  "credibility_impact": number
}
```

## Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Installation instructions
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Technical details
- Dashboard INTEGRATION_GUIDE.md - Frontend wiring

## Version History

### 3.0.0 (Current)
- ✅ Manifest V3 compatible
- ✅ Service Worker architecture
- ✅ Backend API integration
- ✅ Real-time violation forwarding
- ✅ Local storage for violations
- ✅ Multi-frontend support
- ✅ Auth token handling

### 2.0.0
- Extended violation detection
- Improved popup UI
- Local violation logging

### 1.0.0
- Initial release
- Basic violation detection
- Popup interface

## Support

### Troubleshooting
See [SETUP_GUIDE.md](./SETUP_GUIDE.md#troubleshooting)

### Integration Help
See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

### Technical Issues
1. Check browser console: Right-click extension → "Inspect popup"
2. Check background worker: Right-click extension → "Inspect background page"
3. Check network tab in DevTools for API calls
4. Check backend logs for event submission errors

## License

Part of Exam Guardrial project - Internal Use Only

## Changelog

**Latest:**
- Updated for Manifest V3
- Added backend API integration
- Improved frontend integration utilities
- Added React hooks for integration

---

**Status:** ✅ Production Ready  
**Last Updated:** March 2024  
**Maintained By:** Exam Guardrial Team
