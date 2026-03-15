// browser-extension/popup.js

document.addEventListener('DOMContentLoaded', () => {
  // Load violation count from storage
  chrome.storage.local.get(['violations'], (result) => {
    const violations = result.violations || [];
    document.getElementById('violation-count').textContent = violations.length;
  });

  // Load session ID
  chrome.storage.local.get(['sessionId'], (result) => {
    document.getElementById('session-id').textContent =
      result.sessionId || 'Not started';
  });
});
