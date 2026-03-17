// dashboard/src/pages/student/StudentWaitingRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logoDark from '../../assets/logo/Cognivigil_logo_full_dark.svg';
import { api, API_BASE } from '../../config';

export default function StudentWaitingRoom() {
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Agent detection state
  const [agentStatus, setAgentStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
  const [agentCode, setAgentCode] = useState(''); // short 6-char code
  const agentPollRef = useRef(null);

  const studentName = localStorage.getItem('student_name') || 'Student';
  const studentUid = localStorage.getItem('student_uid') || (() => {
    try { return JSON.parse(localStorage.getItem('cognivigil_auth') || '{}').userId || 'Unknown'; }
    catch { return 'Unknown'; }
  })();
  const examName = localStorage.getItem('exam_name') || 'Exam';
  const sessionId = localStorage.getItem('session_id');

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsReady(true);
          playNotification();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Generate short agent code on mount
  useEffect(() => {
    if (!sessionId) return;
    const generateCode = async () => {
      try {
        const data = await api.post('/api/native-agent/generate-code', {
          session_id: sessionId,
          student_name: studentName,
          exam_name: examName,
        });
        if (data.code) setAgentCode(data.code);
      } catch (err) {
        console.error('Failed to generate agent code', err);
      }
    };
    generateCode();
  }, [sessionId]);

  // Agent status polling every 5 seconds
  useEffect(() => {
    if (!sessionId) {
      setAgentStatus('disconnected');
      return;
    }

    const checkAgent = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/native-agent/status/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setAgentStatus(data.status === 'connected' ? 'connected' : 'disconnected');
        } else {
          setAgentStatus('disconnected');
        }
      } catch {
        setAgentStatus('disconnected');
      }
    };

    checkAgent();
    agentPollRef.current = setInterval(checkAgent, 5000);
    return () => clearInterval(agentPollRef.current);
  }, [sessionId]);

  const fmtCountdown = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const playNotification = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch(_) {}
  };

  const startExam = async () => {
    if (sessionId) {
      navigate(`/exam/room?sessionId=${sessionId}`);
    } else {
      try {
        const data = await api.post(`/api/sessions`, {
          student_id: studentUid,
          student_name: studentName,
          exam_name: examName,
          platform: 'Windows-Cognivigil',
          device_type: 'Laptop'
        });
        localStorage.setItem('session_id', data.session_id);
        navigate(`/exam/room?sessionId=${data.session_id}`);
      } catch (err) {
        console.error('Failed to initialize session', err);
        navigate('/exam/room');
      }
    }
  };

  const canStart = isReady && agentStatus === 'connected';

  const copyCode = () => {
    if (agentCode) {
      navigator.clipboard.writeText(agentCode).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#001D39] flex items-center justify-center p-8 relative overflow-hidden">
      {/* Background Pulse */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
         <div className="ring-overlay animate-pulse-teal" style={{ width: '400px', height: '400px' }}></div>
      </div>

      <div className="max-w-md w-full bg-[#BDD8E9] rounded-[24px] overflow-hidden shadow-2xl relative z-10 p-10 text-center">
        <img src={logoDark} alt="Cognivigil" className="h-10 mx-auto mb-8" />
        
        <h2 className="text-[#001D39] text-[28px] font-display font-bold italic tracking-tight mb-1">Welcome, {studentName}</h2>
        <p className="text-[#49769F] font-display text-[14px] font-semibold uppercase tracking-widest mb-6">{examName}</p>

        {/* Agent Status Badge */}
        <div className={`flex items-center justify-center gap-2 mb-4 px-4 py-2.5 rounded-xl border text-[12px] font-bold uppercase tracking-widest ${
          agentStatus === 'connected'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
            : agentStatus === 'checking'
            ? 'bg-blue-50 border-blue-200 text-blue-500'
            : 'bg-amber-50 border-amber-300 text-amber-700'
        }`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            agentStatus === 'connected'
              ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
              : agentStatus === 'checking'
              ? 'bg-blue-400 animate-pulse'
              : 'bg-amber-400 animate-pulse'
          }`}></span>
          {agentStatus === 'connected' && '✓ GuardrailAgent Connected'}
          {agentStatus === 'checking' && 'Checking GuardrailAgent...'}
          {agentStatus === 'disconnected' && '⚠ GuardrailAgent Not Detected'}
        </div>

        {/* Agent Code Display */}
        {agentCode && agentStatus !== 'connected' && (
          <div className="bg-white border-2 border-[#0A4174] rounded-xl p-4 mb-4">
            <p className="text-[#49769F] text-[10px] font-black uppercase tracking-widest mb-2">
              Your Agent Code
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-[32px] font-black text-[#001D39] tracking-[0.3em] select-all">
                {agentCode}
              </span>
              <button onClick={copyCode}
                className="text-[#49769F] hover:text-[#0A4174] text-[18px] transition-colors"
                title="Copy code">
                📋
              </button>
            </div>
            <p className="text-[#6EA2B3] text-[10px] mt-1">Enter this code in ExamGuardrailAgent</p>
          </div>
        )}

        {/* Warning if agent not connected */}
        {agentStatus === 'disconnected' && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 text-left">
            <p className="text-amber-800 text-[12px] font-semibold mb-2">
              GuardrailAgent must be running before you can start the exam.
            </p>
            <ol className="text-amber-700 text-[11px] space-y-1 list-decimal list-inside">
              <li>Download <strong>ExamGuardrailAgent.exe</strong> (link from your instructor)</li>
              <li>Run it and enter the code: <strong className="font-mono text-[14px]">{agentCode || '...'}</strong></li>
              <li>Keep the window open — this page will update automatically</li>
            </ol>
          </div>
        )}

        {/* Connected success badge */}
        {agentStatus === 'connected' && agentCode && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center justify-center gap-2">
            <span className="text-emerald-600 text-[12px]">🛡️ Linked with code</span>
            <span className="font-mono font-bold text-emerald-700 tracking-wider">{agentCode}</span>
          </div>
        )}

        {/* Countdown Timer */}
        <div className="bg-white border border-[#7BBDE8] rounded-2xl p-6 mb-8 py-10 shadow-sm">
           <p className="text-[#49769F] text-[10px] font-black uppercase tracking-widest mb-2">
             {isReady ? 'Exam is ready' : 'Exam starts in'}
           </p>
           <p className={`text-4xl font-black tracking-tighter mb-4 ${isReady ? 'text-[#4E8EA2]' : 'text-[#001D39]'}`}>
             {isReady ? '✓ GO' : fmtCountdown(countdown)}
           </p>
           <div className="flex items-center justify-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-[#4E8EA2] shadow-[0_0_8px_#4E8EA2]' : 'bg-[#49769F] animate-pulse'}`}></span>
              <span className={`font-body text-[12px] font-bold uppercase tracking-widest ${isReady ? 'text-[#4E8EA2]' : 'text-[#49769F]'}`}>
                {isReady ? 'Exam is Ready' : 'Preparing environment...'}
              </span>
           </div>
        </div>

        {isReady && agentStatus === 'connected' && (
          <div className="animate-bounce mb-6">
             <div className="bg-[#0A4174] text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mx-auto inline-block">Proctor Link Established</div>
          </div>
        )}

        <button
          onClick={startExam}
          disabled={!canStart}
          className={`w-full py-4 rounded-xl font-black font-body text-[14px] tracking-widest uppercase transition-all transform active:scale-95 shadow-lg ${
            canStart ? 'bg-[#0A4174] text-white shadow-[#0A4174]/30 hover:bg-[#001D39]' : 'bg-[#7BBDE8] text-[#6EA2B3] cursor-not-allowed'
          }`}
        >
          {!isReady ? 'WAITING...' : agentStatus !== 'connected' ? 'AGENT REQUIRED' : 'START EXAMINATION'}
        </button>

        <p className="mt-8 text-[10px] text-[#6EA2B3] leading-relaxed italic px-4">
          Do not close this window. The exam will transition to secure proctored mode automatically once started.
        </p>
      </div>
    </div>
  );
}
