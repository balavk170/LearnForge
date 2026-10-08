const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch {
    throw new Error('Can’t reach the LearnForge server. Make sure the backend is running, then try again.')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || 'Something went wrong. Please try again.')
  return data
}

export const api = {
  health: () => request('/api/health'),
  topics: () => request('/api/topics'),
  progress: () => request('/api/progress'),
  recommendations: () => request('/api/recommendations'),
  generate: (topic, level) => request('/api/topic/generate', { method: 'POST', body: JSON.stringify({ topic, level }) }),
  saveProgress: (session_id, dimension, score, completed = false) => request('/api/progress', { method: 'POST', body: JSON.stringify({ session_id, dimension, score, completed }) }),
  hint: (topic, hint_index, hints, session_id) => request('/api/challenge/hint', { method: 'POST', body: JSON.stringify({ topic, hint_index, hints, session_id }) }),
  evaluate: (topic, prompt, answer, session_id) => request('/api/challenge/evaluate', { method: 'POST', body: JSON.stringify({ topic, prompt, answer, session_id }) }),
  think: (topic, question, response, session_id) => request('/api/think/evaluate', { method: 'POST', body: JSON.stringify({ topic, question, response, session_id }) }),
}
