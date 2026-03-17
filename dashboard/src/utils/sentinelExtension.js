/**
 * Cognivigil Sentinel Extension Integration Utility
 * Communicates with browser extension to activate/deactivate proctoring
 * and listen for violation events during exam sessions
 */

const EXTENSION_AVAILABLE_KEY = 'sentinelExtensionAvailable';

/**
 * Check if the browser extension is installed and available
 * @returns {boolean} true if extension is available
 */
export const isExtensionAvailable = () => {
  return typeof chrome !== 'undefined' && 
         typeof chrome.runtime !== 'undefined' && 
         chrome.runtime.id !== undefined;
};

/**
 * Activate the Sentinel extension for an exam session
 * @param {string} sessionId - The exam session ID
 * @param {string} studentUid - The student username/UID
 * @param {string} authToken - Optional auth token for the extension
 * @returns {Promise<boolean>} true if activation successful
 */
export const activateSentinel = (sessionId, studentUid, authToken = null) => {
  return new Promise((resolve) => {
    if (!isExtensionAvailable()) {
      console.warn('[Sentinel] Extension not available');
      resolve(false);
      return;
    }

    const message = {
      type: 'SENTINEL_ACTIVATE',
      sessionId: sessionId,
      studentUid: studentUid
    };

    chrome.runtime.sendMessage(message, (response) => {
      if (response?.sentinelActive) {
        console.log('[Sentinel] Activated for session:', sessionId);
        
        // Also store auth token if provided (for violation submission)
        if (authToken) {
          chrome.runtime.sendMessage({
            type: 'STORAGE_SET',
            key: 'studentAuthToken',
            value: authToken
          });
        }
        
        resolve(true);
      } else {
        console.warn('[Sentinel] Activation failed');
        resolve(false);
      }
    });
  });
};

/**
 * Deactivate the Sentinel extension after exam ends
 * @returns {Promise<boolean>} true if deactivation successful
 */
export const deactivateSentinel = () => {
  return new Promise((resolve) => {
    if (!isExtensionAvailable()) {
      resolve(false);
      return;
    }

    chrome.runtime.sendMessage({ type: 'SENTINEL_DEACTIVATE' }, (response) => {
      if (response?.sentinelActive === false) {
        console.log('[Sentinel] Deactivated');
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
};

/**
 * Listen for violation events from the extension
 * @param {function} callback - Called with violation data when received
 * @returns {function} Unsubscribe function
 */
export const onViolationCountUpdate = (callback) => {
  if (!isExtensionAvailable()) {
    console.warn('[Sentinel] Extension not available for violation listening');
    return () => {};
  }

  const messageHandler = (message) => {
    if (message.type === 'VIOLATION_COUNT_UPDATE') {
      callback({
        count: message.count,
        severity: message.severity,
        timestamp: new Date().toISOString()
      });
    }
  };

  chrome.runtime.onMessage.addListener(messageHandler);

  // Return unsubscribe function
  return () => {
    chrome.runtime.onMessage.removeListener(messageHandler);
  };
};

/**
 * Get violation count from extension storage
 * @returns {Promise<number>} Current violation count
 */
export const getViolationCount = () => {
  return new Promise((resolve) => {
    if (!isExtensionAvailable()) {
      resolve(0);
      return;
    }

    chrome.runtime.sendMessage(
      { type: 'STORAGE_GET', key: 'violationCount' },
      (response) => {
        resolve(response?.value || 0);
      }
    );
  });
};

/**
 * Clear violation count in extension storage
 * @returns {Promise<void>}
 */
export const clearViolationCount = () => {
  return new Promise((resolve) => {
    if (!isExtensionAvailable()) {
      resolve();
      return;
    }

    chrome.runtime.sendMessage(
      { type: 'STORAGE_SET', key: 'violationCount', value: 0 },
      () => resolve()
    );
  });
};

/**
 * Get all violations from extension storage
 * @returns {Promise<Array>} Array of violation objects
 */
export const getViolations = () => {
  return new Promise((resolve) => {
    if (!isExtensionAvailable()) {
      resolve([]);
      return;
    }

    chrome.storage.local.get(['violations'], (result) => {
      resolve(result.violations || []);
    });
  });
};

export default {
  isExtensionAvailable,
  activateSentinel,
  deactivateSentinel,
  onViolationCountUpdate,
  getViolationCount,
  clearViolationCount,
  getViolations
};
