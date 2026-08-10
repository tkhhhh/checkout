import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@example.com')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try {
      await login(email, pass)
      navigate('/')
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="login-shell">
      <form onSubmit={submit} className="form login-card">
        <h1>Admin sign in</h1>
        <label>Email
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label>Password
          <input type="password" required value={pass} onChange={e => setPass(e.target.value)} />
        </label>
        {err && <p className="error">{err}</p>}
        <button type="submit">Sign in</button>
        <p className="muted small">Default seed: admin@example.com / admin123</p>
      </form>
    </div>
  )
}
