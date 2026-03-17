import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, Clock, Download, RefreshCw } from 'lucide-react';
import { useSession, useReport, useReportExport } from '../../hooks/useBackendHooks';

export default function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { session, loading, error, refresh } = useSession(sessionId);
  const { report, loading: reportLoading, error: reportError } = useReport(sessionId);
  const { exportReport, exporting } = useReportExport();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#4E8EA2]"></div>
          <p className="mt-4 text-gray-600">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] p-8">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-2 text-[#4E8EA2] hover:text-[#001D39] mb-6 font-medium"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">Failed to Load Session</h3>
              <p className="text-red-800 mt-1">{error || 'Session not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const verdictColor = {
    'CLEAR': { bg: 'bg-[#F0FDFA]', text: 'text-[#10B981]', border: 'border-[#10B981]' },
    'UNDER_REVIEW': { bg: 'bg-[#FFFBEB]', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]' },
    'SUSPICIOUS': { bg: 'bg-[#FEF2F2]', text: 'text-[#EF4444]', border: 'border-[#EF4444]' },
    'FLAGGED': { bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]', border: 'border-[#DC2626]' }
  };

  const handleExport = async () => {
    try {
      await exportReport(sessionId);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2 text-[#4E8EA2] hover:text-[#001D39] font-medium"
            >
              <ArrowLeft size={20} /> Back to Dashboard
            </button>
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#BDD8E9] hover:bg-[#4E8EA2] text-[#001D39] font-medium transition"
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#001D39] mb-2">
                {session.student_name}
              </h1>
              <p className="text-gray-600">{session.exam_name}</p>
            </div>
            <div className={`px-6 py-3 rounded-lg border-2 ${verdictColor[session.verdict]?.bg} ${verdictColor[session.verdict]?.border}`}>
              <p className={`font-bold text-lg ${verdictColor[session.verdict]?.text}`}>
                {session.verdict}
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-8 mt-8 border-b border-gray-200">
            {['overview', 'events', 'report', 'analysis'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 font-medium border-b-2 transition ${
                  activeTab === tab
                    ? 'border-[#4E8EA2] text-[#4E8EA2]'
                    : 'border-transparent text-gray-600 hover:text-[#4E8EA2]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Credibility Score</p>
                <p className="text-3xl font-bold text-[#001D39] mt-2">
                  {session.credibility_score?.toFixed(1) || 'N/A'}%
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Status</p>
                <div className="flex items-center gap-2 mt-2">
                  {session.status === 'active' ? (
                    <>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <p className="font-semibold text-blue-600">Active</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="text-green-600" size={20} />
                      <p className="font-semibold text-green-600">Completed</p>
                    </>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Duration</p>
                <p className="text-lg font-semibold text-[#001D39] mt-2">
                  {session.duration_minutes ? `${session.duration_minutes} min` : 'In Progress'}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Violations</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {session.event_count || 0}
                </p>
              </div>
            </div>

            {/* Session Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-[#001D39] mb-4">Session Information</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Session ID</p>
                    <p className="font-mono text-gray-900 break-all">{session.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Student Name</p>
                    <p className="text-gray-900">{session.student_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Exam Name</p>
                    <p className="text-gray-900">{session.exam_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Started</p>
                    <p className="text-gray-900">{new Date(session.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-[#001D39] mb-4">Risk Assessment</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Network Anomaly</p>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-800">
                        {session.network_flags || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${Math.min((session.network_flags || 0) * 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Process Anomaly</p>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-orange-100 text-orange-800">
                        {session.process_flags || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${Math.min((session.process_flags || 0) * 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Cursor Anomaly</p>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                        {session.cursor_flags || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${Math.min((session.cursor_flags || 0) * 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#001D39]">Violation Events ({session.event_count || 0})</h2>
            </div>
            {session.events && session.events.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {session.events.map((event, idx) => (
                  <div key={idx} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                          <AlertCircle className="text-red-600" size={20} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{event.type}</p>
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                          {event.severity && (
                            <span className={`font-semibold px-2 py-1 rounded ${
                              event.severity === 'HIGH'
                                ? 'bg-red-100 text-red-800'
                                : event.severity === 'MEDIUM'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {event.severity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-600">
                No violation events recorded during this session.
              </div>
            )}
          </div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#001D39]">AI-Generated Report</h2>
              <button
                onClick={handleExport}
                disabled={exporting || !report}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4E8EA2] hover:bg-[#001D39] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Download size={18} /> Export
              </button>
            </div>
            {reportLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#4E8EA2]"></div>
                <p className="mt-2 text-gray-600">Generating forensic report...</p>
              </div>
            ) : report ? (
              <div className="p-6 space-y-4 prose prose-sm max-w-none">
                <div className="bg-[#F0FDFA] border border-[#10B981] rounded-lg p-4">
                  <h3 className="text-[#10B981] font-bold mt-0">Summary</h3>
                  <p className="text-gray-900">{report.summary}</p>
                </div>

                {report.red_flags && report.red_flags.length > 0 && (
                  <div>
                    <h3 className="font-bold text-red-600 text-lg">🚩 Red Flags</h3>
                    <ul className="space-y-2 mt-2">
                      {report.red_flags.map((flag, idx) => (
                        <li key={idx} className="flex gap-2 text-sm">
                          <span className="text-red-600 font-bold">•</span>
                          <span className="text-gray-900">{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.recommendations && (
                  <div>
                    <h3 className="font-bold text-blue-600 text-lg">💡 Recommendations</h3>
                    <p className="text-gray-900 mt-2">{report.recommendations}</p>
                  </div>
                )}

                {report.detailed_analysis && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-bold text-[#001D39] text-lg">Detailed Analysis</h3>
                    <div className="mt-3 text-gray-900 whitespace-pre-wrap text-sm">
                      {report.detailed_analysis}
                    </div>
                  </div>
                )}
              </div>
            ) : reportError ? (
              <div className="p-8 bg-red-50">
                <p className="text-red-700 text-center">{reportError}</p>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-600">
                Report not yet generated. Check back shortly.
              </div>
            )}
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-[#001D39] mb-4">Forensic Analysis</h2>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-600 uppercase">Total Events</p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">{session.event_count || 0}</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-orange-600 uppercase">High Severity</p>
                  <p className="text-2xl font-bold text-orange-900 mt-2">
                    {session.events?.filter(e => e.severity === 'HIGH').length || 0}
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-600 uppercase">Medium Severity</p>
                  <p className="text-2xl font-bold text-yellow-900 mt-2">
                    {session.events?.filter(e => e.severity === 'MEDIUM').length || 0}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Verdict Reasoning</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {session.verdict === 'CLEAR' && 'This session shows minimal anomalies. The student behavior is consistent with normal exam-taking patterns.'}
                  {session.verdict === 'UNDER_REVIEW' && 'This session contains some minor anomalies that warrant further investigation by an instructor.'}
                  {session.verdict === 'SUSPICIOUS' && 'Multiple suspicious indicators detected. Manual review is recommended before enabling exam completion.'}
                  {session.verdict === 'FLAGGED' && 'Critical anomalies detected. This session should be escalated for immediate investigation and potential invalidation.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
