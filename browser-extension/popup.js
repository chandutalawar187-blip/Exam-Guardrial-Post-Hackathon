// popup.js — v2.0
// Reads violations from chrome.storage.local, renders timestamped log.

document.addEventListener('DOMContentLoaded', () => {

  function formatTime(iso) {
    try { return new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }); }
    catch { return '—'; }
  }

  function render(violations) {
    const log = document.getElementById('log');
    const total = violations.length;
    const highPlus = violations.filter(v => v.severity === 'HIGH' || v.severity === 'CRITICAL').length;
    const scoreLost = violations.reduce((a, v) => a + Math.abs(v.score_delta || 0), 0);

    document.getElementById('ct-total').textContent = total;
    document.getElementById('ct-high').textContent  = highPlus;
    document.getElementById('ct-score').textContent  = scoreLost;
    document.getElementById('session-id').textContent = violations[0]?.session_id || '—';

    if (total === 0) {
      log.innerHTML = '<div class="empty"><div class="icon">✅</div>No violations yet.</div>';
      return;
    }

    log.innerHTML = [...violations].reverse().map(v => `
      <div class="v-item">
        <span class="sev sev-${v.severity || 'LOW'}">${v.severity || 'LOW'}</span>
        <div class="v-info">
          <div class="v-type">${(v.event_type || 'UNKNOWN').replace(/_/g, ' ')}</div>
          <div class="v-time">🕐 ${formatTime(v.timestamp)}</div>
        </div>
        <span class="v-delta">${v.score_delta}</span>
      </div>
    `).join('');
  }

  // Initial load
  chrome.storage.local.get(['violations'], r => render(r.violations || []));

  // Live refresh every 2s
  setInterval(() => {
    chrome.storage.local.get(['violations'], r => render(r.violations || []));
  }, 2000);

  // Clear button
  document.getElementById('clear-btn').addEventListener('click', () => {
    chrome.storage.local.set({ violations: [] }, () => render([]));
  });
});
