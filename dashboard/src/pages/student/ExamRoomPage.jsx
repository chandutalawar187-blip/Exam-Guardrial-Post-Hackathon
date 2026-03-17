// dashboard/src/pages/student/ExamRoomPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../config';
import { useGuardrail } from '@guardrail-sdk/useGuardrail';
import { ProctoringOverlay } from '@guardrail-sdk/ProctoringOverlay';

export default function ExamRoomPage() {
  const navigate = useNavigate();
  const [init, setInit] = useState(false);
  const [curr, setCurr] = useState(0);
  const [answers, setAnswers] = useState({});
  const examEndTime = localStorage.getItem('exam_end_time');
  const getInitialTimer = () => {
    if (examEndTime) {
      const remaining = Math.max(0, Math.floor((new Date(examEndTime).getTime() - Date.now()) / 1000));
      return remaining;
    }
    return 3600; // fallback 60 min
  };
  const [timer, setTimer] = useState(getInitialTimer);
  const [showWarn, setShowWarn] = useState(false);
  const [questions, setQuestions] = useState([]);

  const studentUid = localStorage.getItem('student_uid') || 'COG-ST-A1B2C3';
  const examTitle = localStorage.getItem('exam_name') || 'Data Structures Advanced';
  const sessionId = new URLSearchParams(window.location.search).get('sessionId') || localStorage.getItem('session_id');

  // ── GUARDRAIL SDK (replaces inline violation detection + media handling) ──
  const {
    violations, mediaState, faceStatus, audioLevel,
    startMonitoring, requestMedia, startProctoring, stop, getVideoStream
  } = useGuardrail({
    apiBase: '/api',
    sessionId,
    studentUid,
    autoStart: false
  });

  // Start monitoring + proctoring once init is true
  useEffect(() => {
    if (!init) return;
    startMonitoring();
    requestMedia().then(ok => {
      if (ok) startProctoring();
    });
  }, [init]);

  // Show warning at 3 violations
  useEffect(() => {
    if (violations === 3) setShowWarn(true);
  }, [violations]);

  // ── FETCH QUESTIONS ─────────────────────────────────────────
  useEffect(() => {
    const examName = localStorage.getItem('exam_name');
    if (examName) {
      api.get(`/api/questions?exam_name=${encodeURIComponent(examName)}`)
        .then(data => setQuestions(Array.isArray(data) ? data : []))
        .catch(err => {
          console.error("Failed to load questions", err);
          setQuestions([]); // Don't block the page
        });
    }
  }, []);

  // ── SENTINEL ACTIVATION ────────────────────────────────────
  useEffect(() => {
    const hasSentinel = typeof window.chrome !== 'undefined'
      && window.chrome.runtime
      && typeof window.chrome.runtime.id === 'string'
      && window.chrome.runtime.id.length > 0;

    if (hasSentinel) {
      try {
        window.chrome.runtime.sendMessage(
          window.chrome.runtime.id,
          { type: 'SENTINEL_ACTIVATE', sessionId, studentUid },
          (res) => {
            if (res?.sentinelActive) setTimeout(() => setInit(true), 1500);
            else setTimeout(() => setInit(true), 2000);
          }
        );
      } catch (e) {
        console.warn('[Sentinel] Extension error:', e.message);
        setTimeout(() => setInit(true), 2000);
      }
    } else {
      // No extension — proceed without sentinel
      setTimeout(() => setInit(true), 2000);
    }
  }, [sessionId, studentUid]);

  // ── TIMER ──────────────────────────────────────────────────
  useEffect(() => {
    if (!init) return;
    const tick = () => {
      if (examEndTime) {
        const rem = Math.max(0, Math.floor((new Date(examEndTime).getTime() - Date.now()) / 1000));
        setTimer(rem);
      } else {
        setTimer(v => (v > 0 ? v - 1 : 0));
      }
    };
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [init]);

  // ── AUTO-SUBMIT ON TIME UP ─────────────────────────────────
  useEffect(() => {
    if (init && timer === 0) handleSubmit();
  }, [timer, init]);

  const handleSubmit = async () => {
    // Stop SDK (cleans up media streams, listeners, proctoring)
    stop();

    try {
      if (typeof window.chrome !== 'undefined' && window.chrome.runtime && typeof window.chrome.runtime.id === 'string') {
        window.chrome.runtime.sendMessage(window.chrome.runtime.id, { type: 'SENTINEL_DEACTIVATE' });
      }
    } catch (_) { /* extension not available */ }

    // Submit answers to backend
    if (sessionId) {
      try {
        await api.post('/api/student/exam/submit', {
          studentUid: studentUid,
          sessionId: sessionId,
          answers: answers
        });
      } catch (err) {
        console.error('[Submit] Failed:', err);
      }
    }

    // Store exam results for submission page
    localStorage.setItem('exam_violations', String(violations));
    localStorage.setItem('exam_answers_count', String(Object.keys(answers).length));
    localStorage.setItem('exam_questions_count', String(questions.length));
    localStorage.setItem('exam_time_spent', String(getInitialTimer() - timer));

    navigate('/exam/submitted');
  };

  // ── PERMISSION DENIED GATE — student MUST allow camera/mic ──
  if (mediaState === 'denied') {
    const retryPermission = async () => {
      const ok = await requestMedia();
      if (ok) startProctoring();
    };
    return (
      <div className="min-h-screen bg-[#001D39] flex flex-col items-center justify-center p-8">
        <div className="bg-[#0A4174] border border-[#4E8EA2] rounded-3xl p-10 max-w-md text-center shadow-2xl">
          <div className="text-6xl mb-6">🎥</div>
          <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Camera & Microphone Required</h2>
          <p className="text-[#BDD8E9] text-[14px] leading-relaxed mb-6">
            This proctored examination requires access to your <b>camera</b> and <b>microphone</b> for integrity monitoring.
            You <b>cannot proceed</b> without granting permission.
          </p>
          <div className="bg-[#001D39] rounded-xl p-4 mb-6 border border-[#4E8EA2]/30">
            <p className="text-[#F59E0B] text-[11px] font-black uppercase tracking-widest">How to enable</p>
            <p className="text-[#BDD8E9] text-[12px] mt-2 leading-relaxed">
              Click the camera icon in your browser's address bar, select "Allow", then click the button below.
            </p>
          </div>
          <button onClick={retryPermission}
            className="w-full bg-[#4E8EA2] text-white py-4 rounded-xl font-black text-[14px] uppercase tracking-widest hover:bg-[#6EA2B3] transition-all active:scale-95">
            I've Allowed — Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!init || mediaState === 'idle' || mediaState === 'requesting') {
    return (
      <div className="min-h-screen bg-[#001D39] flex flex-col items-center justify-center p-8">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
           <div className="ring-overlay animate-pulse-teal" style={{ width: '500px', height: '500px' }}></div>
        </div>
        <div className="flex flex-col items-center relative z-10">
           <div className="w-10 h-10 border-4 border-[#4E8EA2] border-t-transparent rounded-full animate-spin mb-4"></div>
           <h2 className="text-[#BDD8E9] text-[28px] font-display font-display font-bold font-black italic tracking-tighter">
             {mediaState === 'requesting' ? 'Requesting Camera & Microphone Access...' : 'Initialising Secure Proctored Environment...'}
           </h2>
           <p className="text-[#49769F] font-display text-[14px] font-display font-semibold uppercase tracking-[0.2em] mt-2">
             {mediaState === 'requesting' ? 'Please allow access in the browser popup' : 'Connecting to Sentinel AI Suite'}
           </p>
        </div>
      </div>
    );
  }

  const fmtTime = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  // No questions available
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-body">
        <header className="h-20 bg-[#001D39] text-white flex items-center justify-between px-8 border-b-2 border-[#4E8EA2] shrink-0">
          <div><h1 className="font-body text-[14px] font-black italic">{examTitle}</h1><p className="text-[10px] font-bold text-[#49769F] tracking-widest">SECURE SESSION</p></div>
          <div className="text-center"><p className="text-[9px] font-black uppercase tracking-widest text-[#49769F] mb-1">Time Remaining</p><p className="text-2xl font-black tabular-nums tracking-tighter text-[#4E8EA2]">{fmtTime(timer)}</p></div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-6xl mb-4">📋</p>
            <h2 className="text-xl font-bold text-[#001D39] mb-2">No Questions Available</h2>
            <p className="text-[#49769F] text-[14px] mb-8">The examiner has not deployed questions for <b>{examTitle}</b> yet.</p>
            <button onClick={handleSubmit} className="bg-[#001D39] text-white px-8 py-3 rounded-xl font-black text-[12px] uppercase tracking-widest">Exit Exam</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-body">
      {/* Top Bar */}
      <header className="h-20 bg-[#001D39] text-white flex items-center justify-between px-8 border-b-2 border-[#4E8EA2] shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-10 w-[1px] bg-white/10 hidden md:block"></div>
          <div>
            <h1 className="font-body text-[14px] font-black italic">{examTitle}</h1>
            <p className="text-[10px] font-display font-bold text-[#49769F] tracking-widest">SECURE SESSION</p>
          </div>
        </div>

        <div className="flex items-center gap-12">
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#49769F] mb-1">Time Remaining</p>
            <p className={`text-2xl font-black tabular-nums tracking-tighter ${timer < 300 ? 'text-[#EF4444] animate-pulse' : 'text-[#4E8EA2]'}`}>{fmtTime(timer)}</p>
          </div>
          <div className="flex gap-4">
            <div className={`px-4 py-2 rounded-xl border shadow-lg flex items-center gap-2 ${violations > 2 ? 'bg-[#EF4444] border-[#EF4444] animate-bounce' : 'bg-white/10 border-white/20'}`}>
              <div className={`w-2 h-2 rounded-full ${violations > 2 ? 'bg-white' : 'bg-[#4E8EA2] animate-pulse'}`}></div>
              <span className="font-body text-[12px] font-black uppercase tracking-widest">{violations} Breaches</span>
            </div>
            {mediaState === 'granted' && (
              <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                <span className="font-body text-[10px] font-black uppercase tracking-widest text-[#4E8EA2]">CAM + MIC</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Navigator Sidebar */}
        <aside className="w-[200px] border-r border-[#7BBDE8] p-6 shrink-0 bg-[#BDD8E9]">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6EA2B3] mb-6">Question Navigator</p>
           <div className="grid grid-cols-4 gap-2">
             {questions.map((_, i) => (
               <button 
                  key={i} 
                  onClick={() => setCurr(i)}
                  className={`h-9 rounded-lg font-black font-body text-[12px] transition-all ${
                    curr === i ? 'bg-[#0A4174] text-white shadow-lg shadow-[#0A4174]/40 scale-110' : 
                    answers[questions[i].id] ? 'bg-[#4E8EA2] text-white' : 'bg-white text-[#49769F] border border-[#7BBDE8]'
                  }`}
               >
                 {i+1}
               </button>
             ))}
           </div>
           <button onClick={handleSubmit} className="mt-12 w-full bg-[#001D39] hover:bg-[#001D39] text-white py-3 rounded-xl font-black font-body text-[12px] uppercase tracking-widest transition-all shadow-md">Submit Exam</button>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 overflow-y-auto p-12 bg-white flex flex-col items-center">
          <div className="max-w-2xl w-full">
             <div className="flex items-center gap-3 mb-4">
               <span className="text-[#0A4174] font-black font-body text-[14px] tracking-tighter">QUESTION {curr+1} / {questions.length}</span>
               <div className="h-[1px] flex-1 bg-[#7BBDE8]"></div>
             </div>
             
             <h2 className="text-[22px] font-display font-bold text-[#001D39] leading-[1.4] mb-12">{questions[curr].question_text}</h2>
             
             <div className="space-y-4">
               {['A','B','C','D'].map(opt => (
                 <button
                    key={opt}
                    onClick={() => setAnswers({...answers, [questions[curr].id]: opt})}
                    className={`w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                      answers[questions[curr].id] === opt 
                      ? 'bg-[#EFF6FF] border-[#0A4174] border-2 shadow-sm' 
                      : 'bg-white border-[#7BBDE8] hover:border-[#CBD5E1]'
                    }`}
                 >
                    <div className="flex items-center gap-4">
                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black font-body text-[14px] ${
                         answers[questions[curr].id] === opt ? 'bg-[#0A4174] text-white' : 'bg-[#BDD8E9] text-[#49769F] group-hover:bg-[#7BBDE8]'
                       }`}>{opt}</div>
                       <span className={`font-display font-semibold font-body text-[16px] ${answers[questions[curr].id] === opt ? 'text-[#001D39]' : 'text-[#49769F]'}`}>{questions[curr].options?.[opt]}</span>
                    </div>
                    {answers[questions[curr].id] === opt && (
                      <div className="w-5 h-5 bg-[#0A4174] rounded-full flex items-center justify-center">
                         <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                 </button>
               ))}
             </div>

             <div className="flex justify-between items-center mt-16 pt-8 border-t border-[#7BBDE8]">
                <button onClick={() => setCurr(v => Math.max(0, v-1))} disabled={curr === 0} className="flex items-center gap-2 font-body text-[12px] font-display font-bold text-[#49769F] hover:text-[#001D39] disabled:opacity-20 transition-all uppercase tracking-widest"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Previous</button>
                <div className="flex gap-2">
                   {questions.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${curr === i ? 'w-8 bg-[#0A4174]' : 'w-1.5 bg-[#7BBDE8]'}`}></div>)}
                </div>
                <button onClick={() => setCurr(v => Math.min(questions.length-1, v+1))} disabled={curr === questions.length-1} className="flex items-center gap-2 font-body text-[12px] font-display font-bold text-[#0A4174] hover:text-[#001D39] disabled:opacity-0 transition-all uppercase tracking-widest">Next <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></button>
             </div>
          </div>
        </main>
      </div>

      {/* ── PROCTORING OVERLAY (Camera + Mic via SDK) ── */}
      <ProctoringOverlay
        videoStream={getVideoStream()}
        faceStatus={faceStatus}
        audioLevel={audioLevel}
        position="bottom-right"
      />

      {/* ── VIOLATION WARNING MODAL ── */}
      {showWarn && (
        <div className="fixed inset-0 bg-[#001D39]/80 backdrop-blur-md z-[2147483645] flex items-center justify-center p-6">
           <div className="bg-[#001D39] border-t-8 border-[#F59E0B] p-10 rounded-[28px] max-w-sm text-center shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
              <div className="text-6xl mb-6 scale-125 animate-bounce">⚠️</div>
              <h2 className="text-4xl font-black text-white mb-2 italic tracking-tighter uppercase">Warning</h2>
              <p className="text-[#BDD8E9] font-display font-bold font-body text-[14px] mb-6 leading-relaxed">
                THREE VIOLATIONS DETECTED. EVERY FURTHER ACTION WILL RESULT IN A MANDATORY -1 MARK DEDUCTION.
              </p>
              <div className="bg-[#001D39] p-4 rounded-xl font-body text-[12px] text-[#F59E0B] font-display font-bold uppercase tracking-widest mb-8 border border-[#F59E0B]/20">
                 DEDUCTIONS ARE ACTIVE
              </div>
              <button 
                onClick={() => setShowWarn(false)}
                className="w-full bg-[#0A4174] text-white py-4 rounded-xl font-black font-body text-[14px] tracking-widest uppercase hover:bg-[#001D39] transition-all active:scale-95"
              >
                I Understand — PROCEED
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
