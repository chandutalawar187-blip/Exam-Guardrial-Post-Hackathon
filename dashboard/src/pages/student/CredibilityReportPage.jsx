// dashboard/src/pages/student/CredibilityReportPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoDark from '../../assets/logo/Cognivigil_logo_full_dark.svg';

import { API_BASE } from '../../config';

// ── SEVERITY CONFIG ──────────────────────────────────────────
const SEVERITY_STYLES = {
  CRITICAL: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-600 text-white', icon: '🚨' },
  HIGH:     { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', badge: 'bg-orange-500 text-white', icon: '⚠️' },
  MEDIUM:   { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', badge: 'bg-yellow-500 text-white', icon: '⚠' },
  LOW:      { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-500 text-white', icon: 'ℹ️' },
};

const EVENT_LABELS = {
  TAB_HIDDEN: 'Tab Switch (Away)',
  TAB_RETURNED: 'Tab Switch (Returned)',
  WINDOW_FOCUS_LOST: 'Window Focus Lost',
  WINDOW_RESIZE: 'Window Resized',
  CLIPBOARD_ATTEMPT: 'Clipboard Attempt',
  KEYBOARD_HIJACK: 'Keyboard Shortcut Blocked',
  RIGHT_CLICK: 'Right Click Blocked',
  DEVTOOLS_ATTEMPT: 'DevTools Attempt',
  FULLSCREEN_EXIT: 'Fullscreen Exit',
  PRINT_SCREEN_ATTEMPT: 'Print Screen Blocked',
  IDLE_DETECTED: 'Idle Detected (60s+)',
  ANSWER_SUBMITTED: 'Answer Submitted',
  REMOTE_DESKTOP_SUSPECTED: 'Remote Desktop Detected',
  HIDDEN_OVERLAY_DETECTED: 'Hidden AI Overlay Detected',
  HIDDEN_WINDOW_WDA: 'Hidden Window (WDA)',
  SUSPICIOUS_PROCESS: 'Suspicious Process',
  AI_API_CONNECTION: 'AI API Connection',
};

// ── TRUST SCORE GAUGE ────────────────────────────────────────
function TrustGauge({ score }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? '#22C55E' : score >= 70 ? '#F59E0B' : score >= 50 ? '#F97316' : '#EF4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        <circle
          cx="100" cy="100" r={radius} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="100" y="90" textAnchor="middle" className="text-4xl font-black" fill={color} fontSize="42">{score}</text>
        <text x="100" y="115" textAnchor="middle" fill="#6B7280" fontSize="12" fontWeight="600">TRUST SCORE</text>
      </svg>
    </div>
  );
}

// ── RISK BAR ─────────────────────────────────────────────────
function RiskBar({ label, count, max, color }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs font-semibold mb-1">
        <span className="text-[#49769F]">{label}</span>
        <span className="text-[#001D39]">{count}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%`, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

export default function CredibilityReportPage() {
  const navigate = useNavigate();
  const [backendReport, setBackendReport] = useState(null);
  const [tab, setTab] = useState('timeline');

  // Read submission data from sessionStorage on mount
  const [data] = useState(() => {
    try {
      const stored = sessionStorage.getItem('examSubmission');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (data?.sessionId) {
      fetch(`${API_BASE}/api/reports/${data.sessionId}`)
        .then(r => r.json())
        .then(report => setBackendReport(report))
        .catch(() => {});
    }
  }, [data]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#BDD8E9] flex items-center justify-center font-body">
        <div className="text-center">
          <p className="text-[#49769F] text-lg mb-4">No exam data found.</p>
          <button onClick={() => navigate('/')} className="text-[#0A4174] font-bold underline">Return Home</button>
        </div>
      </div>
    );
  }

  const violationLog = data.violationLog || [];
  const violationsOnly = violationLog.filter(v => v.event_type !== 'ANSWER_SUBMITTED');
  const trustScore = data.credibilityScore ?? 100;
  const verdictLabel = data.verdict === 'CLEAR' ? 'VERIFIED CLEAN' :
                       data.verdict === 'FLAGGED' ? 'FLAGGED — REVIEW REQUIRED' :
                       data.verdict === 'SUSPICIOUS' ? 'SUSPICIOUS ACTIVITY' : 'UNDER REVIEW';
  const verdictColor = data.verdict === 'CLEAR' ? 'bg-green-100 text-green-800 border-green-300' :
                       data.verdict === 'FLAGGED' ? 'bg-red-100 text-red-800 border-red-300' :
                       data.verdict === 'SUSPICIOUS' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                       'bg-yellow-100 text-yellow-800 border-yellow-300';

  // Categorize violations
  const categories = {
    'Tab & Focus': violationsOnly.filter(v => ['TAB_HIDDEN','TAB_RETURNED','WINDOW_FOCUS_LOST','FULLSCREEN_EXIT'].includes(v.event_type)),
    'Keyboard & Clipboard': violationsOnly.filter(v => ['CLIPBOARD_ATTEMPT','KEYBOARD_HIJACK','DEVTOOLS_ATTEMPT','RIGHT_CLICK','PRINT_SCREEN_ATTEMPT'].includes(v.event_type)),
    'Environment': violationsOnly.filter(v => ['WINDOW_RESIZE','IDLE_DETECTED'].includes(v.event_type)),
  };

  const maxCategory = Math.max(...Object.values(categories).map(c => c.length), 1);

  // Calculate tab-away pairs
  const tabAwayPairs = [];
  for (let i = 0; i < violationLog.length; i++) {
    if (violationLog[i].event_type === 'TAB_HIDDEN') {
      const returnEntry = violationLog.slice(i + 1).find(v => v.event_type === 'TAB_RETURNED');
      tabAwayPairs.push({
        left: violationLog[i].timestamp,
        returned: returnEntry?.timestamp || null,
        away_seconds: returnEntry?.metadata?.away_seconds || '?',
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-body">
      {/* ── HEADER ── */}
      <header className="bg-[#001D39] text-white px-8 py-6 border-b-4 border-[#4E8EA2]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoDark} alt="Cognivigil" className="h-8" />
            <div className="h-8 w-px bg-white/20" />
            <div>
              <h1 className="text-lg font-black italic tracking-tight uppercase">Credibility Report</h1>
              <p className="text-[10px] text-[#49769F] font-bold tracking-widest uppercase">Sentinel AI Integrity Analysis</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg border text-xs font-black uppercase tracking-wider ${verdictColor}`}>
            {verdictLabel}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-8">
        {/* ── TOP SUMMARY CARDS ── */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <SummaryCard label="Student UID" value={data.uid} mono />
          <SummaryCard label="Exam" value={data.examName || data.subjectCode || 'N/A'} />
          <SummaryCard label="Duration" value={`${Math.floor((data.examDuration || 0) / 60)}m ${(data.examDuration || 0) % 60}s`} />
          <SummaryCard label="Submitted" value={data.timestamp} />
        </div>

        {/* ── MAIN 2-COL: Trust Score + Score Card ── */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Trust Score Gauge */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center">
            <TrustGauge score={trustScore} />
            <p className="mt-2 text-xs text-[#49769F] font-bold uppercase tracking-widest">AI Confidence: 85%</p>
          </div>

          {/* Score + Violations Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#49769F] mb-6">Performance Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <MiniStat label="Raw Score" value={`${data.raw}/${data.totalMarks}`} />
              <MiniStat label="Final Score" value={`${data.final}%`} />
              <MiniStat label="Questions Answered" value={`${data.answeredCount}/${data.totalQuestions}`} />
              <MiniStat label="Deductions" value={data.deductions > 0 ? `-${data.deductions}` : 'None'} danger={data.deductions > 0} />
              <MiniStat label="Total Violations" value={violationsOnly.length} danger={violationsOnly.length > 0} />
              <MiniStat label="Total Tab-Away Time" value={`${data.totalTabAwaySeconds || 0}s`} danger={(data.totalTabAwaySeconds || 0) > 10} />
            </div>
          </div>
        </div>

        {/* ── RISK BREAKDOWN ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#49769F] mb-6">Risk Breakdown</h3>
          <div className="grid grid-cols-3 gap-8">
            <RiskBar label="Tab & Focus Issues" count={categories['Tab & Focus'].length} max={maxCategory} color="bg-blue-500" />
            <RiskBar label="Keyboard & Clipboard" count={categories['Keyboard & Clipboard'].length} max={maxCategory} color="bg-red-500" />
            <RiskBar label="Environment Issues" count={categories['Environment'].length} max={maxCategory} color="bg-yellow-500" />
          </div>
        </div>

        {/* ── TAB-AWAY DURATION TABLE ── */}
        {tabAwayPairs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#49769F] mb-6">
              Tab-Away Duration Log ({tabAwayPairs.length} {tabAwayPairs.length === 1 ? 'Switch' : 'Switches'})
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-[#49769F] font-bold text-xs uppercase">#</th>
                  <th className="text-left py-2 text-[#49769F] font-bold text-xs uppercase">Left At</th>
                  <th className="text-left py-2 text-[#49769F] font-bold text-xs uppercase">Returned At</th>
                  <th className="text-left py-2 text-[#49769F] font-bold text-xs uppercase">Duration Away</th>
                </tr>
              </thead>
              <tbody>
                {tabAwayPairs.map((pair, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 font-mono text-xs text-gray-500">{i + 1}</td>
                    <td className="py-2 font-mono text-xs">{formatTime(pair.left)}</td>
                    <td className="py-2 font-mono text-xs">{pair.returned ? formatTime(pair.returned) : '—'}</td>
                    <td className={`py-2 font-bold text-xs ${Number(pair.away_seconds) > 10 ? 'text-red-600' : 'text-green-600'}`}>
                      {pair.away_seconds}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-right">
              <span className="text-xs text-[#49769F] font-bold">Total Time Away: </span>
              <span className="text-sm font-black text-[#001D39]">{data.totalTabAwaySeconds || 0}s</span>
            </div>
          </div>
        )}

        {/* ── TABS: Timeline / All Events ── */}
        <div className="mb-4 flex gap-2">
          <TabButton active={tab === 'timeline'} onClick={() => setTab('timeline')}>Violation Timeline</TabButton>
          <TabButton active={tab === 'all'} onClick={() => setTab('all')}>All Events ({violationLog.length})</TabButton>
        </div>

        {/* ── VIOLATION TIMELINE ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
          {tab === 'timeline' ? (
            violationsOnly.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-4">✅</p>
                <p className="text-[#49769F] font-bold">No violations detected. Clean session.</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                {violationsOnly.map((v, i) => {
                  const styles = SEVERITY_STYLES[v.severity] || SEVERITY_STYLES.LOW;
                  return (
                    <div key={i} className="relative pl-16 pb-6 last:pb-0">
                      {/* Timeline dot */}
                      <div className={`absolute left-4 top-1 w-5 h-5 rounded-full border-2 ${styles.border} ${styles.bg} flex items-center justify-center text-[8px]`}>
                        {styles.icon}
                      </div>
                      <div className={`${styles.bg} border ${styles.border} rounded-xl p-4`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2 py-0.5 rounded ${styles.badge}`}>{v.severity}</span>
                            <span className={`text-sm font-bold ${styles.text}`}>{EVENT_LABELS[v.event_type] || v.event_type}</span>
                          </div>
                          <span className="text-xs font-mono text-gray-500">{formatTime(v.timestamp)}</span>
                        </div>
                        {v.metadata && Object.keys(v.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            {v.metadata.reason && <p>{v.metadata.reason}</p>}
                            {v.metadata.away_seconds !== undefined && <p className="font-bold">Away for {v.metadata.away_seconds}s (total: {v.metadata.total_away_seconds}s)</p>}
                            {v.metadata.key && <p>Key: <code className="bg-gray-100 px-1 rounded">{v.metadata.key}</code></p>}
                            {v.metadata.ratio !== undefined && <p>Window at {v.metadata.ratio}% of screen</p>}
                            {v.metadata.idle_seconds !== undefined && <p>Idle for {v.metadata.idle_seconds} seconds</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* All events including ANSWER_SUBMITTED */
            <div className="space-y-2">
              {violationLog.map((v, i) => {
                const styles = SEVERITY_STYLES[v.severity] || SEVERITY_STYLES.LOW;
                const isAnswer = v.event_type === 'ANSWER_SUBMITTED';
                return (
                  <div key={i} className={`flex items-center gap-4 px-4 py-3 rounded-lg ${isAnswer ? 'bg-blue-50 border border-blue-200' : `${styles.bg} border ${styles.border}`}`}>
                    <span className="text-xs font-mono text-gray-400 w-16 shrink-0">{formatTime(v.timestamp)}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${isAnswer ? 'bg-blue-500 text-white' : styles.badge}`}>{v.severity}</span>
                    <span className={`text-sm font-semibold flex-1 ${isAnswer ? 'text-blue-700' : styles.text}`}>{EVENT_LABELS[v.event_type] || v.event_type}</span>
                    {v.metadata?.reason && <span className="text-xs text-gray-500">{v.metadata.reason}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── AI OVERLAY DETECTION ── */}
        {(() => {
          const overlay = data.overlayDetection;
          const overlayEvents = (data.violationLog || []).filter(v =>
            v.type === 'HIDDEN_OVERLAY_DETECTED' || v.type === 'HIDDEN_WINDOW_WDA' ||
            v.type === 'SUSPICIOUS_PROCESS' || v.type === 'AI_API_CONNECTION'
          );
          const detected = overlay?.detected || overlayEvents.length > 0;
          return (
            <div className={`rounded-2xl p-8 mb-8 ${detected ? 'bg-red-950 border border-red-500/40' : 'bg-[#001D39]'}`}>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#49769F] mb-4">Hidden AI Overlay Detection</h3>
              {detected ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🚨</span>
                    <div>
                      <p className="text-red-400 font-black text-sm uppercase tracking-wider">Hidden AI Overlay Detected</p>
                      <p className="text-red-300 text-xs mt-1">The student used a hidden overlay AI tool (e.g. Cluely, ParakeetAI, LockedIn, Interview Coder) during the exam.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(overlay?.findings || overlayEvents).map((f, i) => (
                      <div key={i} className="bg-red-900/40 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                        <span className="text-red-400 text-xs font-bold bg-red-900/60 px-2 py-0.5 rounded mt-0.5">CRITICAL</span>
                        <div className="flex-1">
                          <p className="text-red-200 text-sm font-semibold">{f.type || 'HIDDEN_OVERLAY_DETECTED'}</p>
                          <p className="text-red-300/80 text-xs mt-1">
                            {typeof f.details === 'object'
                              ? (f.details?.reason || f.details?.findings?.join(' | ') || JSON.stringify(f.details))
                              : (f.details || 'Suspicious overlay element detected')}
                          </p>
                          {f.time && <p className="text-red-400/50 text-[10px] mt-1">{f.time}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-3xl">✅</span>
                  <div>
                    <p className="text-green-400 font-black text-sm uppercase tracking-wider">No Hidden Overlay Detected</p>
                    <p className="text-[#BDD8E9] text-xs mt-1">Browser-side scanning found no evidence of hidden AI overlay tools during this exam session.</p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── BACKEND REPORT (if available) ── */}
        {backendReport && backendReport.recommendation && (
          <div className="bg-[#001D39] rounded-2xl p-8 mb-8 text-white">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#49769F] mb-4">AI Recommendation</h3>
            <p className="text-[#BDD8E9] text-sm leading-relaxed">{backendReport.recommendation}</p>
            {backendReport.ai_detection?.detected && (
              <div className="mt-4 bg-red-900/30 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 font-bold text-xs uppercase tracking-wider mb-1">AI Usage Detected</p>
                <p className="text-red-300 text-sm">{backendReport.ai_detection.status}</p>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIONS ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/exam/submitted')}
            className="text-xs font-black uppercase tracking-widest text-[#0A4174] hover:tracking-[0.25em] transition-all"
          >
            ← Back to Results
          </button>
          <button
            onClick={() => window.print()}
            className="bg-[#001D39] text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#0A4174] transition-all"
          >
            Print Report
          </button>
        </div>

        {/* ── FOOTER ── */}
        <div className="mt-12 flex items-center justify-center gap-4 border-t border-gray-200 pt-8 opacity-50">
          <img src={logoDark} alt="Cognivigil" className="h-5 grayscale" />
          <p className="text-[9px] font-bold text-[#49769F] uppercase tracking-widest">Powered by Sentinel AI</p>
        </div>
      </div>
    </div>
  );
}

// ── HELPER COMPONENTS ────────────────────────────────────────

function SummaryCard({ label, value, mono }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-[9px] font-black uppercase text-[#49769F] tracking-widest mb-1">{label}</p>
      <p className={`text-sm font-bold text-[#001D39] ${mono ? 'font-mono' : ''} truncate`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, danger }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[9px] font-bold uppercase text-[#49769F] tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-black ${danger ? 'text-red-600' : 'text-[#001D39]'}`}>{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
        active ? 'bg-[#001D39] text-white' : 'bg-white text-[#49769F] border border-gray-200 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

function formatTime(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}
