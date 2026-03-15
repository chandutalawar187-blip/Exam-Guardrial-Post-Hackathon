# Browser Extension Setup Guide

Quick guide to install and configure the Cognivigil Sentinel extension.

## Installation (Chrome)

### Step 1: Enable Developer Mode

1. Open Chrome and go to `chrome://extensions`
2. Toggle "Developer mode" ON (top right corner)

### Step 2: Load Extension

1. Click "Load unpacked" button
2. Navigate to the `browser-extension/` folder in this project
3. Select the folder and click "Select Folder"

The extension should now appear in your extensions list as:
- **Name:** ExamGuardrail Sentinel
- **Version:** 3.0.0
- **Status:** Enabled

### Step 3: Verify Installation

In the Chrome toolbar, you should see the Cognivigil Sentinel icon (🛡️).

Click it to open the popup menu:
- Status: LIVE/IDLE
- Violation counter: 0
- Session ID: —

## Configuration

### Backend URL

The extension connects to your FASTapi backend. Default is:
```
http://localhost:8000/api
```

To change, edit `browser-extension/background.js`:
```javascript
const API_BASE = 'http://your-backend-url/api';
```

Then reload the extension in Chrome.

### Frontend URLs

The extension injects into these pages:
- `http://localhost:5173` (Dashboard)
- `http://localhost:3000` (Root frontend)

To add more URLs, edit `manifest.json`:
```json
"host_permissions": [
  "http://localhost:5173/*",
  "http://localhost:3000/*",
  "http://your-app-url/*"
]
```

Then reload the extension.

## Testing

### Test Violation Detection

1. Start backend and frontend
2. Login to dashboard
3. Navigate to exam page
4. Start an exam
5. Open extension popup (🛡️ icon)

**Trigger Violations:**
- **Tab Switch:** Click another browser tab
- **Force Blur:** Alt+Tab to another window
- **Dev Tools:** Press F12 or Ctrl+Shift+I
- **Right-Click:** Right-click on the page
- **Copy/Paste:** Try Ctrl+C or Ctrl+V
- **Fullscreen Exit:** Press F11

**Expected Results:**
- Violation count increases in extension popup
- Red banner appears on page
- Violations submitted to backend

### View Violation Log

Click the extension icon to open popup and see:
- Total violations
- High/Critical violations count
- Timestamped violation log
- Score impact

### Clear Violations

Click "Clear" button in popup to reset counter.

## Permissions

The extension requires these permissions:

| Permission | Use |
|---|---|
| `scripting` | Inject violation detection scripts |
| `tabs` | Monitor tab switching |
| `windows` | Monitor window focus changes |
| `storage` | Store violation data locally |
| `activeTab` | Access current tab info |
| `webNavigation` | Track page navigation |

These are required for academic integrity monitoring behavior.

## Troubleshooting

### "Extension failed to load"

**Problem:** Error when loading unpacked extension

**Solution:**
1. Verify `manifest.json` is at root of `browser-extension/` folder
2. Manifest must be valid JSON (check for syntax errors)
3. Try reloading page and retrying

### Extension icon not appearing

**Problem:** Toolbar doesn't show extension icon

**Solution:**
1. Make sure extension is enabled (toggle should be ON)
2. Try clicking "Manage extensions" menu
3. Pin extension to toolbar: Click extension icon → Pin

### Violations not showing in popup

**Problem:** Violation counter stays at 0

**Solution:**
1. Make sure you're on exam page (`/exam/*` route)
2. Extension must be activated (red banner should show)
3. Check browser console for errors:
   - Right-click extension icon → "Inspect popup"
   - Look for `[Sentinel]` log messages

### "Backend is not responding"

**Problem:** Violations not sent to backend

**Solution:**
1. Verify backend is running: `http://localhost:8000/api/health`
2. Check `API_BASE` URL in `background.js`
3. Verify CORS is enabled in backend
4. Check network tab in DevTools for POST errors

### Extension keeps deactivating

**Problem:** Sentinel shows as inactive

