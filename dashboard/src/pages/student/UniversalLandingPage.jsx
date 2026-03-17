// dashboard/src/pages/student/UniversalLandingPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import logoDark from '../../assets/logo/Cognivigil_logo_full_dark.svg';
import { api, API_BASE } from '../../config';

export default function UniversalLandingPage() {
  const [step, setStep] = useState(1); // 1: Input, 2: Connected/Waiting
  const [formData, setFormData] = useState({
    examUrl: '',
    studentName: '',
    adminEmail: ''
  });
  const [loading, setLoading] = useState(false);
  const [agentCode, setAgentCode] = useState('');
  const [agentStatus, setAgentStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
  const agentPollRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create an ad-hoc session
      const sessId = `UNIV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const data = await api.post('/api/native-agent/generate-code', {
        session_id: sessId,
        student_name: formData.studentName,
        exam_name: 'Universal Exam (HackerRank/Other)',
        exam_url: formData.examUrl,
        admin_email: formData.adminEmail,
      });

      if (data.code) {
        setAgentCode(data.code);
        setStep(2);
        startPolling(sessId);
      }
    } catch (err) {
      alert('Failed to initialize secure session. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (sid) => {
    const checkAgent = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/native-agent/status/${sid}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'connected') {
            setAgentStatus('connected');
            // If connected, open the exam URL after a small delay
            setTimeout(() => {
              window.location.href = formData.examUrl;
            }, 3000);
          } else {
            setAgentStatus('disconnected');
          }
        }
      } catch {
        setAgentStatus('disconnected');
      }
    };
    checkAgent();
    agentPollRef.current = setInterval(checkAgent, 5000);
  };

  useEffect(() => {
    return () => clearInterval(agentPollRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-[#001D39] flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
         <div className="ring-overlay animate-pulse-teal" style={{ width: '400px', height: '400px' }}></div>
      </div>

      <div className="max-w-md w-full bg-[#BDD8E9] rounded-[24px] overflow-hidden shadow-2xl relative z-10 p-10 text-center">
        <img src={logoDark} alt="Cognivigil" className="h-10 mx-auto mb-8" />
        
        {step === 1 ? (
          <>
            <h2 className="text-[#001D39] text-[24px] font-display font-bold mb-2 uppercase tracking-tight">Secure Your Exam</h2>
            <p className="text-[#49769F] text-[13px] mb-8 px-4">Enter your exam details to start OS-level monitoring with ExamGuardrail.</p>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="text-[#001D39] text-[10px] font-black uppercase tracking-widest ml-1">Exam URL (HackerRank/LeetCode/etc)</label>
                <input
                  required
                  type="url"
                  placeholder="https://hackerrank.com/..."
                  className="w-full mt-1 px-4 py-3 rounded-xl border-2 border-transparent focus:border-[#0A4174] outline-none transition-all text-[#001D39] text-sm font-semibold"
                  value={formData.examUrl}
                  onChange={e => setFormData({...formData, examUrl: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[#001D39] text-[10px] font-black uppercase tracking-widest ml-1">Your Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="John Doe"
                  className="w-full mt-1 px-4 py-3 rounded-xl border-2 border-transparent focus:border-[#0A4174] outline-none transition-all text-[#001D39] text-sm font-semibold"
                  value={formData.studentName}
                  onChange={e => setFormData({...formData, studentName: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[#001D39] text-[10px] font-black uppercase tracking-widest ml-1">Admin Email (For Reports)</label>
                <input
                  required
                  type="email"
                  placeholder="proctor@exam.com"
                  className="w-full mt-1 px-4 py-3 rounded-xl border-2 border-transparent focus:border-[#0A4174] outline-none transition-all text-[#001D39] text-sm font-semibold"
                  value={formData.adminEmail}
                  onChange={e => setFormData({...formData, adminEmail: e.target.value})}
                />
              </div>

              <button
                disabled={loading}
                className="w-full py-4 mt-4 bg-[#0A4174] text-white rounded-xl font-black text-[12px] tracking-widest uppercase hover:bg-[#001D39] transition-all transform active:scale-95 disabled:bg-blue-300"
              >
                {loading ? 'INITIALIZING...' : 'SECURE & START EXAM'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className={`flex items-center justify-center gap-2 mb-6 px-4 py-2.5 rounded-xl border text-[12px] font-bold uppercase tracking-widest ${
              agentStatus === 'connected' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-amber-50 border-amber-300 text-amber-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${agentStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-amber-400 animate-pulse'}`}></span>
              {agentStatus === 'connected' ? '✓ GuardrailAgent Online' : 'Waiting for GuardrailAgent...'}
            </div>

            <div className="bg-white border-2 border-[#0A4174] rounded-xl p-6 mb-6">
              <p className="text-[#49769F] text-[10px] font-black uppercase tracking-widest mb-3">Your Agent Code</p>
              <div className="font-mono text-[40px] font-black text-[#001D39] tracking-[0.2em] mb-2">{agentCode}</div>
              <p className="text-[#6EA2B3] text-[11px]">Type this code into the desktop app</p>
            </div>

            {agentStatus === 'connected' ? (
              <div className="animate-bounce">
                <p className="text-[#0A4174] font-black text-sm">✓ EXAM SECURED!</p>
                <p className="text-[#49769F] text-xs">Opening your exam URL in 3 seconds...</p>
              </div>
            ) : (
              <div className="text-left text-[#49769F] text-[11px] space-y-2 bg-[#E1EFF6] p-4 rounded-xl border border-blue-200">
                <p className="font-bold text-[#001D39]">How to proceed:</p>
                <p>1. Open <b>ExamGuardrailAgent.exe</b> on your PC</p>
                <p>2. Enter code <b>{agentCode}</b> and click Start</p>
                <p>3. Once connected, we will automatically launch your exam.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
