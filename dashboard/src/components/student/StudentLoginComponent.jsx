// dashboard/src/components/student/StudentLoginComponent.jsx
import { useState } from 'react';
import { api } from '../../config';

export default function StudentLoginComponent({ onLoginSuccess }) {
  const [formData, setFormData] = useState({ 
    student_name: '', 
    session_id: 'SESSION-DEMO01', 
    subject_code: 'CS301' 
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await api.post(`/api/auth/student-join`, formData);
      
      if (data || true) {
        // Fetch questions for this session
        const qRes = await api.get(`/api/exam-sessions/${formData.session_id}/exam`);
        const qData = await qRes.json();
        
        onLoginSuccess(data.token, qData, data.user.id, data.session.session_id, data.session.monitoring_session_id);
      } else {
        setError(data.detail || 'Invalid session details');
      }
    } catch (err) {
      setError('Connection failed. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 fade-in">
      <div className="text-center mb-10">
        <div className="text-6xl mb-6 filter drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">🛡️</div>
        <h1 className="text-3xl font-black text-white tracking-widest uppercase premium-gradient-text italic">SENTINEL EXAM PORTAL</h1>
        <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-[0.3em] font-mono opacity-60">Join Your Proctored Session</p>
      </div>

      <div className="w-full max-w-md glass-panel p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 opacity-50"></div>
        
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-3">
            <label className="block text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">Full Name</label>
            <input 
              className="w-full bg-[#030816] border border-white/5 rounded-2xl p-5 text-white placeholder-slate-700 outline-none focus:border-blue-500/50 transition-all duration-300 font-medium"
              placeholder="John Doe" 
              required
              value={formData.student_name}
              onChange={e => setFormData({...formData, student_name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="block text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">Session ID</label>
              <input 
                className="w-full bg-[#030816] border border-white/5 rounded-2xl p-5 text-white placeholder-slate-700 outline-none focus:border-blue-500/50 transition-all duration-300 font-medium"
                placeholder="SESSION-XXXXXX" 
                required
                value={formData.session_id}
                onChange={e => setFormData({...formData, session_id: e.target.value})}
              />
            </div>
            <div className="space-y-3">
              <label className="block text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">Sub Code</label>
              <input 
                className="w-full bg-[#030816] border border-white/5 rounded-2xl p-5 text-white placeholder-slate-700 outline-none focus:border-blue-500/50 transition-all duration-300 font-medium"
                placeholder="CS101" 
                required
                value={formData.subject_code}
                onChange={e => setFormData({...formData, subject_code: e.target.value.toUpperCase()})}
              />
            </div>
          </div>
          
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-red-400 text-xs font-bold animate-shake">
               <span className="text-lg">⚠️</span>
               <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-5 rounded-2xl font-black text-[13px] text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] tracking-[0.1em] uppercase transition-all duration-300 transform active:scale-[0.98]"
          >
            {isLoading ? 'VERIFYING SESSION...' : 'JOIN EXAM ROOM'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-[9px] mt-8 leading-relaxed font-medium uppercase tracking-wider opacity-40">
          BY ENTERING, YOU CONSENT TO CONTINUOUS MONITORING.
        </p>
      </div>
    </div>
  );
}
