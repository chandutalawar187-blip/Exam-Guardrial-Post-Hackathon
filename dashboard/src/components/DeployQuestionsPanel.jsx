import { useState } from 'react'
import { api } from '../config'

function Label({ children }) {
  return <label className="block text-[10px] font-display font-bold uppercase tracking-[0.08em] text-[#6EA2B3] mb-1.5">{children}</label>;
}

function Input(props) {
  return <input {...props} className="w-full bg-white border border-[#7BBDE8] rounded-lg px-4 py-2.5 font-body text-[14px] font-body font-normal outline-none focus:border-[#0A4174] focus:ring-2 focus:ring-[#0A4174]/10 transition-all placeholder:text-[#6EA2B3]" />;
}

export default function DeployQuestionsPanel() {
  const [form, setForm] = useState({ exam_name: '', subject_code: '', question_text: '', correct_answer: 'A' })
  const [options, setOptions] = useState({ A: '', B: '', C: '', D: '' })
  const [questions, setQuestions] = useState([])
  const [err, setErr] = useState('')

  const deployQuestion = async () => {
    try {
      if (!form.exam_name || !form.question_text) throw new Error('Exam Name and Question Text required');
      const payload = { ...form, options }
      const data = await api.post('/api/questions', payload)
      setQuestions(prev => [...prev, data])
      setForm({ ...form, question_text: '', correct_answer: 'A' })
      setOptions({ A: '', B: '', C: '', D: '' })
      setErr('')
    } catch (e) { setErr(e.message) }
  }

  const fetchQuestions = async () => {
    if (!form.exam_name) return
    try {
      const data = await api.get(`/api/questions?exam_name=${encodeURIComponent(form.exam_name)}`)
      setQuestions(data)
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="p-8">
      <h3 className="text-xl font-display font-bold text-[#001D39] mb-6">Build Exam Question Bank</h3>
      
      <div className="flex gap-4 items-end mb-8 bg-[#eff6ff] p-4 rounded-xl border border-[#7BBDE8]">
        <div className="flex-1">
          <Label>Target Examination Name</Label>
          <Input placeholder="e.g. Data Structures Advanced" value={form.exam_name} 
            onChange={e => setForm({...form, exam_name: e.target.value})} />
        </div>
        <div className="w-40">
          <Label>Subject Code</Label>
          <Input placeholder="e.g. CS301" value={form.subject_code} 
            onChange={e => setForm({...form, subject_code: e.target.value.toUpperCase()})} />
        </div>
        <button onClick={fetchQuestions}
          className="bg-[#001D39] text-white px-6 py-2.5 rounded-lg font-display font-bold font-body text-[14px] shadow-sm hover:opacity-90 transition-all">
          Sync Questions
        </button>
      </div>

      <div className="mb-0">
        <Label>Question Statement</Label>
        <textarea placeholder="Enter the MCQ question text..." value={form.question_text}
          onChange={e => setForm({...form, question_text: e.target.value})}
          className="w-full bg-white border border-[#7BBDE8] rounded-xl px-4 py-3 font-body text-[14px] min-h-[100px] mb-4 outline-none focus:border-[#0A4174] focus:ring-2 focus:ring-[#0A4174]/10 transition-all" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {['A','B','C','D'].map(opt => (
          <div key={opt}>
            <Label>Option {opt}</Label>
            <Input placeholder={`Distractor ${opt}`} value={options[opt]}
              onChange={e => setOptions({...options, [opt]: e.target.value})} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-[#7BBDE8] mb-12">
        <div className="flex gap-2">
          {['A','B','C','D'].map(o => (
            <button key={o} onClick={() => setForm({...form, correct_answer: o})}
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-[12px] border transition-all ${form.correct_answer === o ? 'bg-[#4E8EA2] border-[#4E8EA2] text-white shadow-md' : 'bg-white border-[#7BBDE8] text-[#49769F]'}`}>
              {o}
            </button>
          ))}
        </div>
        <button onClick={deployQuestion}
          className="bg-[#0A4174] text-white px-10 py-3 rounded-lg font-display font-bold font-body text-[14px] shadow-lg shadow-[#0A4174]/20 hover:bg-[#001D39] transition-all transform active:scale-95 text-nowrap">
          + Deploy Question
        </button>
      </div>

      {err && <p className="text-red-500 text-xs mb-6 font-body font-bold text-center">⚠️ {err}</p>}
      
      <div className="space-y-4">
        <Label>Published Questions ({questions.length})</Label>
        {questions.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-[#7BBDE8] rounded-xl text-[#6EA2B3] font-body text-[14px]">
            No questions deployed for this exam yet.
          </div>
        ) : (
          questions.map((q, i) => (
            <div key={q.id} className="bg-white p-5 rounded-xl border border-[#7BBDE8] shadow-sm animate-in zoom-in-95 duration-200">
              <div className="flex gap-4">
                <span className="w-8 h-8 rounded-lg bg-[#BDD8E9] flex items-center justify-center font-black font-body text-[12px] text-[#0A4174] shrink-0">Q{i+1}</span>
                <div className="flex-1">
                  <p className="font-display font-bold text-[#001D39] font-body text-[15px] mb-2">{q.question_text}</p>
                  <div className="flex gap-4">
                    <span className="text-[11px] font-black text-[#4E8EA2] uppercase tracking-widest bg-[#F0FDFA] px-2 py-0.5 rounded border border-[#4E8EA2]/20">Correct: {q.correct_answer}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
