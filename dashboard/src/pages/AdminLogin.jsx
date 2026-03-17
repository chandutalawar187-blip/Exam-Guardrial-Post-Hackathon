import { useState } from 'react'
import { api } from '../config'

export default function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    try {
      const data = await api.post('/api/auth/admin-login', form)
      if (data.success) {
        localStorage.setItem('admin_token', data.token)
        onLogin()
      } else {
        setError('Invalid credentials')
      }
    } catch (e) {
      setError('Cannot reach backend — is uvicorn running on port 8000?')
    }
  }

  return (
    <div style={{maxWidth:360,margin:'120px auto',padding:32,border:'1px solid #e5e7eb',borderRadius:12}}>
      <h2 style={{marginBottom:24}}>Admin Login</h2>
      <input placeholder='Username' value={form.username}
        onChange={e => setForm({...form, username: e.target.value})}
        style={{width:'100%',padding:10,marginBottom:12,borderRadius:6,border:'1px solid #d1d5db'}} />
      <input type='password' placeholder='Password' value={form.password}
        onChange={e => setForm({...form, password: e.target.value})}
        style={{width:'100%',padding:10,marginBottom:16,borderRadius:6,border:'1px solid #d1d5db'}} />
      {error && <p style={{color:'red',marginBottom:8,fontSize:13}}>{error}</p>}
      <button onClick={handleSubmit}
        style={{width:'100%',padding:12,background:'#1E3A8A',color:'#fff',borderRadius:6,border:'none',cursor:'pointer'}}>
        Login
      </button>
    </div>
  )
}
