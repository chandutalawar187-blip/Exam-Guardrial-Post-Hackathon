// browser-extension/background.js

// REMOVED: All LAUNCH_EXAM handling and chrome.windows.create with external URL.
// NEW: SENTINEL_ACTIVATE / DEACTIVATE handlers and VIOLATION_COUNT_UPDATE broadcast.

const DEBUG = true;
const API_BASE = 'http://localhost:8000/api';

function log(...args) { if (DEBUG) console.log('[Sentinel BG]', ...args); }

// ── MESSAGE ROUTER ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // NEW: SENTINEL_ACTIVATE handler
  if (message.type === 'SENTINEL_ACTIVATE') {
    const { sessionId, studentUid } = message;
    chrome.storage.session.set({ 
      sentinelActive: true, 
      activeSessionId: sessionId, 
      activeStudentUid: studentUid 
    }).then(() => {
      log('Sentinel ACTIVATED for session:', sessionId);
      sendResponse({ sentinelActive: true });
    });
    return true; // async
  }

  // NEW: SENTINEL_DEACTIVATE handler
  if (message.type === 'SENTINEL_DEACTIVATE') {
    chrome.storage.session.remove(['sentinelActive', 'activeSessionId', 'activeStudentUid']).then(() => {
      log('Sentinel DEACTIVATED');
      sendResponse({ sentinelActive: false });
    });
    return true; // async
  }

  // KEEP: Storage proxy logic for Content Script CSP issues
  if (message.type === 'STORAGE_SET') {
    chrome.storage.session.set({ [message.key]: message.value }).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === 'STORAGE_GET') {
    chrome.storage.session.get([message.key]).then(result => sendResponse({ value: result[message.key] ?? null }));
    return true;
  }

  // KEEP AND ENHANCE: Violation event forwarding
  if (message.type === 'VIOLATION') {
    const { violationType, severity, timestamp, count } = message;
    
    chrome.storage.session.get(['activeSessionId', 'activeStudentUid']).then(stored => {
      const payload = {
        session_id: stored.activeSessionId,
        student_uid: stored.activeStudentUid,
        event_type: violationType,
        severity: severity,
        timestamp: timestamp || new Date().toISOString(),
        violation_number: count
      };

      // Forward to backend
      fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => log('API Error:', err.message));

      // NEW: VIOLATION_COUNT_UPDATE broadcast to the exam tab
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { 
          type: 'VIOLATION_COUNT_UPDATE', 
          count: count 
        }).catch(() => {});
      }
    });

    sendResponse({ received: true });
  }

  return true;
});

// ── WINDOW FOCUS LOCK ────────────────────────────────────────
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;

  const stored = await chrome.storage.session.get(['sentinelActive']);
  if (!stored.sentinelActive) return;

  // Re-focus the window if it's an active proctored session
  // (In the self-contained app, this target is the app window)
  log('Focus lock checked');
});