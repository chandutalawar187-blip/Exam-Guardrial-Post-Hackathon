// exam-guardrail-sdk/src/ProctoringOverlay.jsx
// Drop-in React component — camera preview + audio level bar + face status.
//
// Usage:
//   import { ProctoringOverlay } from 'exam-guardrail/overlay';

import React, { useRef, useEffect, useState } from 'react';

export function ProctoringOverlay({
  videoStream = null,
  faceStatus = 'ok',
  audioLevel = 0,
  position = 'bottom-right',
  compact = false
}) {
  const videoRef = useRef(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  if (!videoStream) return null;

  const posStyles = {
    'bottom-right': { bottom: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'top-left': { top: 16, left: 16 }
  };

  const size = compact ? { width: 120, height: 90 } : { width: 180, height: 135 };

  const statusColor = faceStatus === 'ok' ? '#22c55e'
    : faceStatus === 'looking_away' ? '#eab308' : '#ef4444';

  const statusLabel = faceStatus === 'ok' ? 'Face OK'
    : faceStatus === 'looking_away' ? 'Look at screen' : 'No face detected';

  const containerStyle = {
    position: 'fixed',
    zIndex: 99999,
    ...posStyles[position] || posStyles['bottom-right'],
    background: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 11,
    color: '#fff',
    transition: 'opacity 0.2s',
    opacity: hidden ? 0.2 : 1
  };

  return (
    <div style={containerStyle} onMouseEnter={() => setHidden(false)} title="Proctoring Monitor">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7 }}>
          Proctoring
        </span>
        <button
          onClick={() => setHidden(h => !h)}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px', opacity: 0.5 }}
        >
          {hidden ? '\u25FB' : '\u25AC'}
        </button>
      </div>

      {!hidden && (
        <>
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', ...size }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0, boxShadow: `0 0 6px ${statusColor}` }} />
              <span style={{ fontSize: 9, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{statusLabel}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, opacity: 0.6, width: 22 }}>&#127908;</span>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${Math.min(100, audioLevel)}%`,
                background: audioLevel > 70 ? '#ef4444' : audioLevel > 40 ? '#eab308' : '#22c55e',
                transition: 'width 0.15s, background 0.3s'
              }} />
            </div>
            <span style={{ fontSize: 9, opacity: 0.5, width: 20, textAlign: 'right' }}>{audioLevel}</span>
          </div>
        </>
      )}
    </div>
  );
}
