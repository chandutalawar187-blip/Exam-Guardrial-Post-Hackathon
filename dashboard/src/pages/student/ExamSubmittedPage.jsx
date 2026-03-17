// dashboard/src/pages/student/ExamSubmittedPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoDark from '../../assets/logo/Cognivigil_logo_full_dark.svg';
import { api } from '../../config';

export default function ExamSubmittedPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  const studentName = localStorage.getItem('student_name') || 'Student';
  const studentUid = localStorage.getItem('student_uid') || 'Unknown';
  const examName = localStorage.getItem('exam_name') || 'Exam';
  const sessionId = localStorage.getItem('session_id');
  const violationCount = parseInt(localStorage.getItem('exam_violations') || '0', 10);
  const answeredCount = parseInt(localStorage.getItem('exam_answers_count') || '0', 10);
  const totalQuestions = parseInt(localStorage.getItem('exam_questions_count') || '0', 10);
  const timeSpent = parseInt(localStorage.getItem('exam_time_spent') || '0', 10);

  useEffect(() => {
    if (sessionId) {
      api.get(`/api/sessions/${sessionId}`)
        .then(data => { if (data.session) setSession(data.session); })
        .catch(() => {});
    }
  }, [sessionId]);

  const credScore = session?.credibility_score ?? 100;
  const verdict = session?.verdict ?? 'CLEAR';
  const deductions = violationCount > 2 ? Math.floor((violationCount - 2)) : 0;
  const rawPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 100;
  const finalScore = Math.max(0, rawPercent - deductions);

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="min-h-screen bg-[#BDD8E9] flex items-center justify-center p-8 font-body">
      <div className="max-w-xl w-full bg-white rounded-[32px] border border-[#7BBDE8] shadow-2xl overflow-hidden p-12 text-center">
        
        <div className="mb-10 relative">
           <div className="w-24 h-24 bg-[#F0FDFA] rounded-full flex items-center justify-center mx-auto text-[#4E8EA2]">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
           </div>
           <div className="absolute inset-x-0 top-0 flex items-center justify-center bg-[#4E8EA2]/5 animate-ping w-24 h-24 rounded-full mx-auto -z-10"></div>
        </div>

        <h1 className="text-3xl font-black text-[#001D39] tracking-tighter mb-2 italic uppercase">Submission Successful</h1>
        <p className="text-[#49769F] font-body text-[14px] mb-12">Your responses have been securely logged and analyzed for integrity.</p>

        <div className="grid grid-cols-2 gap-4 mb-12">
           <Record label="Student" value={studentName} />
           <Record label="Student ID" value={studentUid} mono />
           <Record label="Exam" value={examName} />
           <Record label="Time" value={new Date().toLocaleString()} />
           <Record label="Proctoring Log" value={violationCount === 0 ? 'No violations' : `${violationCount} Breach${violationCount > 1 ? 'es' : ''} Recorded`} danger={violationCount > 0} />
           <Record label="Credibility" value={`${credScore}% — ${verdict}`} success={credScore >= 70} danger={credScore < 70} />
           <Record label="Answered" value={`${answeredCount} / ${totalQuestions} questions`} />
           <Record label="Time Spent" value={fmtTime(timeSpent)} />
        </div>

        {/* Score Card */}
        <div className="bg-[#001D39] rounded-2xl p-8 mb-12 flex items-center justify-between shadow-xl">
           <div className="text-left">
              <p className="text-[#49769F] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Credibility Score</p>
              <h2 className={`text-4xl font-black ${credScore >= 70 ? 'text-[#4E8EA2]' : credScore >= 40 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>{credScore}%</h2>
           </div>
           <div className="text-right space-y-1">
              <p className="text-white/40 text-[10px] font-bold">Answered: {answeredCount}/{totalQuestions}</p>
              {violationCount > 0 && <p className="text-[#EF4444] text-[10px] font-bold italic">Violations: {violationCount}</p>}
              <p className={`text-[10px] font-black uppercase ${verdict === 'CLEAR' ? 'text-[#4E8EA2]' : verdict === 'FLAGGED' ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>{verdict}</p>
           </div>
        </div>

        <button 
           onClick={() => {
             localStorage.removeItem('exam_violations');
             localStorage.removeItem('exam_answers_count');
             localStorage.removeItem('exam_questions_count');
             localStorage.removeItem('exam_time_spent');
             navigate('/');
           }}
           className="font-body text-[12px] font-black uppercase tracking-widest text-[#0A4174] hover:tracking-[0.3em] transition-all"
        >
           Return to Terminal Screen
        </button>

        <div className="mt-12 flex items-center justify-center gap-4 border-t border-[#7BBDE8] pt-8 grayscale opacity-50">
           <img src={logoDark} alt="Cognivigil" className="h-5" />
           <p className="text-[9px] font-bold text-[#49769F] uppercase tracking-widest">Powered by Sentinel AI</p>
        </div>
      </div>
    </div>
  );
}

function Record({ label, value, mono, danger, success }) {
  return (
    <div className="bg-[#BDD8E9] border border-[#7BBDE8] p-4 rounded-xl text-left">
       <p className="text-[9px] font-black uppercase text-[#6EA2B3] tracking-widest mb-1.5">{label}</p>
       <p className={`font-body text-[12px] font-bold ${mono ? 'font-mono' : ''} ${danger ? 'text-[#EF4444]' : success ? 'text-[#4E8EA2]' : 'text-[#001D39]'}`}>{value}</p>
    </div>
  );
}
