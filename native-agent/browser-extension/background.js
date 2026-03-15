// browser-extension/background.js
// Service Worker — routes events from content scripts

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ExamGuardrail] Extension installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VIOLATION') {
    // Forward to popup or storage
    chrome.storage.local.get(['violations'], (result) => {
      const violations = result.violations || [];
      violations.push({
        ...message.data,
        tabId: sender.tab?.id,
        url: sender.tab?.url,
        timestamp: new Date().toISOString()
      });
      chrome.storage.local.set({ violations });
    });

    sendResponse({ status: 'received' });
  }

  return true; // Keep message channel open for async response
});

// Track tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.storage.local.get(['examTabId'], (result) => {
    if (result.examTabId && activeInfo.tabId !== result.examTabId) {
      console.log('[ExamGuardrail] Student switched away from exam tab');
    }
  });
});
