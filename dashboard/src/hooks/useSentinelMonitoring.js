/**
 * useSentinelMonitoring - React Hook for Extension Integration
 * Manages Sentinel extension lifecycle and violation tracking in exam pages
 */

import { useState, useEffect, useCallback } from 'react';
import sentinelExtension from '../utils/sentinelExtension';

export const useSentinelMonitoring = (sessionId, studentUid, authToken = null) => {
  const [violations, setViolations] = useState(0);
  const [extensionActive, setExtensionActive] = useState(false);
  const [extensionAvailable, setExtensionAvailable] = useState(false);
  const [lastViolation, setLastViolation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Sentinel extension
  useEffect(() => {
    const initializeSentinel = async () => {
      try {
        // Check availability
        const available = sentinelExtension.isExtensionAvailable();
        setExtensionAvailable(available);

        if (!available) {
          console.warn('[useSentinelMonitoring] Extension not available');
          setLoading(false);
          return;
        }

        // Activate sentinel
        const activated = await sentinelExtension.activateSentinel(
          sessionId,
          studentUid,
          authToken
        );
        setExtensionActive(activated);

        // Get initial violation count
        const count = await sentinelExtension.getViolationCount();
        setViolations(count);

        setLoading(false);
      } catch (error) {
        console.error('[useSentinelMonitoring] Initialization error:', error);
        setLoading(false);
      }
    };

    if (sessionId && studentUid) {
      initializeSentinel();
    }
  }, [sessionId, studentUid, authToken]);

  // Listen for violation updates
  useEffect(() => {
    if (!extensionAvailable) return;

    const unsubscribe = sentinelExtension.onViolationCountUpdate((violation) => {
      setViolations(violation.count);
      setLastViolation(violation);
    });

    return unsubscribe;
  }, [extensionAvailable]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (extensionActive) {
        sentinelExtension.deactivateSentinel();
      }
    };
  }, [extensionActive]);

  // Clear violations
  const clearViolations = useCallback(async () => {
    await sentinelExtension.clearViolationCount();
    setViolations(0);
    setLastViolation(null);
  }, []);

  // Get all violations
  const getAllViolations = useCallback(() => {
    return sentinelExtension.getViolations();
  }, []);

  return {
    violations,
    extensionActive,
    extensionAvailable,
    lastViolation,
    loading,
    clearViolations,
    getAllViolations
  };
};

export default useSentinelMonitoring;
