// NativeAgentReportsTab.jsx — Admin view of desktop agent detection events
import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../config';

const SEV_CONFIG = {
  CRITICAL: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500' },
  HIGH:     { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  MEDIUM:   { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  LOW:      { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500' },
};

const EVENT_ICON = {
  AI_AGENT_DETECTED:         '🤖',
  AI_AGENT_BLOCKED:          '🚫',
  AI_CMDLINE_DETECTED:       '💻',
  AI_API_CONNECTION:         '🌐',
  HIDDEN_WINDOW_WDA:         '👻',
  HIDDEN_WINDOW_MACOS:       '👻',
  SUSPICIOUS_ELECTRON_APP:   '⚡',
  SCREEN_SHARE_DETECTED:     '📺',
  SCREEN_SHARE_BLOCKED:      '🚫',
  REMOTE_ACCESS_DETECTED:    '🔌',
  REMOTE_ACCESS_BLOCKED:     '🚫',
  SCREEN_RECORDER_DETECTED:  '🎥',
  SCREEN_RECORDER_BLOCKED:   '🚫',
  CHEAT_EXTENSION_DETECTED:  '🧩',
  CHEAT_EXTENSION_BLOCKED:   '🧩',
};

function fmtAge(secs) {
  if (secs == null) return '—';
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function fmtTs(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString(); }
  catch { return ts; }
}

export default function NativeAgentReportsTab() {
  const [findings, setFindings]     = useState([]);
  const [agents, setAgents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [expanded, setExpanded]     = useState(null);
  const [tab, setTab]               = useState('findings'); // 'findings' | 'agents'

  const fetchData = useCallback(async () => {
    try {
      const [fRes, aRes] = await Promise.all([
        api.get('/api/native-agent/findings').catch(() => ({ findings: [] })),
        api.get('/api/native-agent/all-heartbeats').catch(() => ({ agents: [] })),
      ]);
      setFindings(fRes.findings || []);
      setAgents(aRes.agents || []);
    } catch (e) {
      console.error('Native agent data fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 10000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const filtered = filter === 'all'
    ? findings
    : findings.filter(f => (f.severity || '').toUpperCase() === filter);

  const sevCounts = findings.reduce((acc, f) => {
    const s = (f.severity || 'UNKNOWN').toUpperCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const blockedCount  = findings.filter(f => f.event_type?.includes('BLOCKED')).length;
  const connectedAgts = agents.filter(a => a.connected).length;

  return (
    <div className="p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🛡️</span>
            <h2 className="font-display font-bold text-[#001D39] text-xl">Native Agent Reports</h2>
          </div>
          <p className="text-[#49769F] text-[13px]">
            Real-time threat log from students' ExamGuardrail desktop agents.
          </p>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 text-[#49769F] hover:text-[#0A4174] text-[12px] font-bold border border-[#7BBDE8] px-3 py-1.5 rounded-lg transition-all hover:bg-[#eff6ff]">
          ↻ Refresh
        </button>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Events',     value: findings.length,                    icon: '📋', color: '#6366F1' },
          { label: 'Critical/High',    value: (sevCounts.CRITICAL||0)+(sevCounts.HIGH||0), icon: '⚠️', color: '#EF4444' },
          { label: 'Processes Blocked',value: blockedCount,                        icon: '🚫', color: '#F59E0B' },
          { label: 'Active Agents',    value: connectedAgts,                       icon: '💻', color: '#10B981' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white border border-[#7BBDE8] rounded-xl p-4 border-l-4"
               style={{ borderLeftColor: color }}>
            <div className="flex justify-between items-start mb-1">
              <span className="text-lg">{icon}</span>
              <span className="text-2xl font-black text-[#001D39]">{value}</span>
            </div>
            <p className="text-[#49769F] text-[11px] font-bold uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex bg-[#BDD8E9] rounded-lg p-0.5 w-fit mb-5">
        {[['findings', '🔍 Threat Log'], ['agents', '💻 Connected Agents']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider transition-all ${
              tab === key ? 'bg-white text-[#0A4174] shadow-sm' : 'text-[#49769F] hover:text-[#001D39]'
            }`}>{label}
          </button>
        ))}
      </div>

      {/* ── FINDINGS TAB ── */}
      {tab === 'findings' && (
        <>
          {/* Severity filter pills */}
          <div className="flex gap-2 flex-wrap mb-4">
            {[['all', 'All'], ['CRITICAL', 'Critical'], ['HIGH', 'High'], ['MEDIUM', 'Medium']].map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all ${
                  filter === key
                    ? 'bg-[#0A4174] text-white border-[#0A4174]'
                    : 'bg-white text-[#49769F] border-[#7BBDE8] hover:border-[#0A4174] hover:text-[#0A4174]'
                }`}>
                {label}{key !== 'all' && sevCounts[key] ? ` (${sevCounts[key]})` : ''}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-[#49769F] text-[13px]">
              <div className="inline-block w-6 h-6 border-2 border-[#7BBDE8] border-t-[#0A4174] rounded-full animate-spin mb-3" />
              <p>Loading agent events...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="border-2 border-dashed border-[#7BBDE8] rounded-xl py-16 text-center">
              <p className="text-[#49769F] text-[13px]">No native agent events recorded yet.</p>
              <p className="text-[#6EA2B3] text-[11px] mt-1">Events appear here once a student runs ExamGuardrailAgent.exe during an exam.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((f, i) => {
                const sev  = (f.severity || 'MEDIUM').toUpperCase();
                const cfg  = SEV_CONFIG[sev] || SEV_CONFIG.MEDIUM;
                const icon = EVENT_ICON[f.event_type] || '⚠️';
                const meta = f.payload || f.metadata || {};
                const isExp = expanded === i;
                return (
                  <div key={i}
                    className={`border rounded-xl overflow-hidden transition-all ${cfg.border} ${isExp ? cfg.bg : 'bg-white hover:bg-gray-50'}`}>
                    <button className="w-full text-left px-4 py-3 flex items-center gap-3"
                      onClick={() => setExpanded(isExp ? null : i)}>
                      <span className="text-base">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
                            {sev}
                          </span>
                          <span className="font-mono text-[12px] font-bold text-[#001D39] truncate">
                            {f.event_type}
                          </span>
                          {f.event_type?.includes('BLOCKED') && (
                            <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                              BLOCKED
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-[#49769F]">
                            Session: <span className="font-mono font-bold">{f.session_id || '—'}</span>
                          </span>
                          {meta.process && (
                            <span className="text-[11px] text-[#49769F]">
                              Process: <span className="font-mono">{meta.process}</span>
                            </span>
                          )}
                          {meta.reason && (
                            <span className="text-[11px] text-[#49769F] truncate max-w-xs">
                              {meta.reason}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-[11px] text-[#6EA2B3]">{fmtTs(f.created_at)}</span>
                        <div className="text-[10px] text-[#6EA2B3] mt-0.5">
                          Layer: {f.layer || '—'} • Δ {f.score_delta ?? '—'}
                        </div>
                      </div>
                      <span className={`text-[#6EA2B3] transition-transform ${isExp ? 'rotate-180' : ''}`}>▾</span>
                    </button>

                    {isExp && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#49769F] mb-2">
                          Metadata
                        </p>
                        <pre className="bg-[#001D39] text-[#BDD8E9] text-[11px] rounded-lg p-3 overflow-auto max-h-48 font-mono">
                          {JSON.stringify(meta, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── AGENTS TAB ── */}
      {tab === 'agents' && (
        <>
          {loading ? (
            <div className="py-16 text-center text-[#49769F] text-[13px]">
              <div className="inline-block w-6 h-6 border-2 border-[#7BBDE8] border-t-[#0A4174] rounded-full animate-spin mb-3" />
              <p>Loading agent status...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="border-2 border-dashed border-[#7BBDE8] rounded-xl py-16 text-center">
              <p className="text-[#49769F] text-[13px]">No agent heartbeats recorded yet.</p>
              <p className="text-[#6EA2B3] text-[11px] mt-1">Agents appear here once a student runs ExamGuardrailAgent.exe.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#7BBDE8] rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#BDD8E9] text-[11px] uppercase tracking-widest text-[#49769F] font-bold">
                  <tr>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Session ID</th>
                    <th className="px-5 py-3">Platform</th>
                    <th className="px-5 py-3">Last Seen</th>
                    <th className="px-5 py-3">Scans</th>
                    <th className="px-5 py-3">Threats</th>
                    <th className="px-5 py-3">Blocked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7BBDE8] text-[13px]">
                  {agents.map((a, i) => {
                    const stats = a.stats || {};
                    return (
                      <tr key={i} className="hover:bg-[#f8fafc] transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${a.connected ? 'bg-green-500 shadow-[0_0_6px_#10B981]' : 'bg-gray-300'}`} />
                            <span className={`text-[10px] font-black uppercase ${a.connected ? 'text-green-600' : 'text-gray-400'}`}>
                              {a.connected ? 'Live' : 'Offline'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono text-[#0A4174] font-bold">{a.session_id}</td>
                        <td className="px-5 py-3 text-[#49769F]">{a.platform || '—'}</td>
                        <td className="px-5 py-3 text-[#49769F]">
                          {fmtTs(a.last_seen)}
                          <br />
                          <span className="text-[10px] text-[#6EA2B3]">{fmtAge(a.age_seconds)}</span>
                        </td>
                        <td className="px-5 py-3 font-bold">{stats.scans ?? 0}</td>
                        <td className="px-5 py-3">
                          <span className={`font-bold ${(stats.findings || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {stats.findings ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`font-bold ${(stats.blocked || 0) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                            {stats.blocked ?? 0}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
