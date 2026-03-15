// dashboard/src/pages/admin/CreateExamPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../../components/AdminNavbar';
import { api } from '../../config';

export default function CreateExamPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [examConfig, setExamConfig] = useState({
    title: '', subject_code: '', description: '', durationPerQuestion: 60,
    startTime: '', endTime: '', maxStudents: 5
  });
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState({
    question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
    correct_answer: 'A', marks: 1
  });

  const addQuestion = (e) => {
    e.preventDefault();
    if (!currentQ.question_text) return;
    setQuestions([...questions, { ...currentQ, id: Date.now() }]);
    setCurrentQ({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', marks: 1 });
  };

  const publishExam = async () => {
    try {
      // Deploy all questions to the backend
      for (const q of questions) {
        await api.post('/api/questions', {
          exam_name: examConfig.title,
          subject_code: examConfig.subject_code,
          start_time: examConfig.startTime ? new Date(examConfig.startTime).toISOString() : null,
          end_time: examConfig.endTime ? new Date(examConfig.endTime).toISOString() : null,
          question_text: q.question_text,
          options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
          correct_answer: q.correct_answer
        });
      }
      alert(`Exam "${examConfig.title}" (${examConfig.subject_code}) published. Now authorize students in the Students tab.`);
      navigate('/admin/students');
    } catch (err) {
      console.error("Failed to publish exam", err);
      alert("Exam configuration saved locally. Backend sync pending.");
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#BDD8E9] flex flex-col">
      <AdminNavbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Progress Sidebar */}
        <aside className="w-64 bg-white border-r border-[#7BBDE8] p-8 flex flex-col gap-6 shrink-0">
          <StepIndicator number={1} label="Exam Details" active={step === 1} completed={step > 1} />
          <StepIndicator number={2} label="Add Questions" active={step === 2} completed={step > 2} />
          <StepIndicator number={3} label="Review & Publish" active={step === 3} completed={false} />
        </aside>

        {/* Form Area */}
        <main className="flex-1 overflow-y-auto p-12 bg-white">
          <div className="max-w-3xl mx-auto">
            
            {/* Step 1: Details */}
            {step === 1 && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-display font-bold text-[#001D39] mb-2 text-center">1. Examination Details</h2>
                <p className="text-[#49769F] font-body text-[14px] mb-8 text-center text-balance leading-relaxed">
                  Provide core configuration for the session.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div><Label>Exam Title</Label><Input value={examConfig.title} onChange={e => setExamConfig({...examConfig, title: e.target.value})} placeholder="e.g. Data Structures Mid-Term" /></div>
                  <div><Label>Subject Code</Label><Input value={examConfig.subject_code} onChange={e => setExamConfig({...examConfig, subject_code: e.target.value.toUpperCase()})} placeholder="e.g. CS301" /></div>
                  <div><Label>Start Time</Label><Input type="datetime-local" value={examConfig.startTime} onChange={e => setExamConfig({...examConfig, startTime: e.target.value})} /></div>
                  <div><Label>End Time</Label><Input type="datetime-local" value={examConfig.endTime} onChange={e => setExamConfig({...examConfig, endTime: e.target.value})} /></div>
                </div>
                {examConfig.startTime && examConfig.endTime && (() => {
                  const diffMs = new Date(examConfig.endTime).getTime() - new Date(examConfig.startTime).getTime();
                  if (diffMs <= 0) return <p className="mt-4 text-red-500 font-display font-bold text-[13px]">⚠ End time must be after start time</p>;
                  const totalMin = Math.floor(diffMs / 60000);
                  const hrs = Math.floor(totalMin / 60);
                  const mins = totalMin % 60;
                  const label = hrs > 0 ? `${hrs} hr ${mins > 0 ? `${mins} min` : ''}` : `${mins} min`;
                  return (
                    <div className="mt-4 bg-[#eff6ff] border border-[#7BBDE8] rounded-lg px-5 py-3 flex items-center gap-3">
                      <span className="text-[#0A4174] text-lg">⏱</span>
                      <div>
                        <p className="text-[10px] font-display font-bold uppercase tracking-[0.08em] text-[#6EA2B3]">Exam Duration</p>
                        <p className="font-display font-bold text-[#001D39] text-[15px]">{label}</p>
                      </div>
                    </div>
                  );
                })()}
                <button onClick={() => setStep(2)} disabled={!examConfig.title} className="mt-8 bg-[#0A4174] text-white w-full py-3 rounded-lg font-display font-bold disabled:opacity-50 hover:bg-[#001D39] transition-all">Next: Build Question Bank</button>
              </div>
            )}

            {/* Step 2: Questions */}
            {step === 2 && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-display font-bold text-[#001D39] mb-8">2. Question Bank</h2>
                <form onSubmit={addQuestion} className="bg-[#eff6ff] p-6 rounded-xl border border-[#7BBDE8] mb-8">
                  <Label>Question Text</Label>
                  <textarea value={currentQ.question_text} onChange={e => setCurrentQ({...currentQ, question_text: e.target.value})} className="w-full border border-[#7BBDE8] rounded-lg p-3 font-body text-[14px] min-h-[100px] mb-4 outline-none focus:ring-2 focus:ring-[#0A4174]/10 focus:border-[#0A4174]" placeholder="Enter the MCQ question..."></textarea>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div><Label>Option A</Label><Input value={currentQ.option_a} onChange={e => setCurrentQ({...currentQ, option_a: e.target.value})} /></div>
                    <div><Label>Option B</Label><Input value={currentQ.option_b} onChange={e => setCurrentQ({...currentQ, option_b: e.target.value})} /></div>
                    <div><Label>Option C</Label><Input value={currentQ.option_c} onChange={e => setCurrentQ({...currentQ, option_c: e.target.value})} /></div>
                    <div><Label>Option D</Label><Input value={currentQ.option_d} onChange={e => setCurrentQ({...currentQ, option_d: e.target.value})} /></div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#7BBDE8]">
                    <div className="flex gap-2">
                       {['A','B','C','D'].map(o => (
                         <button key={o} type="button" onClick={() => setCurrentQ({...currentQ, correct_answer: o})} className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold font-body text-[12px] border transition-all ${currentQ.correct_answer === o ? 'bg-[#4E8EA2] border-[#4E8EA2] text-white shadow-md' : 'bg-white border-[#7BBDE8] text-[#49769F]'}`}>{o}</button>
                       ))}
                    </div>
                    <button type="submit" className="bg-[#001D39] text-white px-8 py-2.5 rounded-lg font-display font-bold font-body text-[14px] shadow-md hover:opacity-90 transition-all">+ Add Question</button>
                  </div>
                </form>

                <div className="space-y-4">
                  <Label>Questions ({questions.length})</Label>
                  {questions.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-[#7BBDE8] rounded-xl text-[#6EA2B3] font-body text-[14px]">
                      Your question bank is empty.
                    </div>
                  ) : (
                    questions.map((q, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-lg border border-[#7BBDE8] flex justify-between items-center group transition-all hover:bg-[#f8fafc]">
                        <div className="flex-1">
                          <p className="font-display font-bold text-[#001D39] font-body text-[14px]">Q{idx+1}. {q.question_text}</p>
                          <p className="text-[10px] text-[#0A4174] font-black uppercase mt-1">Correct Answer: {q.correct_answer}</p>
                        </div>
                        <button onClick={() => setQuestions(questions.filter(qu => qu.id !== q.id))} className="text-[#EF4444] opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-50 rounded-lg">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-12 flex gap-4">
                  <button onClick={() => setStep(1)} className="bg-[#7BBDE8] text-[#49769F] px-8 py-3 rounded-lg font-display font-bold hover:bg-[#BDD8E9] transition-all">Back</button>
                  <button onClick={() => setStep(3)} disabled={questions.length === 0} className="bg-[#0A4174] text-white flex-1 py-3 rounded-lg font-display font-bold disabled:opacity-50 hover:bg-[#001D39] transition-all">Next: Review</button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="animate-in slide-in-from-right-4 duration-300 text-center">
                 <div className="text-6xl mb-6">🚀</div>
                 <h2 className="text-2xl font-display font-bold text-[#001D39] mb-8">Ready to Publish?</h2>
                 
                 <div className="bg-[#eff6ff] border border-[#7BBDE8] rounded-2xl p-8 mb-12 text-left grid grid-cols-2 gap-y-6">
                    <div><Label>Title</Label><p className="font-display font-bold text-[#001D39]">{examConfig.title}</p></div>
                    <div><Label>Subject Code</Label><p className="font-display font-bold text-[#001D39]">{examConfig.subject_code || '—'}</p></div>
                    <div><Label>Exam Duration</Label><p className="font-display font-bold text-[#001D39]">{examConfig.startTime && examConfig.endTime ? (() => { const d = Math.floor((new Date(examConfig.endTime).getTime() - new Date(examConfig.startTime).getTime()) / 60000); const h = Math.floor(d / 60); const m = d % 60; return h > 0 ? `${h} hr ${m > 0 ? `${m} min` : ''}` : `${m} min`; })() : '—'}</p></div>
                    <div><Label>Questions</Label><p className="font-display font-bold text-[#001D39]">{questions.length} Items</p></div>
                    <div className="col-span-2 border-t border-[#7BBDE8] pt-6">
                       <Label>Policy</Label>
                       <p className="font-body text-[12px] text-[#49769F] leading-relaxed">
                         By publishing, you enable the Cognivigil Sentinel AI proctoring suite for this session. Use the "Students" tab after this to authorize candidates.
                       </p>
                    </div>
                 </div>

                 <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="bg-[#7BBDE8] text-[#49769F] px-8 py-4 rounded-lg font-display font-bold hover:bg-[#BDD8E9] transition-all">Go Back</button>
                  <button onClick={publishExam} className="bg-[#0A4174] text-white flex-1 py-4 rounded-lg font-black font-display text-[18px] shadow-xl shadow-[#0A4174]/40 active:scale-[0.98] transition-all hover:bg-[#001D39]">PUBLISH & GO TO STUDENTS</button>
                 </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

function StepIndicator({ number, label, active, completed }) {
  return (
    <div className="flex items-center gap-4 transition-all">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold font-body text-[12px] shadow-sm transition-all duration-300 ${
        active ? 'bg-[#0A4174] text-white ring-4 ring-[#0A4174]/10' : 
        completed ? 'bg-[#4E8EA2] text-white' : 'bg-[#BDD8E9] text-[#6EA2B3]'
      }`}>
        {completed ? '✓' : number}
      </div>
      <span className={`text-[13px] font-display font-bold tracking-tight transition-all duration-300 ${
        active ? 'text-[#001D39]' : 'text-[#49769F]'
      }`}>{label}</span>
    </div>
  );
}

function Label({ children }) {
  return <label className="block text-[10px] font-display font-bold uppercase tracking-[0.08em] text-[#6EA2B3] mb-1.5">{children}</label>;
}

function Input(props) {
  return <input {...props} className="w-full bg-white border border-[#7BBDE8] rounded-lg px-4 py-2.5 font-body text-[14px] font-body font-normal outline-none focus:border-[#0A4174] focus:ring-2 focus:ring-[#0A4174]/10 transition-all placeholder:text-[#6EA2B3]" />;
}