**Solution:**
1. Keep exam page in focus during exam
2. Extension deactivates if you close the tab
3. Can reactivate by returning to exam page
4. Check extension popup for status

## Integration with Dashboard

### Starting an Exam

When a student starts an exam in the dashboard:

```javascript
import { activateSentinel } from './utils/sentinelExtension';

async function startExam(sessionId, studentUid, authToken) {
  const activated = await activateSentinel(sessionId, studentUid, authToken);
  
  if (activated) {
    console.log('Sentinel monitoring active');
  } else {
    console.warn('Sentinel not available - install extension');
  }
}
```

### Monitoring Violations

Display violation counter during exam:

```javascript
import { useSentinelMonitoring } from './hooks/useSentinelMonitoring';

function ExamPage() {
  const { violations, extensionActive, lastViolation } = useSentinelMonitoring(
    sessionId,
    studentUid,
    authToken
  );

  return (
    <div>
      <div>Violations: {violations}</div>
      <div>Status: {extensionActive ? 'Active' : 'Inactive'}</div>
      {lastViolation && <div>Last: {lastViolation.severity}</div>}
    </div>
  );
}
```

### Ending Exam

When exam completes:

```javascript
import { deactivateSentinel, getViolations } from './utils/sentinelExtension';

async function endExam() {
  // Get final violation list
  const violations = await getViolations();
  console.log('Final violations:', violations);
  
  // Deactivate sentinel
  await deactivateSentinel();
}
```

## Monitoring in Admin Dashboard

### View Session Violations

As admin, you can see violations for each session:

1. Go to AdminDashboard
2. Click a session row to open SessionDetail
3. Click "Events" tab to see timeline
4. Each violation shows:
   - Violation type
   - Severity (color-coded)
   - Timestamp
   - Impact on credibility

### Forensic Analysis

The AI forensic report (tab: "Report") analyzes violations:

- **Red Flags:** Most concerning patterns
- **Recommendations:** Whether to pass/fail
- **Detailed Analysis:** Full forensic breakdown

## Advanced Configuration

### Custom Violation Types

To add new violation types, edit `content.js`:

```javascript
function reportViolation(type, severity = 'HIGH') {
  // Add your custom types
  if (type === 'CUSTOM_VIOLATION') {
    // Your detection logic
  }
}
```

### Custom Severity Levels

Backend supports any string for severity, but recommended is:
- `LOW` - Minor (right-click)
- `MEDIUM` - Moderate (clipboard)
- `HIGH` - Serious (tab switch)
- `CRITICAL` - Critical (dev tools)

### Auto-Deactivation

Extension will auto-deactivate when:
- Exam tab is closed
- Exam page is navigated away
- Session window is closed

## Production Deployment

For production use:

1. **Update URLs:** Change `localhost` to production domain
2. **Update manifest:** Add production domain to `host_permissions`
3. **Sign extension:** Submit to Chrome Web Store
4. **HTTPS only:** Extension only works on HTTPS in production
5. **Update API base:** Ensure backend URL is production URL

```javascript
const API_BASE = process.env.VITE_API_URL || 'http://localhost:8000/api';
```

## Support

### Debug Logs

Enable debug output by setting in `background.js`:
```javascript
const DEBUG = true; // Already enabled
```

Logs appear in:
- Extension popup console: Right-click extension → "Inspect popup"
- Background worker console: Right-click extension → "Inspect background page"

### Console Output

Look for these log prefixes:
- `[Sentinel]` - Content script logs
- `[Sentinel BG]` - Background worker logs

### Verify Extension Works

Quick test without exam:

1. Open `browser-extension/test-page.html` in Chrome
2. Click "Trigger Violation" button
3. Watch violation appear in popup
4. Check browser console for logs

## Next Steps

1. ✅ Install extension
2. ✅ Configure URLs if needed
3. ✅ Test violation detection
4. → Start exam in dashboard
5. → Verify violations sync to backend
6. → Review in SessionDetail (admin)

---

**Version:** 1.0  
**Last Updated:** March 2024
