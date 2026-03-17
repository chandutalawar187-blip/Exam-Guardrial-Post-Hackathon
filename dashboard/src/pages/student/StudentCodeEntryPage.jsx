import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExam } from '../../context/ExamContext';
import { API_BASE } from '../../config';
import logoDark from '../../assets/logo/Cognivigil_logo_full_dark.svg';

export default function StudentCodeEntryPage() {
  const navigate = useNavigate();
  const { setExamSession } = useExam();
  const [subjectCode, setSubjectCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!subjectCode.trim()) {
      setError('Please enter a subject code');
      return;
    }

    try {
      setLoading(true);
      const code = subjectCode.toUpperCase();
      
      // Step 1: Try to lookup as exam by subject code
      let response = await fetch(`${API_BASE}/api/sessions/code/${code}`);
      
      if (!response.ok) {
        // Step 1 Failed: Try to lookup as existing session ID
        console.log('Code not found as exam code, trying as session ID...');
        response = await fetch(`${API_BASE}/api/sessions/${code}/exam`);
        
        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Invalid subject code or session. Please check and try again.');
          return;
        }
        
        // Successfully found as session - resume it
        const data = await response.json();
        const { session, exam } = data;
        
        if (!session) {
          setError('Session not found');
          return;
        }

        // Store session in context with exam details
        setExamSession({
          id: session.id || session._id,
          exam_id: session.exam_id,
          student_id: session.student_id,
          student_name: session.student_name,
          exam_name: exam?.title || 'Exam',
          subject_code: exam?.subject_code || 'Unknown',
          status: session.status,
        });

        // Navigate to waiting room
        navigate('/exam/waiting');
        return;
      }

      // Successfully found as exam code
      const data = await response.json();
      const { exam } = data;
      
      if (!exam) {
        setError('No exam found for this code');
        return;
      }

      // Step 2: Create a session in the database for this exam
      const sessionResponse = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exam_id: exam.id || exam._id,
          student_id: 'STUDENT_' + Math.random().toString(36).substr(2, 9),
          student_name: 'Student',
        })
      });

      if (!sessionResponse.ok) {
        const error = await sessionResponse.json();
        setError('Failed to create session: ' + (error.detail || 'Unknown error'));
        return;
      }

      const sessionData = await sessionResponse.json();

      // Step 3: Store session in context with exam details
      setExamSession({
        id: sessionData.session_id || sessionData.id,
        exam_id: exam.id || exam._id,
        student_id: sessionData.student_id,
        student_name: sessionData.student_name,
        exam_name: exam.title,
        subject_code: exam.subject_code,
        status: 'active',
      });

      // Navigate to waiting room
      navigate('/exam/waiting');
    } catch (err) {
      setError('Failed to validate code. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001D39] to-[#0A4174] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-[#4E8EA2] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-[#7BBDE8] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <img src={logoDark} alt="Cognivigil" className="h-12 mx-auto mb-6" />
          <h1 className="text-[#BDD8E9] text-4xl font-bold mb-2">Exam Access</h1>
          <p className="text-[#7BBDE8] text-sm">Enter your subject code to begin</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#1a3a4a] border border-[#4E8EA2] rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject Code Input */}
            <div>
              <label htmlFor="code" className="block text-[#BDD8E9] text-sm font-semibold mb-2 uppercase tracking-widest">
                Subject Code
              </label>
              <input
                id="code"
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                placeholder="e.g., CSC301-A1B2C"
                className="w-full px-4 py-3 bg-[#0A4174] border border-[#4E8EA2] rounded-lg text-[#BDD8E9] placeholder-[#7BBDE8] focus:outline-none focus:ring-2 focus:ring-[#4E8EA2] focus:border-transparent transition"
                maxLength="20"
                disabled={loading}
                autoCapitalize="characters"
              />
              <p className="text-[#7BBDE8] text-xs mt-2">Your instructor will provide this code</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4E8EA2] hover:bg-[#6BA3B8] disabled:bg-[#49769F] text-white font-bold py-3 rounded-lg transition duration-200 uppercase tracking-widest text-sm"
            >
              {loading ? 'Validating...' : 'Enter Exam'}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-8 pt-6 border-t border-[#4E8EA2]">
            <p className="text-[#7BBDE8] text-xs text-center">
              ℹ️ Your code grants access to a specific exam. Once entered, you will not be able to change it.
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-[#7BBDE8] text-sm">
          <p>Questions? Contact your exam coordinator</p>
        </div>
      </div>
    </div>
  );
}
