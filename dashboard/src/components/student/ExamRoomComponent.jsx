// dashboard/src/components/student/ExamRoomComponent.jsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../config';

export default function ExamRoomComponent({ examData, studentUid, sessionId, monitoringId, onComplete }) {
  const [sentinelReady, setSentinelReady] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState((examData.duration_minutes || examData.duration || 60) * 60);
  const [violationCount, setViolationCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (window.chrome?.runtime?.sendMessage) {
      window.chrome.runtime.sendMessage({ 
        type: 'SENTINEL_ACTIVATE', 
        sessionId: monitoringId, 
        studentUid 
      }, (res) => {
        if (res?.sentinelActive) setSentinelReady(true);
      });

      const listener = (msg) => {
        if (msg.type === 'VIOLATION_COUNT_UPDATE') {
          setViolationCount(msg.count);
          if (msg.count === 3) setShowWarning(true);
          if (msg.count > 3) alert(`Violation Detected! Score Deduction Applied.`);
        }
      };
      window.chrome.runtime.onMessage.addListener(listener);
      return () => {
         window.chrome.runtime.onMessage.removeListener(listener);
         window.chrome.runtime.sendMessage({ type: 'SENTINEL_DEACTIVATE' });
      };
    } else {
      // Enforce Sentinel presence
      console.error('Sentinel extension not detected. Exam cannot proceed.');
      // Keep sentinelReady = false to lock the interface
    }
  }, [monitoringId, studentUid]);

  useEffect(() => {
    if (!sentinelReady) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sentinelReady]);

  const handleSubmit = useCallback(async () => {
    // Note: backend expects { question_index: selected_index }
    // Our 'answers' state stores { question_index: selected_index }
    const res = await api.post(`/api/exam-sessions/${sessionId}/submit?student_name=${encodeURIComponent(studentUid)}`, { answers });
    const data = await res.json();
    onComplete(data);
  }, [studentUid, answers, sessionId, onComplete]);

  const questions = examData.questions || [];
  const currentQ = questions[currentIdx];

  if (!sentinelReady) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-6"></div>
        <h2 className="text-xl font-black text-white tracking-widest uppercase">INITIALISING SENTINEL...</h2>
        <p className="text-slate-500 text-sm mt-2 uppercase tracking-widest font-mono opacity-60">Connecting to Secure Proctoring Client</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex font-sans">
      <aside className="w-72 bg-[#030816] border-r border-white/5 p-8 flex flex-col shadow-2xl">
        <div className="mb-10">
          <div className="text-3xl mb-4">🛡️</div>
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Sentinel Navigator</h2>
        </div>
        
        <div className="grid grid-cols-4 gap-3">
          {questions.map((_, idx) => (
            <button
               key={idx}
               onClick={() => setCurrentIdx(idx)}
               className={`h-12 rounded-xl text-xs font-black transition-all duration-300 ${
                 currentIdx === idx ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105' :
                 answers[idx] !== undefined ? 'bg-blue-900/20 text-blue-400 border border-blue-500/20' : 'bg-[#0f172a] text-slate-500 border border-white/5 hover:border-white/10'
               }`}
            >
              {(idx + 1).toString().padStart(2, '0')}
            </button>
          ))}
        </div>
        
        <div className="mt-auto pt-8 border-t border-white/5">
           <button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-white shadow-[0_10px_30px_rgba(37,99,235,0.2)] text-[11px] uppercase tracking-widest transition-all">Submit Final Exam</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -mr-64 -mt-64"></div>
        
        <header className="h-24 bg-[#030816]/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-12 relative z-10">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">{examData.title}</h1>
            <p className="text-[10px] text-blue-400/60 uppercase font-mono tracking-widest mt-1">{studentUid} <span className="mx-2 text-slate-700">|</span> {sessionId}</p>
          </div>
          <div className="flex items-center gap-10">
             <div className="text-center group">
                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1 group-hover:text-blue-400 transition-colors">Time Remaining</p>
                <p className={`text-2xl font-mono font-black ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </p>
             </div>
             <div className="flex flex-col items-center">
                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Violations</p>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-tighter ${violationCount > 2 ? 'bg-red-600 text-white animate-bounce shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-[#0f172a] text-slate-400 border border-white/5'}`}>
                   CORE-{violationCount.toString().padStart(2, '0')}
                </div>
             </div>
          </div>
        </header>

        <div className="flex-1 p-16 max-w-5xl mx-auto w-full relative z-10">
          {currentQ && (
            <div className="fade-in">
               <p className="text-blue-500/50 text-[10px] mb-4 font-black uppercase tracking-[0.4em]">Checkpoint {currentIdx + 1} of {questions.length}</p>
               <h3 className="text-3xl font-black text-white leading-tight mb-12 tracking-tight">{currentQ.question_text}</h3>
               
               <div className="grid grid-cols-1 gap-4">
                  {(currentQ.options || []).map((opt, optIdx) => (
                    <button
                      key={optIdx}
                      onClick={() => setAnswers({...answers, [currentIdx]: optIdx})}
                      className={`w-full group text-left px-8 py-6 rounded-[24px] border-2 transition-all duration-300 flex items-center gap-6 ${
                        answers[currentIdx] === optIdx 
                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_15px_40px_rgba(37,99,235,0.3)] scale-[1.02]' 
                        : 'bg-[#0f172a]/40 border-white/5 hover:border-white/20 text-slate-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${
                         answers[currentIdx] === optIdx ? 'bg-white text-blue-600' : 'bg-[#1e293b] text-slate-500 group-hover:bg-[#334155]'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </div>
                      <span className="text-lg font-medium tracking-tight">{opt}</span>
                    </button>
                  ))}
               </div>

               <div className="mt-16 flex justify-between items-center bg-[#030816]/30 p-4 rounded-[32px] border border-white/5">
                  <button 
                    disabled={currentIdx === 0} 
                    onClick={() => setCurrentIdx(prev => prev - 1)}
                    className="px-10 py-4 bg-transparent text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-white transition-all disabled:opacity-20"
                  >
                    Previous
                  </button>
                  <div className="flex gap-2">
                    {questions.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIdx ? 'w-8 bg-blue-500' : 'w-1.5 bg-slate-800'}`}></div>
                    ))}
                  </div>
                  <button 
                    disabled={currentIdx === questions.length - 1} 
                    onClick={() => setCurrentIdx(prev => prev + 1)}
                    className="px-10 py-4 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-blue-500/5"
                  >
                    Next Logic
                  </button>
               </div>
            </div>
          )}
        </div>
      </main>

      {showWarning && (
        <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md z-[2147483645] flex items-center justify-center p-6 fade-in">
           <div className="bg-red-950/20 border-2 border-red-600/50 p-12 rounded-[48px] max-w-lg text-center shadow-[0_0_100px_rgba(220,38,38,0.2)] relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 blur-[60px] rounded-full"></div>
              <div className="text-7xl mb-8 animate-bounce">⚠️</div>
              <h2 className="text-4xl font-black text-white mb-6 tracking-tighter uppercase italic">Security Breach</h2>
              <div className="space-y-6 text-red-100/80">
                <p className="font-black text-xl tracking-tight text-red-500 uppercase">Multiple Violations Logged</p>
                <p className="text-sm font-medium leading-relaxed uppercase tracking-widest opacity-60">
                  ANY FURTHER ANOMALIES WILL TRIGGER AN AUTOMATIC SCORE REDUCTION AND OS-LEVEL REPORT GENERATION.
                </p>
              </div>
              <button 
                onClick={() => setShowWarning(false)}
                className="mt-12 bg-white text-red-950 px-12 py-5 rounded-[24px] font-black text-sm tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl"
              >
                ACKNOWLEDGE & RESUME
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
