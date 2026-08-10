const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  listProducts: (q) => request(`/api/products${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getProduct: (id) => request(`/api/products/${id}`),
  register: (body) => request('/api/auth/register', { method: 'POST', body }),
  login: (body) => request('/api/auth/login', { method: 'POST', body }),
  me: (token) => request('/api/me', { token }),
  checkout: (body, token) => request('/api/checkout', { method: 'POST', body, token }),
  payOrder: (id, body, token) => request(`/api/orders/${id}/pay`, { method: 'POST', body, token }),
  getOrder: (id, token) => request(`/api/orders/${id}`, { token }),
  myOrders: (token) => request('/api/orders/mine', { token }),
}
