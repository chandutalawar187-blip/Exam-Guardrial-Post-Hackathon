// dashboard/src/components/student/StudentReportComponent.jsx
// NEW: Comprehensive Student Results Report Card

export default function StudentReportComponent({ report }) {
  if (!report) return null;

  const scoreColor = report.final_score > 70 ? 'text-green-500' : report.final_score > 40 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="min-h-screen bg-gray-950 p-8 flex items-center justify-center font-sans">
      <div className="w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-blue-900/40 to-gray-900 p-12 border-b border-gray-800">
           <div className="flex justify-between items-start">
              <div>
                 <h1 className="text-4xl font-black text-white tracking-tight mb-2 uppercase italic">Exam Summary</h1>
                 <p className="text-blue-400 font-mono text-xs">{report.student_uid} • {report.exam_title || 'Sentinel Core Exam'}</p>
              </div>
              <div className="text-right">
                 <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Status</p>
                 <span className="bg-green-600 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase">Submitted</span>
              </div>
           </div>

           {/* Score Circles */}
           <div className="flex gap-12 mt-12 items-center">
              <div className="p-10 rounded-full bg-gray-800/40 border-4 border-gray-800 flex flex-col items-center justify-center">
                 <p className="text-xs text-gray-500 font-bold uppercase mb-1">Final Score</p>
                 <p className={`text-6xl font-black ${scoreColor}`}>{report.final_score}%</p>
              </div>
              <div className="flex-1 space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Raw Calculated Score</span>
                    <span className="text-white font-mono">{report.raw_score} marks</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Violation Penalty</span>
                    <span className="text-red-500 font-mono">-{report.violation_deductions} marks</span>
                 </div>
                 <div className="h-[2px] bg-gray-800 my-2"></div>
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 uppercase tracking-widest">Submission Date</span>
                    <span className="text-gray-400 font-mono">{new Date(report.submitted_at).toLocaleString()}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Violations Detail Section */}
        <div className="p-12">
           <h2 className="text-lg font-black text-white mb-6 tracking-widest uppercase italic flex items-center gap-3">
              <span className="w-8 h-8 bg-red-900/40 text-red-500 rounded flex items-center justify-center not-italic">!</span>
              Security Audit Log
           </h2>
           
           <div className="grid grid-cols-2 gap-8">
              {/* Violation Count Table */}
              <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-800/60">
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Total Breaches</p>
                 <p className="text-4xl font-black text-white mb-2">{report.total_violations}</p>
                 <p className="text-xs text-gray-400 leading-relaxed">
                   Sentinel monitored 12 modules including DevTools, Clipboard, and Tab Focus. 
                   {report.total_violations > 0 ? " Breaches were detected and logged in real-time." : " Zero breaches were detected."}
                 </p>
              </div>

              {/* AI Overlay Check */}
              <div className={`p-6 rounded-2xl border ${
                report.ai_overlay_status === 'CLEAN' ? 'bg-green-900/10 border-green-800/40' : 
                report.ai_overlay_status === 'CONFIRMED' ? 'bg-red-900/10 border-red-800/40' : 'bg-gray-800/30 border-gray-800/60'
              }`}>
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">AI Overlay Status</p>
                 <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                       report.ai_overlay_status === 'CLEAN' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 
                       report.ai_overlay_status === 'CONFIRMED' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-gray-500 animate-pulse'
                    }`}></div>
                    <p className={`text-xl font-black uppercase tracking-tighter ${
                       report.ai_overlay_status === 'CLEAN' ? 'text-green-500' : 
                       report.ai_overlay_status === 'CONFIRMED' ? 'text-red-500' : 'text-gray-400'
                    }`}>
                       {report.ai_overlay_status === 'CLEAN' ? 'Passed Audit' : 
                        report.ai_overlay_status === 'CONFIRMED' ? 'Malpractice Detected' : 'Analyzing Frame Data...'}
                    </p>
                 </div>
                 <p className="text-xs text-gray-400 leading-relaxed">
                   Frame-by-frame analysis of background render buffers for unauthorized AI assistance overlays.
                 </p>
              </div>
           </div>

           {/* Malpractice Summary Text */}
           <div className="mt-12 p-8 bg-gray-950/50 rounded-2xl border border-gray-800">
              <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">Auditor Summary</h3>
              <p className="text-sm text-gray-300 italic leading-relaxed">
                "The proctored session concluded with {report.total_violations} recorded browser violations. 
                {report.ai_overlay_status === 'CLEAN' ? " Deep-scan forensic analysis confirm no external AI overlays were active." : " Forensic checks indicate suspicious visual overlay activity."}
                Final mark adjustment: -{report.violation_deductions}."
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
