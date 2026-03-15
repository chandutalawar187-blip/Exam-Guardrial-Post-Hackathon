// dashboard/src/components/ActionLogDisplay.jsx
import React from 'react';

export default function ActionLogDisplay({ actionLog = [] }) {
  if (!actionLog || actionLog.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">No suspicious activities detected</p>
      </div>
    );
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
      case '🚨 CRITICAL':
        return 'bg-red-100 border-red-300 text-red-900';
      case 'HIGH':
      case '⚠️ HIGH':
        return 'bg-orange-100 border-orange-300 text-orange-900';
      case 'MEDIUM':
      case '⚠ MEDIUM':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      case 'LOW':
      case 'ℹ LOW':
        return 'bg-blue-100 border-blue-300 text-blue-900';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
      case '🚨 CRITICAL':
        return 'bg-red-200 text-red-800';
      case 'HIGH':
      case '⚠️ HIGH':
        return 'bg-orange-200 text-orange-800';
      case 'MEDIUM':
      case '⚠ MEDIUM':
        return 'bg-yellow-200 text-yellow-800';
      case 'LOW':
      case 'ℹ LOW':
        return 'bg-blue-200 text-blue-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-red-600 text-sm">Student Actions Timeline</h4>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {actionLog.map((action, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg border-l-4 transition-colors ${getSeverityColor(
              action.severity || action.raw_severity || 'LOW'
            )}`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm break-words">
                  {action.description || `Action: ${action.action}`}
                </p>
                <p className="text-xs mt-1 opacity-75">
                  {action.action}
                </p>
              </div>
              <span
                className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${getSeverityBadgeColor(
                  action.severity || action.raw_severity || 'LOW'
                )}`}
              >
                {action.severity || action.raw_severity || 'LOW'}
              </span>
            </div>
            {action.timestamp && (
              <p className="text-xs opacity-60 mt-2">
                {new Date(action.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
