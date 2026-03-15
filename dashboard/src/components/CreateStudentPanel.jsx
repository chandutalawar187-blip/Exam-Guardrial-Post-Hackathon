import { useState, useEffect } from 'react'
import { api } from '../config'

function Label({ children }) {
  return <label className="block text-[10px] font-display font-bold uppercase tracking-[0.08em] text-[#6EA2B3] mb-1.5">{children}</label>;
}

function Input(props) {
  return <input {...props} className="w-full bg-white border border-[#7BBDE8] rounded-lg px-4 py-2.5 font-body text-[14px] font-body font-normal outline-none focus:border-[#0A4174] focus:ring-2 focus:ring-[#0A4174]/10 transition-all placeholder:text-[#6EA2B3]" />;
}

export default function CreateStudentPanel() {
  const [form, setForm] = useState({ user_id: '', name: '', password: '', exam_name: '', subject_code: '' })
  const [students, setStudents] = useState([])
  const [exams, setExams] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState('')

  useEffect(() => {
    loadData();
  }, [])

  const loadData = async () => {
    setLoading(true);
    setFetchErr('');
    try {
      const [studentsData, examsData] = await Promise.all([
        api.get('/api/students').catch(() => null),
        api.get('/api/exams/list').catch(() => null)
      ]);
      if (studentsData) setStudents(Array.isArray(studentsData) ? studentsData : []);
      if (examsData) setExams(Array.isArray(examsData) ? examsData : []);
      if (!studentsData && !examsData) setFetchErr('Could not connect to server. Make sure the backend is running.');
    } catch (e) {
      setFetchErr('Failed to load data: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const createStudent = async () => {
    try {
      if (!form.user_id || !form.password || !form.name) throw new Error('UID, Name and Password are required');
      if (!form.exam_name) throw new Error('Please select an exam before authorizing the student');
      const res = await fetch(`/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Failed to create student (${res.status})`);
      setForm({ user_id: '', name: '', password: '', exam_name: form.exam_name, subject_code: form.subject_code })
      setErr('')
      await loadData();
    } catch (e) { setErr(e.message) }
  }

  const copyCredentials = (s) => {
    navigator.clipboard.writeText(
      `ExamGuardrail Login\nUser ID: ${s.user_id}\nPassword: ${s.password}\nExam: ${s.exam_name}\nSubject Code: ${s.subject_code || 'N/A'}`
    )
    alert('Credentials copied to clipboard');
  }

  return (
    <div className="p-8">
      <h3 className="text-xl font-display font-bold text-[#001D39] mb-6">Student Onboarding</h3>
      <p className="text-[#49769F] text-[13px] mb-8 italic">Manual enrollment for the upcoming examination session.</p>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <Label>Student UID (Login ID)</Label>
          <Input placeholder="e.g. STU123" value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} />
        </div>
        <div>
          <Label>Full Name</Label>
          <Input placeholder="John Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        </div>
        <div>
          <Label>Login Password</Label>
          <Input type="text" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
        </div>
        <div>
          <Label>Assigned Exam</Label>
          {exams.length > 0 ? (
            <select
              value={form.exam_name}
              onChange={e => {
                const selected = exams.find(ex => ex.exam_name === e.target.value);
                setForm({...form, exam_name: e.target.value, subject_code: selected?.subject_code || ''});
              }}
              className="w-full bg-white border border-[#7BBDE8] rounded-lg px-4 py-2.5 font-body text-[14px] outline-none focus:border-[#0A4174] focus:ring-2 focus:ring-[#0A4174]/10 transition-all text-[#001D39]"
            >
              <option value="">Select an exam...</option>
              {exams.filter(ex => !ex.end_time || new Date(ex.end_time).getTime() > Date.now()).map(ex => (
                <option key={ex.exam_name} value={ex.exam_name}>
                  {ex.exam_name} {ex.subject_code ? `(${ex.subject_code})` : ''} — {ex.question_count}Q
                </option>
              ))}
            </select>
          ) : (
            <Input placeholder="Data Structures Advanced" value={form.exam_name} onChange={e => setForm({...form, exam_name: e.target.value})} />
          )}
        </div>
      </div>

      {err && <p className="text-red-500 text-xs mb-4 font-body font-bold">⚠️ {err}</p>}
      
      <button onClick={createStudent}
        className="bg-[#0A4174] text-white px-8 py-3 rounded-lg font-display font-bold font-body text-[14px] shadow-md hover:bg-[#001D39] transition-all transform active:scale-95 mb-10">
        Authorize Student
      </button>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Authorized Candidates ({students.length})</Label>
          <button onClick={loadData}
            className="text-[#0A4174] text-[11px] font-bold uppercase tracking-wider hover:underline">
            ↻ Refresh
          </button>
        </div>
        {fetchErr && (
          <div className="text-red-500 text-xs mb-2 font-body font-bold bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            ⚠️ {fetchErr}
          </div>
        )}
        {loading ? (
          <div className="text-center py-10 border-2 border-dashed border-[#7BBDE8] rounded-xl text-[#6EA2B3] font-body text-[12px]">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-[#7BBDE8] rounded-xl text-[#6EA2B3] font-body text-[12px]">
            No students authorized yet. Use the form above to grant access.
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
            {students.map(s => (
              <div key={s.id} className="bg-[#eff6ff] border border-[#7BBDE8] p-4 rounded-xl flex justify-between items-center transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-sm shadow-sm ring-1 ring-[#7BBDE8]">👤</div>
                  <div>
                    <p className="font-display font-bold text-[#001D39] font-body text-[14px]">{s.name}</p>
                    <p className="text-[10px] text-[#49769F] font-black uppercase tracking-widest">{s.user_id} • {s.exam_name}{s.subject_code ? ` • ${s.subject_code}` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyCredentials(s)}
                    className="bg-white border border-[#4E8EA2] text-[#4E8EA2] px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-[#4E8EA2] hover:text-white transition-all shadow-sm">
                    Access Code
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
