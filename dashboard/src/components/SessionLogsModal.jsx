import { useState, useEffect } from 'react'
import { api, API_BASE } from '../config'

const LAYER_LABELS = {
  L1: 'Browser',
  L2: 'Extension',
  L3: 'Webcam',
  L4: 'Native Agent',
}

const SEVERITY_STYLES = {
  LOW:      'bg-gray-100 text-gray-600 border-gray-200',
  MEDIUM:   'bg-blue-50 text-blue-700 border-blue-200',
  HIGH:     'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
}

export default function SessionLogsModal({ session, onClose }) {
  const [logs, setLogs] = useState([])
  const [answerScores, setAnswerScores] = useState([])
  const [meta, setMeta] = useState({ total_events: 0, violations: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL') // ALL | VIOLATIONS | layer

  useEffect(() => {
    if (!session?.id) return
    let cancelled = false
    api.get(`/api/sessions/${session.id}/logs`)
      .then(data => {
        if (cancelled) return
        setLogs(data.logs || [])
        setAnswerScores(data.answer_scores || [])
        setMeta({ total_events: data.total_events, violations: data.violations })
      })
      .catch(err => console.error('Failed to load logs:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [session?.id])

  const filtered = logs.filter(l => {
    if (filter === 'ALL') return true
    if (filter === 'VIOLATIONS') return l.is_violation
    return l.layer === filter
  })

  const handleExport = () => {
    const url = `${API_BASE}/api/sessions/${session.id}/logs/export`
    const a = document.createElement('a')
    a.href = url
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-[#7BBDE8] flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl font-display font-bold text-[#001D39]">
              Monitoring Logs — {session.student_name}
            </h2>
            <p className="text-[#49769F] font-body text-[13px] mt-1">
              Student ID: <span className="font-mono font-bold">{session.student_id}</span> &nbsp;·&nbsp; 
              Exam: <span className="font-bold">{session.exam_name}</span> &nbsp;·&nbsp;
              Credibility: <span className={`font-black ${session.credibility_score > 70 ? 'text-green-600' : session.credibility_score > 40 ? 'text-orange-500' : 'text-red-600'}`}>{session.credibility_score}%</span>
            </p>
          </div>
          <button onClick={onClose} className="text-[#49769F] hover:text-[#001D39] p-1 rounded-lg hover:bg-[#BDD8E9] transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-3 bg-[#f0f7fb] border-b border-[#7BBDE8] flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#49769F]">Total Events</span>
            <span className="bg-[#001D39] text-white text-[12px] font-black px-2.5 py-0.5 rounded-full">{meta.total_events}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#49769F]">Violations</span>
            <span className={`text-[12px] font-black px-2.5 py-0.5 rounded-full ${meta.violations > 0 ? 'bg-red-500 text-white' : 'bg-green-100 text-green-700'}`}>{meta.violations}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#49769F]">Answers Scored</span>
            <span className="bg-blue-100 text-blue-700 text-[12px] font-black px-2.5 py-0.5 rounded-full">{answerScores.length}</span>
          </div>
          <div className="ml-auto">
            <button onClick={handleExport} className="bg-[#0A4174] text-white px-4 py-2 rounded-lg text-[12px] font-bold flex items-center gap-2 hover:bg-[#001D39] transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export Excel
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-[#7BBDE8] flex gap-2 shrink-0 flex-wrap">
          {['ALL', 'VIOLATIONS', 'L1', 'L2', 'L3', 'L4'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                filter === f ? 'bg-[#001D39] text-white' : 'bg-[#BDD8E9] text-[#001D39] hover:bg-[#7BBDE8]'
              }`}
            >
              {f === 'ALL' ? 'All Events' : f === 'VIOLATIONS' ? '⚠ Violations Only' : LAYER_LABELS[f] || f}
            </button>
          ))}
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-20 text-[#49769F] font-body">Loading logs...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-[#7BBDE8] rounded-2xl text-[#6EA2B3] font-body text-[14px]">
              {filter === 'ALL' ? 'No monitoring events recorded for this session.' : `No ${filter === 'VIOLATIONS' ? 'violations' : filter + ' events'} found.`}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((log, idx) => (
                <LogEntry key={log.id || idx} log={log} index={idx + 1} />
              ))}
            </div>
          )}

          {/* Answer Scores Section */}
          {answerScores.length > 0 && (
            <div className="mt-8">
              <h3 className="text-[14px] font-display font-bold text-[#001D39] mb-4 uppercase tracking-widest">AI Answer Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-[#BDD8E9] text-[#49769F] text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-4 py-3">Question</th>
                      <th className="px-4 py-3">AI Probability</th>
                      <th className="px-4 py-3">Verdict</th>
                      <th className="px-4 py-3">Flagged</th>
                      <th className="px-4 py-3">Signals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#7BBDE8]">
                    {answerScores.map((a, i) => (
                      <tr key={a.id || i} className="hover:bg-[#f8fafc]">
                        <td className="px-4 py-3 font-mono text-[12px]">{a.question_id}</td>
                        <td className="px-4 py-3">
                          <span className={`font-black ${(a.ai_probability || 0) > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                            {((a.ai_probability || 0) * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold">{a.verdict || '—'}</td>
                        <td className="px-4 py-3">{a.flag_for_review ? <span className="text-red-500 font-bold">YES</span> : <span className="text-green-600">NO</span>}</td>
                        <td className="px-4 py-3 text-[11px] text-[#49769F]">
                          {Array.isArray(a.signals_detected) ? a.signals_detected.join(', ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LogEntry({ log, index }) {
  const severity = log.severity || 'MEDIUM'
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.MEDIUM
  const layerLabel = LAYER_LABELS[log.layer] || log.layer
  const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '—'
  const date = log.timestamp ? new Date(log.timestamp).toLocaleDateString() : ''

  return (
    <div className={`border rounded-xl p-4 ${log.is_violation ? 'border-red-300 bg-red-50/50' : 'border-[#7BBDE8] bg-white'} transition-all hover:shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-[10px] text-[#49769F] font-mono mt-1 shrink-0 w-6 text-right">#{index}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-display font-bold text-[#001D39] text-[14px]">{log.event_type}</span>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${style}`}>{severity}</span>
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[#BDD8E9] text-[#0A4174]">{layerLabel}</span>
              {log.is_violation && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">⚠ VIOLATION</span>}
            </div>
            {log.alert_sentence && (
              <p className="text-[12px] text-red-700 font-body mt-1 bg-red-50 px-2 py-1 rounded border border-red-200">
                🤖 {log.alert_sentence}
              </p>
            )}
            {log.payload && Object.keys(log.payload).length > 0 && (
              <p className="text-[11px] text-[#49769F] font-mono mt-1 truncate">{JSON.stringify(log.payload)}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] font-mono text-[#49769F]">{time}</div>
          <div className="text-[9px] text-[#6EA2B3]">{date}</div>
        </div>
      </div>
    </div>
  )
}
