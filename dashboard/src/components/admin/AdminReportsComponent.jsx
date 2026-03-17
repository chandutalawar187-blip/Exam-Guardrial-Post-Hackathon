// dashboard/src/components/admin/AdminReportsComponent.jsx
import { useState, useEffect } from 'react';
import { Download, RefreshCw, AlertTriangle, ShieldCheck, ChevronRight, Activity, Search } from 'lucide-react';
import { api, API_BASE } from '../../config';

export default function AdminReportsComponent({ examId = "DEFAULT_EXAM" }) {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReports = async (showRefreshSpinnner = false) => {
    if (showRefreshSpinnner) setIsRefreshing(true);
    try {
      // Pointing to the correct API endpoint for grabbing exam reports
      const data = await api.get(`/api/exams/${examId}/reports`);
      if (data.reports) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // Sentinel live polling (15s)
    const interval = setInterval(() => fetchReports(false), 15000);
    return () => clearInterval(interval);
  }, [examId]);

  const filteredReports = reports.filter(r => {
    // Search Query Filter
    if (searchQuery && !r.student_uid.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
    }
    // Type Filter
    const score = r.final_score ?? 0;
    if (filter === 'CLEAN' && score < 90) return false;
    if (filter === 'CONFIRMED' && score >= 90) return false; 
    return true;
  });

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 fade-in">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight premium-gradient-text uppercase italic mb-2">Audit Reports</h1>
            <p className="text-slate-500 font-mono tracking-widest text-[10px] uppercase flex items-center gap-2">
               <Activity className="w-3 h-3 text-purple-500" /> Sentinel Forensics Data
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
               <input 
                  type="text" 
                  placeholder="Search Candiate UID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#030816] text-slate-300 pl-10 pr-6 py-3 rounded-xl border border-white/5 outline-none focus:border-purple-500/50 transition-all font-medium text-xs tracking-wider placeholder:text-slate-600"
               />
            </div>

            <select 
              className="bg-[#030816] text-slate-300 px-6 py-3 rounded-xl border border-white/5 outline-none focus:border-purple-500/50 transition-all font-medium text-xs tracking-wider uppercase cursor-pointer" 
              onChange={e => setFilter(e.target.value)}
              value={filter}
            >
              <option value="ALL">All Reports</option>
              <option value="CLEAN">Clean Only</option>
              <option value="CONFIRMED">Malpractice Only</option>
            </select>
            
            <button 
               onClick={() => fetchReports(true)}
               className="bg-[#030816] border border-white/5 hover:bg-white/5 text-slate-400 p-3 rounded-xl transition-colors"
               title="Force Refresh Data"
            >
               <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-500' : ''}`} />
            </button>

            <button 
               onClick={() => {
                 // Trigger Excel download from new backend endpoint
                 // Assuming we get the active session ID from the reports (picking primary for demo)
                 if(reports.length === 0) return alert('No reports to export');
                 const sessionIdToExport = reports[0].session_id || reports[0].id || examId;
                 window.location.href = `${API_BASE}/api/reports/${sessionIdToExport}/export`;
               }}
               className="flex items-center gap-2 bg-purple-600/10 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(168,85,247,0.1)]"
            >
               <Download className="w-4 h-4" /> Export CSV / Excel
            </button>
          </div>
        </header>

        <section className="glass-panel p-2 rounded-[32px] shadow-2xl relative overflow-hidden border border-white/5">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
          <div className="overflow-x-auto rounded-[28px] border border-white/5 bg-[#030816] min-h-[400px]">
            {isLoading ? (
               <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-500 font-mono text-xs uppercase tracking-widest">
                  <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
                  Loading Telemetry...
               </div>
            ) : filteredReports.length === 0 ? (
               <div className="p-20 text-center text-slate-500 font-mono text-xs uppercase tracking-widest">
                  No matching Sentinel records found.
               </div>
            ) : (
                <table className="w-full text-left text-slate-300 relative z-10">
                <thead className="bg-[#0f172a]/80 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                    <tr>
                    <th className="p-6 whitespace-nowrap">Candidate UID</th>
                    <th className="p-6">Trust Score</th>
                    <th className="p-6">Violations (L1-L4)</th>
                    <th className="p-6">Forensic Verdict</th>
                    <th className="p-6">Submission Time</th>
                    <th className="p-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredReports.map((report, idx) => (
                    <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                         <td className="p-6">
                           <p className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                             {report.score < 70 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                             {report.student_uid}
                           </p>
                           <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">Exam: {examId}</p>
                        </td>
                        <td className="p-6">
                           <div className={`text-xl font-black flex items-center gap-2 ${report.final_score >= 90 ? 'text-emerald-400' : report.final_score >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {report.final_score}%
                              {report.final_score >= 90 && <ShieldCheck className="w-5 h-5 opacity-70" />}
                           </div>
                        </td>
                        <td className="p-6">
                           <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase border ${
                              report.total_violations > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                           }`}>
                              {report.total_violations} Flags
                           </div>
                        </td>
                        <td className="p-6 text-xs">
                           <StatusBadge score={report.final_score} />
                        </td>
                        <td className="p-6 text-slate-500 text-[10px] font-mono tracking-widest uppercase">
                           {report.submitted_at ? new Date(report.submitted_at).toLocaleString() : 'Active Processing...'}
                        </td>
                        <td className="p-6 text-right">
                           <button className="inline-flex items-center gap-2 text-[10px] font-black text-blue-500 hover:text-blue-400 tracking-widest uppercase transition-colors px-4 py-2 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 border border-blue-500/20">
                              Analyze Vector <ChevronRight className="w-3 h-3" />
                           </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ score }) {
  if (score >= 90) return <span className="text-emerald-500 font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Clean Identity</span>;
  if (score >= 70) return <span className="text-yellow-500 font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Under Review</span>;
  if (score >= 50) return <span className="text-orange-500 font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Highly Suspicious</span>;
  return <span className="text-red-500 font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span> Confirmed Malpractice</span>;
}
