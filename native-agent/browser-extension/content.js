// browser-extension/content.js
// Injected into exam page at document_start

const API_BASE = 'http://localhost:8000/api';
const SESSION_ID = window.__EXAM_SESSION_ID__ || 'unknown';
const TOKEN = window.__EXAM_TOKEN__ || '';

// ── SHARED EVENT SENDER ─────────────────────────────────────────

async function sendViolation(eventType, severity, scoreDelta, metadata) {
  try {
    await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: SESSION_ID,
        event_type: eventType,
        severity: severity,
        score_delta: scoreDelta,
        platform: getPlatform(),
        device_type: getDeviceType(),
        metadata: metadata,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    console.warn('ExamGuardrail: event send failed', e);
  }
}

function getPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  return 'unknown';
}

function getDeviceType() {
  if (window.innerWidth < 640) return 'phone';
  if (window.innerWidth < 1024) return 'tablet';
  return 'laptop';
}

// ── 1. TAB SWITCH DETECTION ─────────────────────────────────────

let blurStart = null;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    blurStart = performance.now();
  } else if (blurStart) {
    const away = ((performance.now() - blurStart) / 1000).toFixed(2);
    sendViolation('TAB_SWITCH', 'MEDIUM', -10, {
      away_seconds: parseFloat(away)
    });
    blurStart = null;
  }
});

// ── 2. WINDOW RESIZE ────────────────────────────────────────────

const RESIZE_THRESHOLD = 0.80;

window.addEventListener('resize', () => {
  const ratio = (window.outerWidth * window.outerHeight) /
                (screen.width * screen.height);
  if (ratio < RESIZE_THRESHOLD) {
    sendViolation('WINDOW_RESIZE', 'LOW', -5, {
      ratio: ratio.toFixed(3),
      w: window.outerWidth,
      h: window.outerHeight
    });
  }
});

// ── 3. KEYBOARD HIJACKING ───────────────────────────────────────

const BLOCKED = [
  { key: 'c', ctrl: true },
  { key: 'v', ctrl: true },
  { key: 'u', ctrl: true },
  { key: 's', ctrl: true },
  { key: 'F12' },
  { key: 'i', ctrl: true, shift: true },
];

document.addEventListener('keydown', (e) => {
  const match = BLOCKED.find(k =>
    e.key === k.key &&
    (!k.ctrl || e.ctrlKey) &&
    (!k.shift || e.shiftKey)
  );

  if (match) {
    e.preventDefault();
    e.stopPropagation();
    sendViolation('KEYBOARD_HIJACK', 'HIGH', -20, {
      combo: `${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`
    });
  }

  if (e.key === 'PrintScreen') {
    sendViolation('PRINT_SCREEN', 'MEDIUM', 0, {});
  }
});

// ── 4. IDLE DETECTION (60 seconds) ─────────────────────────────

let idleTimer = null;
let idleFired = false;

function resetIdle() {
  idleFired = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!idleFired) {
      idleFired = true;
      sendViolation('IDLE_DETECTED', 'MEDIUM', -8, { idle_seconds: 60 });
    }
  }, 60000);
}

['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
  .forEach(e => document.addEventListener(e, resetIdle, { passive: true }));
resetIdle();

// ── 5. CLIPBOARD PASTE ──────────────────────────────────────────

document.addEventListener('paste', (e) => {
  const text = e.clipboardData?.getData('text') || '';
  sendViolation('CLIPBOARD_PASTE', 'HIGH', -20, {
    content_length: text.length,
    content_preview: text.substring(0, 50)
  });
});

// ── 6. DEVTOOLS DETECTION ───────────────────────────────────────

let devtoolsOpen = false;

setInterval(() => {
  const threshold = 160;
  const open = window.outerWidth - window.innerWidth > threshold ||
               window.outerHeight - window.innerHeight > threshold;
  if (open && !devtoolsOpen) {
    devtoolsOpen = true;
    sendViolation('DEVTOOLS_OPEN', 'HIGH', -20, {});
  } else if (!open) {
    devtoolsOpen = false;
  }
}, 1000);

// ── 7. SELENIUM/PUPPETEER DETECTION ─────────────────────────────

if (navigator.webdriver) {
  sendViolation('AUTOMATION_DETECTED', 'CRITICAL', -35, {
    webdriver: true
  });
}

// ── 8. FULLSCREEN EXIT ──────────────────────────────────────────

let examActive = false;

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && examActive) {
    sendViolation('FULLSCREEN_EXIT', 'HIGH', -15, {});
  }
});

window.startExamSentinel = () => { examActive = true; };

console.log('[ExamGuardrail] Sentinel loaded for session:', SESSION_ID);
