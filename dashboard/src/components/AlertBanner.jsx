import { useState, useEffect } from 'react';

export default function AlertBanner({ session }) {
  const [visible, setVisible] = useState(true);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 800);
    return () => clearInterval(t);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.08) 100%)',
      borderBottom: '1px solid rgba(239,68,68,0.3)',
      borderTop: '1px solid rgba(239,68,68,0.3)',
      padding: '12px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 90,
      backdropFilter: 'blur(10px)',
    }}>
      {/* Animated alert icon */}
      <div style={{
        width: 36, height: 36,
        background: pulse ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.4)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0,
        transition: 'background 0.4s ease',
      }}>
        🚨
      </div>

      {/* Alert content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: '#ef4444',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: 2,
        }}>
          Critical Alert — Exam Integrity Breach Detected
        </div>
        <div style={{ fontSize: 12, color: '#fca5a5' }}>
          <strong>{session.student_name || session.student_id}</strong>
          {' · '}{session.exam_name}
          {' · '}Score: <strong>{session.credibility_score}</strong>
          {' · '}Verdict: <strong>{session.verdict}</strong>
        </div>
      </div>

      {/* Score indicator */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(239,68,68,0.15)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 8,
        padding: '6px 14px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>
          {session.credibility_score}
        </div>
        <div style={{ fontSize: 9, color: '#fca5a5', letterSpacing: '0.08em' }}>SCORE</div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => setVisible(false)}
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: '1px solid rgba(239,68,68,0.25)',
          color: '#ef4444',
          borderRadius: 6,
          padding: '4px 10px',
          cursor: 'pointer',
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        Dismiss
      </button>
    </div>
  );
}
