import { useAllSessions, useSessionEvents } from '../../hooks/useSupabaseRealtime';
import ScoreGauge from '../ScoreGauge';
import AlertBanner from '../AlertBanner';
import EventFeed from '../EventFeed';
import ReportModal from '../ReportModal';
import { useState, useEffect } from 'react';
import { api, API_BASE } from '../../config';

const VERDICT_CONFIG = {
  CLEAR:        { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)',  icon: '✅', label: 'Clear' },
  UNDER_REVIEW: { color: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)',  icon: '🟡', label: 'Review' },
  SUSPICIOUS:   { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', icon: '🟠', label: 'Suspicious' },
  FLAGGED:      { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',  icon: '🚨', label: 'Flagged' },
};

function LiveIndicator() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ position:'relative', width:10, height:10 }}>
        <div style={{ position:'absolute', inset:0, background:'#22c55e', borderRadius:'50%' }} />
        <div style={{
          position:'absolute', inset:0, background:'#22c55e', borderRadius:'50%',
          animation:'pulse-ring 1.5s ease-out infinite'
        }} />
      </div>
      <span style={{ color:'#22c55e', fontSize:12, fontWeight:600, letterSpacing:'0.05em' }}>LIVE</span>
    </div>
  );
}

function StatPill({ label, value, color = '#4f8fff' }) {
  return (
    <div style={{
      background: 'rgba(79,143,255,0.06)',
      border: '1px solid rgba(79,143,255,0.15)',
      borderRadius: 8,
      padding: '6px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minWidth: 80,
    }}>
      <span style={{ fontSize: 22, fontWeight: 800, color, lineHeight:1.1 }}>{value}</span>
      <span style={{ fontSize: 10, color: '#4a5a7a', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>{label}</span>
    </div>
  );
}

function StudentCard({ session }) {
  const events = useSessionEvents(session.id);
  const cfg = VERDICT_CONFIG[session.verdict] || VERDICT_CONFIG.CLEAR;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fade-in" style={{
      background: 'linear-gradient(145deg, #080f1f 0%, #0d1729 100%)',
      borderRadius: 16,
      border: `1px solid ${cfg.border}`,
      boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
      overflow: 'hidden',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'default',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${cfg.color}22`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'; }}
    >
      {/* Card header bar */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color}22)`,
      }} />

      <div style={{ padding: '16px 18px' }}>
        {/* Student info row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `linear-gradient(135deg, ${cfg.color}33, ${cfg.color}11)`,
                border: `1px solid ${cfg.color}44`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: 13, flexShrink: 0,
              }}>
                {(session.student_name || 'S')[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#e8f0ff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {session.student_name || session.student_id}
                </div>
                <div style={{ fontSize: 11, color: '#4a5a7a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {session.exam_name}
                </div>
              </div>
            </div>
          </div>

          {/* Verdict badge */}
          <div style={{
            display:'flex', alignItems:'center', gap:5,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: 20,
            padding: '4px 10px',
            flexShrink: 0,
            marginLeft: 8,
          }}>
            <span style={{ fontSize: 10 }}>{cfg.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing:'0.04em' }}>
              {session.verdict || 'CLEAR'}
            </span>
          </div>
        </div>

        {/* Score gauge */}
        <ScoreGauge score={session.credibility_score ?? 100} verdict={session.verdict} />

        {/* Quick stats */}
        <div style={{ display:'flex', gap:6, justifyContent:'center', margin:'10px 0' }}>
          <div style={{ fontSize:11, color:'#4a5a7a', background:'rgba(255,255,255,0.03)', padding:'3px 8px', borderRadius:4 }}>
            📡 {events.length} events
          </div>
          {session.platform && (
            <div style={{ fontSize:11, color:'#4a5a7a', background:'rgba(255,255,255,0.03)', padding:'3px 8px', borderRadius:4 }}>
              💻 {session.platform}
            </div>
          )}
        </div>

        {/* Event feed toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px solid rgba(79,143,255,0.12)',
            borderRadius: 6,
            padding: '5px 10px',
            color: '#4f8fff',
            fontSize: 11,
            cursor: 'pointer',
            marginBottom: 8,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,143,255,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          {expanded ? '▲ Hide Events' : `▼ Show Event Log (${events.length})`}
        </button>

        {expanded && <EventFeed events={events} />}

        {/* Actions */}
        <div style={{ display:'flex', gap:8, marginTop:10 }}>
          <ReportModal sessionId={session.id} />
          <button
            onClick={async () => {
              if (confirm('End this session and ingest into RAG history?')) {
                await fetch(`${API_BASE}/api/sessions/${session.id}/close`, { method: 'PATCH' });
                window.location.reload();
              }
            }}
            style={{
              flex: 1,
              background: 'rgba(239,68,68,0.08)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.25)',
              padding: '8px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.2s',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          >
            🛑 End Session
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ sessions }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const flagged = sessions.filter(s => s.verdict === 'FLAGGED').length;
  const suspicious = sessions.filter(s => s.verdict === 'SUSPICIOUS').length;
  const reviewing = sessions.filter(s => s.verdict === 'UNDER_REVIEW').length;
  const clear = sessions.filter(s => !s.verdict || s.verdict === 'CLEAR').length;

  return (
    <div style={{
      background: 'linear-gradient(180deg, #060d1a 0%, #080f1f 100%)',
      borderBottom: '1px solid rgba(79,143,255,0.1)',
      padding: '0 28px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Top header row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 0',
        borderBottom: '1px solid rgba(79,143,255,0.06)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #4f8fff, #7c3aed)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 0 20px rgba(79,143,255,0.4)',
          }}>🛡️</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#e8f0ff', letterSpacing: '-0.02em' }}>
              ExamGuardrail
            </div>
            <div style={{ fontSize: 10, color: '#4a5a7a', letterSpacing: '0.1em', textTransform:'uppercase' }}>
              Auditor Dashboard
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <LiveIndicator />
          <div style={{ fontSize:12, color:'#4a5a7a', fontFamily:'JetBrains Mono, monospace' }}>
            {time.toLocaleTimeString()}
          </div>
          <div style={{
            background: 'rgba(79,143,255,0.08)',
            border: '1px solid rgba(79,143,255,0.2)',
            borderRadius: 20,
            padding: '5px 14px',
            fontSize: 12,
            color: '#4f8fff',
            fontWeight: 600,
          }}>
            {sessions.length} Active Session{sessions.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: 12,
        padding: '10px 0',
        overflowX: 'auto',
      }}>
        <StatPill label="Flagged" value={flagged} color="#ef4444" />
        <StatPill label="Suspicious" value={suspicious} color="#f97316" />
        <StatPill label="Under Review" value={reviewing} color="#eab308" />
        <StatPill label="Clear" value={clear} color="#22c55e" />
        <div style={{ flex:1 }} />
        <div style={{
          display:'flex', alignItems:'center', gap:6,
          fontSize: 11, color:'#4a5a7a',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: 6,
          padding: '4px 10px',
          whiteSpace: 'nowrap',
        }}>
          🤖 Claude AI · 🔮 RAG Pipeline · 📡 Realtime
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: 40,
    }}>
      <div style={{
        width: 80, height: 80,
        background: 'linear-gradient(135deg, rgba(79,143,255,0.15), rgba(124,58,237,0.15))',
        border: '1px solid rgba(79,143,255,0.2)',
        borderRadius: 24,
        display: 'flex', alignItems:'center', justifyContent:'center',
        fontSize: 36, marginBottom: 20,
        boxShadow: '0 0 40px rgba(79,143,255,0.1)',
      }}>🛡️</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8f0ff', marginBottom: 8 }}>
        No Active Exam Sessions
      </h2>
      <p style={{ color: '#4a5a7a', fontSize: 14, maxWidth: 380, lineHeight: 1.6 }}>
        Exam sessions will appear here automatically when students connect.
        Start a session via <code style={{ background:'rgba(79,143,255,0.1)', padding:'2px 6px', borderRadius:4, color:'#4f8fff', fontSize:12 }}>POST /api/sessions</code>
      </p>
      <div style={{
        marginTop: 24,
        display: 'flex', gap: 8,
        background: 'rgba(79,143,255,0.05)',
        border: '1px solid rgba(79,143,255,0.1)',
        borderRadius: 10,
        padding: '12px 20px',
        fontSize: 12,
        color: '#4a5a7a',
      }}>
        <span>🔍 L1: Browser</span>
        <span>·</span>
        <span>🪟 L2: Hidden Windows</span>
        <span>·</span>
        <span>🌐 L3: Network</span>
        <span>·</span>
        <span>⚙️ L4: Processes</span>
        <span>·</span>
        <span>🤖 L5: AI Analysis</span>
      </div>
    </div>
  );
}

export default function LiveMonitorComponent() {
  const sessions = useAllSessions();
  const critical = sessions.filter(s => s.credibility_score < 50 || s.verdict === 'FLAGGED');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)' }}>
      <Header sessions={sessions} />

      {critical.length > 0 && <AlertBanner session={critical[0]} />}

      {sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{
          padding: '24px 28px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
          gap: 18,
        }}>
          {sessions.map(s => <StudentCard key={s.id} session={s} />)}
        </div>
      )}
    </div>
  );
}
