import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../store/auth.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState('')

  const set = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try {
      await register(form.email, form.password, form.name)
      navigate(next, { replace: true })
    } catch (e) { setErr(e.message) }
  }

  return (
    <section className="narrow">
      <h1>Create account</h1>
      <form onSubmit={submit} className="form">
        <label>Name<input required value={form.name} onChange={set('name')} /></label>
        <label>Email<input type="email" required value={form.email} onChange={set('email')} /></label>
        <label>Password<input type="password" required minLength={6} value={form.password} onChange={set('password')} /></label>
        {err && <p className="error">{err}</p>}
        <button type="submit">Sign up</button>
      </form>
      <p>Have an account? <Link to={`/login?next=${encodeURIComponent(next)}`}>Log in</Link></p>
    </section>
  )
}
