// dashboard/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../config';
import logoDark from '../assets/logo/Cognivigil_logo_full_dark.svg';

export default function LoginPage() {
  const [role, setRole] = useState('Student'); // Student | Admin
  const [uid, setUid] = useState('');
  const [password, setPassword] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (role === 'Admin') {
      try {
        const data = await api.post('/api/auth/admin-login', { username: uid, password })
        if (data.success) {
          login('admin', uid, data.token);
          navigate('/admin/dashboard');
        } else {
          setError('Invalid Admin credentials.');
        }
      } catch (err) {
        setError('Connection failed. Please ensure the server is running.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Student Login
    try {
      const data = await api.post('/api/auth/student-login', { user_id: uid, password, subject_code: subjectCode })
      if (data.success) {
        localStorage.setItem('exam_name', data.exam_name);
        localStorage.setItem('session_id', data.session_id);
        localStorage.setItem('student_name', data.name);
        localStorage.setItem('student_uid', data.user_id);
        if (data.end_time) localStorage.setItem('exam_end_time', data.end_time);
        if (data.start_time) localStorage.setItem('exam_start_time', data.start_time);
        login('student', uid, data.session_id);
        navigate('/exam/waiting');
      } else {
        if (data.already_attended) {
          setError(data.error || 'You have already attended this exam.');
        } else {
          setError(data.error || 'Invalid credentials. Please check your Student ID and Password.');
        }
      }
    } catch (err) {
      setError('Connection failed. Please ensure the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-body">
      {/* Left Panel: Branding */}
      <div className="hidden lg:flex w-1/2 bg-[#001D39] relative overflow-hidden flex-col items-center justify-center p-12">
        {/* Animated Rings Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="ring-overlay animate-pulse-teal" style={{ width: '400px', height: '400px' }}></div>
          <div className="ring-overlay animate-pulse-teal" style={{ width: '600px', height: '600px', animationDelay: '1s' }}></div>
          <div className="ring-overlay animate-pulse-teal" style={{ width: '800px', height: '800px', animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 text-center">
          <img src={logoDark} alt="Cognivigil Logo" className="h-24 mx-auto mb-6" />
          <p className="text-[#4E8EA2] uppercase tracking-[0.2em] font-display font-semibold font-body text-[14px] mb-12">
            Intelligent Exam Integrity. Powered by AI.
          </p>
          <div className="flex gap-4 justify-center">
            <FeaturePill text="🛡 Sentinel Protection" />
            <FeaturePill text="🧠 AI Monitoring" />
            <FeaturePill text="📊 Instant Reports" />
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-1/2 bg-[#BDD8E9] flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-10 rounded-[16px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[#7BBDE8]">
          {/* Role Toggle */}
          <div className="flex bg-[#BDD8E9] p-1 rounded-full mb-8 relative">
            <button 
              onClick={() => setRole('Student')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-display text-[14px] font-display font-semibold uppercase tracking-wider transition-all z-10 ${
                role === 'Student' ? 'text-white' : 'text-[#49769F]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
              Student
            </button>
            <button 
              onClick={() => setRole('Admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-display text-[14px] font-display font-semibold uppercase tracking-wider transition-all z-10 ${
                role === 'Admin' ? 'text-white' : 'text-[#49769F]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Admin
            </button>
            {/* Toggle Background Slide */}
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-200 ${
                role === 'Student' ? 'left-1 bg-[#0A4174]' : 'left-[calc(50%+2px)] bg-[#001D39]'
              }`}
            ></div>
          </div>

          <h2 className="text-[28px] font-display font-display font-bold font-display font-bold text-[#001D39] mb-2">{role} Access</h2>
          <p className="text-[#49769F] font-body text-[14px] mb-6">
            Please enter your credentials to {role === 'Student' ? 'enter the exam room' : 'access the portal'}.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[#49769F] font-display text-[14px] font-display font-semibold uppercase tracking-[0.06em] mb-1.5">
                {role === 'Student' ? 'Student UID' : 'Admin ID'}
              </label>
              <input 
                type="text" 
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder={role === 'Student' ? "Enter your unique exam ID" : "124843"}
                className="w-full border border-[#7BBDE8] rounded-lg px-4 py-3 font-body text-[14px] font-body font-normal focus:border-[#0A4174] focus:ring-2 focus:ring-[#0A4174]/10 outline-none transition-all placeholder:text-[#6EA2B3]"
                required
              />
            </div>

            <div>
              <label className="block text-[#49769F] font-display text-[14px] font-display font-semibold uppercase tracking-[0.06em] mb-1.5">
                Password
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#7BBDE8] rounded-lg px-4 py-3 font-body text-[14px] font-body font-normal focus:border-[#0A4174] focus:ring-2 focus:ring-[#0A4174]/10 outline-none transition-all placeholder:text-[#6EA2B3]"
                required
              />
            </div>

            {role === 'Student' && (
              <div>
                <label className="block text-[#49769F] font-display text-[14px] font-display font-semibold uppercase tracking-[0.06em] mb-1.5">
                  Subject Code <span className="normal-case tracking-normal font-normal text-[#6EA2B3]">(optional — for a different exam)</span>
                </label>
                <input 
                  type="text" 
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="e.g. CS301, MATH101"
                  className="w-full border border-[#7BBDE8] rounded-lg px-4 py-3 font-body text-[14px] font-body font-normal focus:border-[#0A4174] focus:ring-2 focus:ring-[#0A4174]/10 outline-none transition-all placeholder:text-[#6EA2B3]"
                />
              </div>
            )}

            {error && (
              <p className="text-[#EF4444] font-body text-[12px] font-display font-bold mt-2 leading-tight">
                ⚠️ {error}
              </p>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-lg text-white font-display font-bold font-body text-[14px] tracking-wide transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 ${
                role === 'Student' ? 'bg-[#0A4174] hover:bg-[#001D39]' : 'bg-[#001D39] hover:bg-[#001D39]'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {role === 'Student' ? 'Enter Exam Room' : 'Access Admin Portal'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
          </form>

          <footer className="mt-12 text-center text-[#6EA2B3] font-body text-[12px] font-body font-normal tracking-wide">
            COGNIVIGIL V2.0 — SECURE EXAM PLATFORM
          </footer>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ text }) {
  return (
    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
      <span className="text-white font-body text-[12px] font-display font-semibold">{text}</span>
    </div>
  );
}
