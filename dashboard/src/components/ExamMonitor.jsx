/**
 * Cognivigil Exam Monitor Component
 * Displays proctoring status and violation counter during exam
 * Integrates with browser extension to monitor exam integrity
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Shield } from 'lucide-react';
import sentinelExtension from '../../utils/sentinelExtension';

export default function ExamMonitor({ sessionId, studentUid, authToken, onViolation }) {
  const [violations, setViolations] = useState(0);
  const [extensionActive, setExtensionActive] = useState(false);
  const [extensionAvailable, setExtensionAvailable] = useState(false);
  const [lastViolation, setLastViolation] = useState(null);

  useEffect(() => {
    // Check if extension is available
    const extensionAvailable = sentinelExtension.isExtensionAvailable();
    setExtensionAvailable(extensionAvailable);

    if (!extensionAvailable) {
      console.warn('Sentinel Extension not installed');
      return;
    }

    // Activate sentinel for this exam session
    const activateSentinel = async () => {
      const activated = await sentinelExtension.activateSentinel(
        sessionId,
        studentUid,
        authToken
      );
      setExtensionActive(activated);
    };

    activateSentinel();

    // Get initial violation count
    sentinelExtension.getViolationCount().then(setViolations);

    // Listen for violation updates from extension
    const unsubscribe = sentinelExtension.onViolationCountUpdate((violation) => {
      setViolations(violation.count);
      setLastViolation(violation);
      
      // Call parent callback if provided
      if (onViolation) {
        onViolation(violation);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      sentinelExtension.deactivateSentinel();
    };
  }, [sessionId, studentUid, authToken, onViolation]);

  // Determine severity color based on violation count
  const getSeverityColor = () => {
    if (violations === 0) return 'bg-green-600';
    if (violations < 3) return 'bg-yellow-600';
    if (violations < 6) return 'bg-orange-600';
    return 'bg-red-600';
  };

  const getSeverityLabel = () => {
    if (violations === 0) return 'Clean';
    if (violations < 3) return 'Caution';
    if (violations < 6) return 'Warning';
    return 'Critical';
  };

  const getSeverityIcon = () => {
    if (violations === 0) return <Shield size={16} />;
    if (violations < 6) return <AlertTriangle size={16} />;
    return <ShieldAlert size={16} />;
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b-2 border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Left: Sentinel Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {extensionActive ? (
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          ) : extensionAvailable ? (
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          ) : (
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          )}
          <span className="text-sm font-semibold text-gray-700">
            {extensionActive
              ? '🛡️ Sentinel Active'
              : extensionAvailable
              ? '⚠️ Sentinel Inactive'
              : '❌ Sentinel Unavailable'}
          </span>
        </div>
        <div className="hidden sm:block text-xs text-gray-500 ml-2">
          Session: <span className="font-mono">{sessionId.slice(0, 8)}...</span>
        </div>
      </div>

      {/* Right: Violation Counter */}
      <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${getSeverityColor()} text-white`}>
        <div className="flex items-center gap-1">
          {getSeverityIcon()}
          <span className="text-sm font-bold">{getSeverityLabel()}</span>
        </div>
        <div className="h-4 w-px bg-white opacity-50"></div>
        <div className="text-center">
          <div className="text-lg font-bold">{violations}</div>
          <div className="text-xs opacity-90">Violations</div>
        </div>
      </div>

      {/* violation Toast */}
      {lastViolation && (
        <div className="absolute right-6 top-full mt-1 bg-red-50 border-l-4 border-red-500 rounded px-4 py-2 text-sm text-red-700 animate-pulse">
          <strong>{lastViolation.severity || 'VIOLATION'}:</strong> Activity detected
        </div>
      )}
    </div>
  );
}

/**
 * Violation Badge Component - Smaller version for display
 */
export const ViolationBadge = ({ count, severity }) => {
  const severityColors = {
    CRITICAL: 'bg-red-600 text-white',
    HIGH: 'bg-orange-600 text-white',
    MEDIUM: 'bg-yellow-600 text-white',
    LOW: 'bg-blue-600 text-white'
  };

  if (count === 0) {
    return (
      <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center gap-1">
        <Shield size={14} /> Clean
      </div>
    );
  }

  return (
    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${severityColors[severity] || severityColors.HIGH}`}>
      <AlertTriangle size={14} /> {count} Violations
    </div>
  );
};

/**
 * Risk Indicator - Visual bar for exam monitoring
 */
export const RiskIndicator = ({ violationCount }) => {
  const riskPercentage = Math.min(violationCount * 10, 100);
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full transition-all duration-300 ${
          riskPercentage < 25
            ? 'bg-green-500'
            : riskPercentage < 50
            ? 'bg-yellow-500'
            : riskPercentage < 75
            ? 'bg-orange-500'
            : 'bg-red-500'
        }`}
        style={{ width: `${riskPercentage}%` }}
      ></div>
    </div>
  );
};
