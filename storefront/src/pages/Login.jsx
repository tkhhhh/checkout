import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../store/auth.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try {
      await login(email, pass)
      navigate(next, { replace: true })
    } catch (e) { setErr(e.message) }
  }

  return (
    <section className="narrow">
      <h1>Log in</h1>
      <form onSubmit={submit} className="form">
        <label>Email
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label>Password
          <input type="password" required value={pass} onChange={e => setPass(e.target.value)} />
        </label>
        {err && <p className="error">{err}</p>}
        <button type="submit">Log in</button>
      </form>
      <p>No account? <Link to={`/register?next=${encodeURIComponent(next)}`}>Create one</Link></p>
    </section>
  )
}
