import { useState, useEffect } from 'react';
import { api } from '../config';

export default function ExamPage() {
  const [active, setActive] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const examName = localStorage.getItem('exam_name');
    if (examName) {
      api.get(`/api/questions?exam_name=${encodeURIComponent(examName)}`)
        .then(setQuestions)
        .catch(e => setError('Failed to load questions: ' + e.message));
    }
  }, []);

  const enter = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setActive(true);
      // Automatically launch the native agent using our custom protocol
      window.location.assign('examguardrail://start');
      if (window.startExamSentinel) window.startExamSentinel();
    } catch {
      alert('Fullscreen is required to take this exam.');
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0F172A', display:'flex',
      alignItems:'center', justifyContent:'center', color:'white', fontFamily:'sans-serif' }}>
      {!active ? (
        <div style={{ textAlign:'center' }}>
          <h1 style={{ fontSize:32, fontWeight:'bold', marginBottom:8 }}>ExamGuardrail Sentinel</h1>
          <p style={{ color:'#93C5FD', marginBottom:32 }}>Integrity monitoring is required for this exam.</p>
          {error && <p style={{ color:'red', marginBottom:16 }}>{error}</p>}
          <button onClick={enter} style={{ background:'white', color:'#1E3A8A', fontWeight:'bold',
            fontSize:18, padding:'14px 40px', border:'none', borderRadius:12, cursor:'pointer' }}>
            Start Exam
          </button>
        </div>
      ) : (
        <div style={{ textAlign:'left', padding: '40px', maxWidth: '800px', width: '100%' }}>
          <p style={{ color:'#4ADE80', fontSize:20, textAlign: 'center', marginBottom: 20 }}>✅ Exam in progress</p>
          
          {questions.length === 0 ? (
            <p style={{ color:'#94A3B8', fontSize:14, textAlign: 'center' }}>Loading questions...</p>
          ) : (
            <div>
              {questions.map((q, idx) => (
                <div key={idx} style={{ background: '#1E293B', padding: 20, borderRadius: 8, marginBottom: 20 }}>
                  <h3 style={{ marginBottom: 16 }}>{idx + 1}. {q.question_text}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {Object.entries(q.options || {}).map(([key, val]) => (
                      <label key={key} style={{ background: '#334155', padding: 12, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="radio" name={`q_${q.id}`} value={key} />
                        <span>{key}. {val}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
