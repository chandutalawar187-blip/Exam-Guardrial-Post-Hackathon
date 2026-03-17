// Single source of truth for API URL
// Change this one line if backend moves
export const API_BASE = import.meta.env.VITE_API_URL || ''

export const api = {
  post: async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
    return res.json()
  },
  get: async (path) => {
    const res = await fetch(`${API_BASE}${path}`)
    if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
    return res.json()
  }
}
