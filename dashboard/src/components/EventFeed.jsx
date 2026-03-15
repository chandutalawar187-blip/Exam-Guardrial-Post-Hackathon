const BADGE = {
  CRITICAL: { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)',   icon: '🔴' },
  HIGH:     { bg: 'rgba(249,115,22,0.12)',  color: '#f97316', border: 'rgba(249,115,22,0.3)',  icon: '🟠' },
  MEDIUM:   { bg: 'rgba(234,179,8,0.12)',   color: '#eab308', border: 'rgba(234,179,8,0.3)',   icon: '🟡' },
  LOW:      { bg: 'rgba(79,143,255,0.12)',  color: '#4f8fff', border: 'rgba(79,143,255,0.25)', icon: '🔵' },
  INFO:     { bg: 'rgba(148,163,184,0.08)', color: '#94a3b8', border: 'rgba(148,163,184,0.2)', icon: '⚪' },
};

const EVENT_ICONS = {
  TAB_SWITCH:                  '🔀',
  HIDDEN_WINDOW_DETECTED:      '👁️',
  FORBIDDEN_NETWORK_CONNECTION:'🌐',
  CLIPBOARD_READ:              '📋',
  DEVTOOLS_OPENED:             '🔧',
  KEYBOARD_HIJACK:             '⌨️',
  AI_PROCESS_DETECTED:         '🤖',
  SUSPICIOUS_PROCESS:          '⚙️',
  IDLE_TIMEOUT:                '😴',
};

export default function EventFeed({ events }) {
  if (!events?.length) {
    return (
      <div style={{
        textAlign: 'center', padding: '16px 8px',
        color: '#4a5a7a', fontSize: 12,
        border: '1px dashed rgba(79,143,255,0.1)',
        borderRadius: 8,
      }}>
        🟢 No violations detected
      </div>
    );
  }

  return (
    <div style={{
      maxHeight: 200,
      overflowY: 'auto',
      borderRadius: 8,
      border: '1px solid rgba(79,143,255,0.1)',
      background: 'rgba(0,0,0,0.2)',
    }}>
      {events.slice(0, 30).map((e, idx) => {
        const badgeCfg = BADGE[e.severity] || BADGE.INFO;
        const eventIcon = EVENT_ICONS[e.event_type] || '⚡';
        return (
          <div
            key={e.id || idx}
            className="slide-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderBottom: idx < events.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              fontSize: 11,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,143,255,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Severity badge */}
            <span style={{
              background: badgeCfg.bg,
              color: badgeCfg.color,
              border: `1px solid ${badgeCfg.border}`,
              borderRadius: 4,
              padding: '1px 5px',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.05em',
              flexShrink: 0,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {e.severity}
            </span>

            {/* Event type */}
            <span style={{ color: '#c8d8f0', flexGrow: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {eventIcon} {e.event_type?.replace(/_/g, ' ')}
            </span>

            {/* Time */}
            <span style={{
              color: '#4a5a7a',
              flexShrink: 0,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
            }}>
              {e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '--:--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
