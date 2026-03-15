import { useState } from 'react';
import { api, API_BASE } from '../config';

const VERDICT_CONFIG = {
  CLEAR:        { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',   icon: '✅', label: 'Clear' },
  UNDER_REVIEW: { color: '#eab308', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)',   icon: '🟡', label: 'Under Review' },
  SUSPICIOUS:   { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)',  icon: '🟠', label: 'Suspicious' },
  FLAGGED:      { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.35)',   icon: '🚨', label: 'Flagged' },
};

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct > 80 ? '#22c55e' : pct > 50 ? '#eab308' : '#ef4444';
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:11, color:'#7a90b8' }}>
        <span>AI Confidence</span>
        <span style={{ color, fontWeight:700 }}>{pct}%</span>
      </div>
      <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:2, transition:'width 0.8s ease' }} />
      </div>
    </div>
  );
}

export default function ReportModal({ sessionId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${sessionId}`, {
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      setReport(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const cfg = report ? (VERDICT_CONFIG[report.verdict] || VERDICT_CONFIG.UNDER_REVIEW) : null;

  return (
    <>
      <button
        onClick={generate}
        disabled={loading}
        style={{
          flex: 2,
          background: loading ? 'rgba(79,143,255,0.05)' : 'rgba(79,143,255,0.1)',
          color: '#4f8fff',
          border: '1px solid rgba(79,143,255,0.25)',
          padding: '8px 12px',
          borderRadius: 8,
          cursor: loading ? 'wait' : 'pointer',
          fontSize: 12,
          fontWeight: 600,
          transition: 'all 0.2s',
          fontFamily: 'Inter, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(79,143,255,0.18)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = loading ? 'rgba(79,143,255,0.05)' : 'rgba(79,143,255,0.1)'; }}
      >
        {loading ? (
          <>
            <span style={{ display:'inline-block', animation:'blink 1s ease-in-out infinite' }}>●</span>
            Analyzing...
          </>
        ) : '📋 AI Report'}
      </button>

      {(report || error) && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) { setReport(null); setError(null); } }}
        >
          <div
            className="fade-in"
            style={{
              background: 'linear-gradient(145deg, #080f1f, #0d1729)',
              border: error ? '1px solid rgba(239,68,68,0.3)' : `1px solid ${cfg?.border || 'rgba(79,143,255,0.2)'}`,
              borderRadius: 18,
              padding: 28,
              maxWidth: 520,
              width: '100%',
              boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 40px ${error ? 'rgba(239,68,68,0.1)' : (cfg?.color || '#4f8fff') + '22'}`,
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            {error ? (
              <>
                <div style={{ fontSize:20, marginBottom:8 }}>⚠️ Report Error</div>
                <p style={{ color:'#ef4444', fontSize:13, background:'rgba(239,68,68,0.1)', padding:12, borderRadius:8, fontFamily:'monospace' }}>
                  {error}
                </p>
                <button onClick={() => setError(null)} style={{ marginTop:16, background:'rgba(255,255,255,0.06)', border:'none', color:'#7a90b8', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
                  Close
                </button>
              </>
            ) : report && (
              <>
                {/* Header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                  <div>
                    <div style={{ fontSize:11, color:'#4a5a7a', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
                      ExamGuardrail · AI Credibility Report
                    </div>
                    <div style={{
                      display:'inline-flex', alignItems:'center', gap:8,
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 24,
                      padding: '6px 16px',
                    }}>
                      <span style={{ fontSize:16 }}>{cfg.icon}</span>
                      <span style={{ fontSize:18, fontWeight:800, color:cfg.color, letterSpacing:'-0.01em' }}>
                        {report.verdict}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:28, fontWeight:800, color:cfg.color, lineHeight:1, textShadow:`0 0 20px ${cfg.color}55` }}>
                      {report.credibility_score}
                    </div>
                    <div style={{ fontSize:10, color:'#4a5a7a', letterSpacing:'0.08em' }}>SCORE/100</div>
                  </div>
                </div>

                {/* Summary */}
                <div style={{ background:'rgba(255,255,255,0.02)', borderRadius:10, padding:14, marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#4a5a7a', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Executive Summary</div>
                  <p style={{ fontSize:13, color:'#c8d8f0', lineHeight:1.6 }}>{report.executive_summary}</p>
                </div>

                {/* Recommendation */}
                <div style={{
                  background:`linear-gradient(135deg, ${cfg.bg}, transparent)`,
                  border:`1px solid ${cfg.border}`,
                  borderRadius:10, padding:14, marginBottom:14,
                }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#4a5a7a', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Proctor Recommendation</div>
                  <p style={{ fontSize:13, color:cfg.color, fontWeight:500 }}>→ {report.recommendation}</p>
                </div>

                {/* Policy violations */}
                {report.policy_violations?.length > 0 && (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#4a5a7a', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>
                      Policy Violations ({report.policy_violations.length})
                    </div>
                    {report.policy_violations.map((v, i) => (
                      <div key={i} style={{
                        display:'flex', gap:8, alignItems:'flex-start',
                        padding:'8px 10px', marginBottom:4,
                        background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)',
                        borderRadius:8, fontSize:12, color:'#fca5a5',
                      }}>
                        <span style={{ flexShrink:0 }}>⚠️</span>
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Historical precedent */}
                {report.comparable_past_cases && report.comparable_past_cases !== 'No similar past cases found.' && (
                  <div style={{
                    background:'rgba(79,143,255,0.05)', border:'1px solid rgba(79,143,255,0.15)',
                    borderRadius:10, padding:12, marginBottom:14,
                  }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#4a5a7a', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>
                      📚 Historical Precedent (RAG)
                    </div>
                    <p style={{ fontSize:12, color:'#7a90b8', lineHeight:1.5 }}>{report.comparable_past_cases}</p>
                  </div>
                )}

                {/* Confidence bar */}
                <ConfidenceBar value={report.confidence} />

                {/* Close */}
                <button
                  onClick={() => setReport(null)}
                  style={{
                    marginTop: 20,
                    width: '100%',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#7a90b8',
                    padding: '10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                >
                  Close Report
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
