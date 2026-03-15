// dashboard/src/components/admin/CreateExamComponent.jsx
import { useState } from 'react';
import { Trash2, Loader2, AlertCircle, PlusCircle } from 'lucide-react';
import { api } from '../../config'; 

export default function CreateExamComponent() {
  const [examInfo, setExamInfo] = useState({ 
    title: '', 
    subject_code: '', 
    duration_minutes: 60, 
    start_time: '', 
    end_time: '' 
  });
  const [questions, setQuestions] = useState([]);
  const [aiParams, setAiParams] = useState({ topic: '', difficulty: 'medium', count: 5 });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const addQuestion = () => {
    setQuestions([...questions, { question_text: '', options: ['', '', '', ''], correct_option: 0, marks: 1 }]);
  };

  const removeQuestion = (index) => {
    const newQs = [...questions];
    newQs.splice(index, 1);
    setQuestions(newQs);
  };

  const generateAiQuestions = async () => {
    setIsGenerating(true);
    setValidationError('');
    try {
      const data = await api.post(`/api/exams/generate-questions`, aiParams);
      if (data.questions) {
        setQuestions([...questions, ...data.questions]);
      } else {
        setValidationError('Failed to generate questions. Model returned an invalid response.');
      }
    } catch (err) {
       setValidationError('AI Generation failed. Check backend connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveExam = async () => {
    setValidationError('');
    setSuccessInfo(null);
    
    // Validations
    if (!examInfo.title.trim()) return setValidationError('Exam Title is required to save.');
    if (!examInfo.subject_code.trim()) return setValidationError('Subject Code is required to save.');
    if (!examInfo.start_time) return setValidationError('Start Time is required to schedule the session.');
    if (!examInfo.duration_minutes || examInfo.duration_minutes <= 0) return setValidationError('A valid positive duration is required.');
    if (questions.length === 0) return setValidationError('At least one question must be added to the corpus.');

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question_text.trim()) return setValidationError(`Question ${i + 1} text cannot be empty.`);
        if (q.options.some(opt => !opt.trim())) return setValidationError(`Question ${i + 1} has one or more empty options.`);
    }

    setIsSaving(true);
    try {
      // Deploy each question to the database
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await api.post('/api/questions', {
          exam_name: examInfo.title,
          subject_code: examInfo.subject_code,
          question_text: q.question_text,
          options: { A: q.options[0], B: q.options[1], C: q.options[2], D: q.options[3] },
          correct_answer: String.fromCharCode(65 + q.correct_option)
        });
      }

      setSuccessInfo({
        subject_code: examInfo.subject_code,
        exam_name: examInfo.title,
        question_count: questions.length
      });
      
      // Auto-jump window to bottom to see credentials
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
      
    } catch (err) {
      console.error(err);
      setValidationError('Error saving exam: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8 fade-in">
        
        <header className="mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight premium-gradient-text uppercase italic mb-2">Configure Sentinel Exam</h1>
          <p className="text-slate-500 font-mono tracking-widest text-[10px] uppercase">Secure Subject Allocation & Intelligence Generation</p>
        </header>

        {/* Global Validation Error Banner */}
        {validationError && (
          <div className="bg-red-950/40 border border-red-500/50 text-red-200 px-6 py-4 rounded-xl flex items-center gap-4 fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span className="text-sm font-semibold tracking-wide">{validationError}</span>
          </div>
        )}

        {/* Exam Setup Section */}
        <section className="glass-panel p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <h2 className="text-sm font-black text-blue-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="text-xl">1.</span> Meta Information
          </h2>
          <div className="grid grid-cols-2 gap-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam Title <span className="text-red-500">*</span></label>
              <input 
                className={`w-full bg-[#030816] border rounded-xl p-4 outline-none transition-all font-medium text-sm ${!examInfo.title && validationError.includes('Exam Title') ? 'border-red-500/50 focus:border-red-500 text-white' : 'border-white/5 focus:border-blue-500/50 text-white'}`}
                placeholder="e.g. Data Structures 101" 
                value={examInfo.title}
                onChange={e => {
                    setExamInfo({...examInfo, title: e.target.value});
                    if (validationError) setValidationError('');
                }} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Code <span className="text-red-500">*</span></label>
              <input 
                 className={`w-full bg-[#030816] border rounded-xl p-4 outline-none transition-all font-medium text-sm uppercase ${!examInfo.subject_code && validationError.includes('Subject Code') ? 'border-red-500/50 focus:border-red-500 text-white' : 'border-white/5 focus:border-blue-500/50 text-white'}`}
                 placeholder="CS101" 
                 value={examInfo.subject_code}
                 onChange={e => {
                    setExamInfo({...examInfo, subject_code: e.target.value});
                    if (validationError) setValidationError('');
                 }} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Time <span className="text-red-500">*</span></label>
              <input 
                  className={`w-full bg-[#030816] border rounded-xl p-4 outline-none transition-all font-medium text-sm text-slate-300 ${!examInfo.start_time && validationError.includes('Start Time') ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-blue-500/50'}`}
                  type="datetime-local" 
                  onChange={e => {
                     setExamInfo({...examInfo, start_time: new Date(e.target.value).toISOString()});
                     if (validationError) setValidationError('');
                  }} 
              />
            </div>
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <label className="text-[10px] font-black w-fit text-slate-400 uppercase tracking-widest border-b border-dashed border-slate-600 cursor-help" title="Duration determines the auto-submission trigger for Sentinel.">
                  Duration (Min) <span className="text-red-500">*</span>
                </label>
                <input 
                   className="w-full bg-[#030816] border border-white/5 rounded-xl p-4 outline-none focus:border-blue-500/50 transition-all font-medium text-sm text-white" 
                   type="number" 
                   min="1"
                   value={examInfo.duration_minutes} 
                   onChange={e => setExamInfo({...examInfo, duration_minutes: e.target.value})} 
                />
              </div>
            </div>
          </div>
        </section>

        {/* AI Question Generator Section */}
        <section className="glass-panel p-8 rounded-[32px] shadow-2xl relative overflow-hidden border border-purple-500/10">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
          <h2 className="text-sm font-black w-fit text-purple-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-dashed border-purple-800 cursor-help" title="Agent-D leverages Claude 3 Haiku to synthetically generate varied question pools.">
            <span className="text-xl">2.</span> Sentinel AI Generator
          </h2>
          <div className="flex gap-4 items-end relative z-10">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Topic Context</label>
              <input 
                 className="w-full bg-[#030816] border text-white border-purple-500/10 rounded-xl p-4 outline-none focus:border-purple-500/50 transition-all font-medium text-sm placeholder:text-purple-300/30" 
                 placeholder="e.g. Database Indexing B-Trees" 
                 value={aiParams.topic}
                 onChange={e => setAiParams({...aiParams, topic: e.target.value})} 
              />
            </div>
            <div className="w-40 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Complexity</label>
              <select className="w-full bg-[#030816] border border-purple-500/10 rounded-xl p-4 outline-none focus:border-purple-500/50 transition-all font-medium text-sm text-slate-300" onChange={e => setAiParams({...aiParams, difficulty: e.target.value})}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="w-32 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Count</label>
              <input className="w-full bg-[#030816] text-white border border-purple-500/10 rounded-xl p-4 outline-none focus:border-purple-500/50 transition-all font-medium text-sm" type="number" min="1" max="20" value={aiParams.count} onChange={e => setAiParams({...aiParams, count: parseInt(e.target.value)})} />
            </div>
            <div>
              <button 
                  onClick={generateAiQuestions}
                  disabled={isGenerating || !aiParams.topic}
                  className="bg-purple-600/10 flex items-center justify-center gap-2 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white px-8 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest disabled:opacity-50 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] min-w-[200px]"
              >
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin"/> Synthesizing...</> : '✨ Generate AI Questions'}
              </button>
            </div>
          </div>
        </section>

        {/* Question List */}
        <section className="glass-panel p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="text-xl">3.</span> Corpus ({questions.length})
            </h2>
            <button onClick={addQuestion} className="bg-white/5 hover:bg-white/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 flex items-center gap-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all">
              <PlusCircle className="w-4 h-4" /> Add Override
            </button>
          </div>
          
          {questions.length === 0 && (
             <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-[24px]">
                <p className="text-slate-500 font-mono text-[11px] uppercase tracking-widest">Corpus empty. Add overrides manually or synthesize via Sentinel AI.</p>
             </div>
          )}

          <div className="space-y-6 relative z-10">
            {questions.map((q, idx) => (
              <div key={idx} className="bg-[#030816] p-6 rounded-[24px] border border-white/5 relative group hover:border-emerald-500/30 transition-all">
                 <div className="absolute top-6 left-6 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                    {idx + 1}
                 </div>
                 
                 {/* Delete Button */}
                 <button 
                   onClick={() => removeQuestion(idx)}
                   className="absolute top-6 right-6 text-slate-500 hover:text-red-400 transition-colors"
                   title="Remove this question"
                 >
                    <Trash2 className="w-5 h-5" />
                 </button>

                 <div className="ml-12 mr-8">
                   <textarea 
                     className="w-full bg-transparent border-b border-white/10 pb-2 mb-4 focus:border-emerald-500 outline-none p-1 text-sm font-medium resize-none overflow-hidden min-h-[40px] text-slate-200 placeholder:text-slate-600" 
                     value={q.question_text} 
                     placeholder="Matrix Question Parameter (Enter Question text here)" 
                     onChange={e => {
                       const newQs = [...questions];
                       newQs[idx].question_text = e.target.value;
                       setQuestions(newQs);
                       // auto-adjust height
                       e.target.style.height = 'inherit';
                       e.target.style.height = `${e.target.scrollHeight}px`;
                     }} 
                   />
                   
                   <div className="grid grid-cols-2 gap-4">
                     {q.options.map((optVal, optIdx) => (
                       <div key={optIdx} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${q.correct_option === optIdx ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/5 focus-within:border-white/20'}`}>
                         <button 
                           onClick={() => {
                             const newQs = [...questions];
                             newQs[idx].correct_option = optIdx;
                             setQuestions(newQs);
                           }}
                           className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black uppercase transition-colors ${q.correct_option === optIdx ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                           title={q.correct_option === optIdx ? "Correct Option" : "Set as Correct"}
                         >
                           {String.fromCharCode(65 + optIdx)}
                         </button>
                         <textarea 
                           className="bg-transparent rounded flex-1 text-xs outline-none resize-none align-top pt-1 text-slate-300 placeholder:text-slate-600" 
                           rows={2}
                           value={optVal} 
                           placeholder={`Option ${String.fromCharCode(65 + optIdx)}`} 
                           onChange={e => {
                             const newQs = [...questions];
                             newQs[idx].options[optIdx] = e.target.value;
                             setQuestions(newQs);
                           }} 
                         />
                       </div>
                     ))}
                   </div>
                 </div>
              </div>
            ))}
          </div>
        </section>

        {/* Save / Credentials Section */}
        <footer className="flex flex-col items-center gap-8 py-8 border-t border-white/5">
          <button 
            onClick={saveExam} 
            disabled={isSaving}
            className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 px-16 py-5 rounded-2xl font-black text-[13px] text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] tracking-[0.1em] uppercase transition-all duration-300 transform active:scale-[0.98] disabled:opacity-75 disabled:scale-100"
          >
             {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Initializing Protocol...</> : 'Initialize Sentinel Protocol'}
          </button>
          
          {successInfo && (
            <div className="w-full bg-emerald-950/30 border border-emerald-500/20 p-8 rounded-[24px] fade-in relative overflow-hidden">
               <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 blur-[40px] rounded-full"></div>
               <p className="text-emerald-400 text-xs mb-6 font-black tracking-[0.2em] uppercase flex items-center gap-3">
                 <span className="text-2xl">✅</span> Deployment Successful
               </p>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#020617] relative p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-black mb-2">Subject Code</p>
                    <p className="text-2xl font-mono text-emerald-300 tracking-wider font-bold">{successInfo.subject_code}</p>
                  </div>
                  <div className="bg-[#020617] relative p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-black mb-2">Exam Name</p>
                    <p className="text-2xl font-mono text-emerald-300 tracking-wider font-bold">{successInfo.exam_name}</p>
                  </div>
               </div>
               <p className="text-center text-emerald-400 text-[11px] font-bold tracking-widest mt-4">{successInfo.question_count} questions deployed successfully.</p>
               <p className="text-center text-emerald-500/50 text-[10px] uppercase font-bold tracking-widest mt-2">Now authorize students in the Students tab with this exam name.</p>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
