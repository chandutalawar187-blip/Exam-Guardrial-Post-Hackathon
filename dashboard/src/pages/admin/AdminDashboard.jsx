// dashboard/src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminNavbar from '../../components/AdminNavbar';
import SessionLogsModal from '../../components/SessionLogsModal';
import { api } from '../../config';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ exams: 0, students: 0, active: 0, total: 0, reports: 0 });
  const [allSessions, setAllSessions] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionFilter, setSessionFilter] = useState('all');
  const [now, setNow] = useState(Date.now());

  // Tick every second for live countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsData, reportsData, sessionsData] = await Promise.all([
          api.get('/api/students').catch(() => []),
          api.get('/api/admin/reports').catch(() => []),
          api.get('/api/dashboard/overview').catch(() => ({ sessions: [] }))
        ]);

        const sessions = sessionsData.sessions || [];
        const studentsList = Array.isArray(studentsData) ? studentsData : [];
        const liveSessions = sessions.filter(s => s.status === 'active');
        
        setStats({
          exams: 1,
          students: studentsList.length,
          active: liveSessions.length,
          total: sessions.length,
          reports: reportsData.length
        });

        setAllSessions(sessions);
        setAllStudents(studentsList);
      } catch (err) {
        console.error("Dashboard data fetch failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#BDD8E9] text-[#001D39]">
      <AdminNavbar />

      <main className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold">Administrator Command Center</h1>
            <p className="text-[#49769F] font-body text-[14px] mt-1">Real-time oversight of academic integrity and student enrollment.</p>
          </div>
          <div className="flex gap-4">
            <Link to="/admin/students" className="bg-[#0A4174] text-white px-6 py-2.5 rounded-lg font-display font-bold font-body text-[14px] shadow-md hover:bg-[#001D39] transition-all">
              Manage Students
            </Link>
            <Link to="/admin/reports" className="bg-[#001D39] text-white px-6 py-2.5 rounded-lg font-display font-bold font-body text-[14px] shadow-md hover:bg-[#001D39] transition-all">
              Review Reports
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
          <StatCard label="Total Students" value={stats.students} icon="👥" color="#4E8EA2" />
          <StatCard label="Live Proctored" value={stats.active} icon="⏳" color="#F59E0B" />
          <StatCard label="Total Sessions" value={stats.total} icon="📋" color="#6366F1" />
          <StatCard label="Forensic Reports" value={stats.reports} icon="📊" color="#001D39" />
          <StatCard label="Exam Status" value={stats.active > 0 ? "LIVE" : "READY"} icon="🛡️" color="#0A4174" />
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-xl border border-[#7BBDE8] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#7BBDE8] flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="font-display font-bold">Exam Sessions</h2>
              <div className="flex bg-[#BDD8E9] rounded-lg p-0.5">
                {[['all', 'All'], ['active', 'Live'], ['SUBMITTED', 'Submitted'], ['ABANDONED', 'Abandoned']].map(([key, label]) => (
                  <button key={key} onClick={() => setSessionFilter(key)}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                      sessionFilter === key ? 'bg-white text-[#0A4174] shadow-sm' : 'text-[#49769F] hover:text-[#001D39]'
                    }`}>
                    {label} ({key === 'all' ? allSessions.length : allSessions.filter(s => s.status === key).length})
                  </button>
                ))}
              </div>
            </div>
            {allSessions.some(s => s.status === 'active') && <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">Monitoring Enabled</span>}
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#BDD8E9] font-body text-[12px] uppercase tracking-widest text-[#49769F] font-display font-bold">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Exam Context</th>
                <th className="px-6 py-4">Subject Code</th>
                <th className="px-6 py-4">Session Active</th>
                <th className="px-6 py-4">Exam Countdown</th>
                <th className="px-6 py-4">Credibility</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7BBDE8] font-body text-[14px]">
              {(() => {
                const filtered = sessionFilter === 'all' ? allSessions : allSessions.filter(s => s.status === sessionFilter);
                return filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-[#6EA2B3] italic">No examination sessions found.</td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-display font-bold text-[#001D39]">{s.student_name}</div>
                      <div className="text-[10px] text-[#49769F] font-mono">{s.student_id}</div>
                    </td>
                    <td className="px-6 py-4 font-body">{s.exam_name}</td>
                    <td className="px-6 py-4">
                      {s.subject_code ? (
                        <span className="bg-[#eff6ff] text-[#0A4174] border border-[#7BBDE8] px-2 py-1 rounded text-[11px] font-black uppercase tracking-wider">
                          {s.subject_code}
                        </span>
                      ) : (
                        <span className="text-[#6EA2B3] text-[11px] italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const startMs = new Date(s.created_at).getTime();
                        const endMs = s.status === 'SUBMITTED' && s.submitted_at ? new Date(s.submitted_at).getTime() : (s.status === 'active' ? now : startMs);
                        const elapsed = Math.max(0, Math.floor((endMs - startMs) / 1000));
                        const h = Math.floor(elapsed / 3600);
                        const m = Math.floor((elapsed % 3600) / 60);
                        const sec = elapsed % 60;
                        const t = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
                        if (s.status === 'ABANDONED') return <span className="text-orange-500 text-[12px] italic">Expired</span>;
                        return <span className={`font-bold text-[13px] tabular-nums ${s.status === 'SUBMITTED' ? 'text-[#49769F]' : 'text-[#001D39]'}`}>{t}</span>;
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        if (!s.end_time) return <span className="text-[#6EA2B3] text-[11px] italic">—</span>;
                        const remaining = Math.max(0, Math.floor((new Date(s.end_time).getTime() - now) / 1000));
                        if (remaining <= 0) return <span className="text-red-500 text-[12px] font-black animate-pulse">TIME UP</span>;
                        const hrs = Math.floor(remaining / 3600);
                        const mins = Math.floor((remaining % 3600) / 60);
                        const secs = remaining % 60;
                        const timeStr = hrs > 0 ? `${hrs}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}` : `${mins}:${String(secs).padStart(2,'0')}`;
                        return (
                          <span className={`font-black text-[14px] tabular-nums ${remaining < 300 ? 'text-red-500 animate-pulse' : remaining < 600 ? 'text-orange-500' : 'text-[#0A4174]'}`}>
                            {timeStr}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${s.credibility_score > 70 ? 'bg-green-500' : s.credibility_score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: `${s.credibility_score}%` }}
                          ></div>
                        </div>
                        <span className="font-black text-[12px]">{s.credibility_score}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                        s.status === 'active' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        s.status === 'SUBMITTED' ? 'bg-green-50 text-green-700 border border-green-200' :
                        s.status === 'ABANDONED' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}>
                        {s.status === 'active' ? 'LIVE' : s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setSelectedSession(s)} className="text-[#49769F] hover:text-[#0A4174]" title="View Monitoring Logs"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                    </td>
                  </tr>
                ))
              );
              })()}
            </tbody>
          </table>
        </div>

        {/* Registered Students Table */}
        <div className="bg-white rounded-xl border border-[#7BBDE8] shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-[#7BBDE8] flex justify-between items-center">
            <h2 className="font-display font-bold">Registered Students</h2>
            <span className="text-[#49769F] text-[12px] font-bold">{allStudents.length} total</span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#BDD8E9] font-body text-[12px] uppercase tracking-widest text-[#49769F] font-display font-bold">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">User ID</th>
                <th className="px-6 py-4">Assigned Exam</th>
                <th className="px-6 py-4">Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7BBDE8] font-body text-[14px]">
              {allStudents.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-[#6EA2B3] italic">No students registered yet.</td>
                </tr>
              ) : (
                allStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-display font-bold text-[#001D39]">{s.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-[#eff6ff] text-[#0A4174] border border-[#7BBDE8] px-2 py-1 rounded text-[11px] font-black uppercase tracking-wider">
                        {s.user_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-body">{s.exam_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${s.is_eligible ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {s.is_eligible ? 'Eligible' : 'Ineligible'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Session Logs Modal */}
        {selectedSession && (
          <SessionLogsModal session={selectedSession} onClose={() => setSelectedSession(null)} />
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-[#7BBDE8] border-l-4 shadow-sm" style={{ borderColor: color }}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-black text-[#001D39]">{value}</span>
      </div>
      <p className="text-[#49769F] font-display text-[14px] font-display font-semibold uppercase tracking-widest">{label}</p>
    </div>
  );
}
