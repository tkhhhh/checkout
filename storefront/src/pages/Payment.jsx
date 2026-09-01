import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../store/auth.jsx'
import { money } from '../format.js'
import PayPal from '../components/PayPal.jsx'

const formatCard = (v) =>
  v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim()

// Luhn check, matches the backend so bad numbers fail before the request.
function luhnOK(pan) {
  const s = pan.replace(/\D/g, '')
  if (s.length < 13 || s.length > 19) return false
  let sum = 0, alt = false
  for (let i = s.length - 1; i >= 0; i--) {
    let d = Number(s[i])
    if (alt) { d *= 2; if (d > 9) d -= 9 }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}

export default function Payment() {
  const { id } = useParams()
  const { auth } = useAuth()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [form, setForm] = useState({
    cardholder_name: auth?.user?.name || '',
    card_number: '',
    exp_month: '',
    exp_year: '',
    cvc: '',
  })
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [method, setMethod] = useState('card')

  useEffect(() => {
    api.getOrder(id, auth.token)
      .then(setOrder)
      .catch(e => setLoadErr(e.message))
  }, [id, auth.token])

  const set = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!luhnOK(form.card_number)) { setErr('Invalid card number'); return }
    setSubmitting(true)
    try {
      await api.payOrder(id, {
        cardholder_name: form.cardholder_name,
        card_number: form.card_number.replace(/\s+/g, ''),
        exp_month: Number(form.exp_month),
        exp_year: Number(form.exp_year),
        cvc: form.cvc,
      }, auth.token)
      navigate(`/orders/${id}`)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadErr) return <p className="error">Could not load order: {loadErr}</p>
  if (!order) return <p className="muted">Loading order…</p>

  if (order.status !== 'pending') {
    return (
      <section>
        <h1>Payment</h1>
        <p>This order is already <em>{order.status}</em>.</p>
        <p><Link to={`/orders/${id}`}>View order →</Link></p>
      </section>
    )
  }

  return (
    <section className="narrow">
      <h1>Payment</h1>
      <p className="muted">
        Order <strong>#{order.id}</strong> · total <strong>{money(order.total_cents)}</strong>
      </p>

      <div className="row" style={{gap:8, marginBottom:16, justifyContent:'flex-start'}}>
        <button type="button"
                onClick={() => setMethod('card')}
                style={{
                  background: method === 'card' ? 'var(--accent)' : '#fff',
                  color: method === 'card' ? '#fff' : 'var(--fg)',
                  border: '1px solid var(--border)',
                }}>
          Card
        </button>
        <button type="button"
                onClick={() => setMethod('paypal')}
                style={{
                  background: method === 'paypal' ? 'var(--accent)' : '#fff',
                  color: method === 'paypal' ? '#fff' : 'var(--fg)',
                  border: '1px solid var(--border)',
                }}>
          PayPal
        </button>
      </div>

      {method === 'paypal' && (
        <PayPal order={order} token={auth.token}
                onPaid={() => navigate(`/orders/${id}`)} />
      )}

      {method === 'card' && (
      <form onSubmit={submit} className="form">
        <label>Cardholder name
          <input required value={form.cardholder_name} onChange={set('cardholder_name')} />
        </label>
        <label>Card number
          <input
            required inputMode="numeric" autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            value={form.card_number}
            onChange={e => setForm(s => ({ ...s, card_number: formatCard(e.target.value) }))}
          />
        </label>
        <div className="row" style={{gap:12}}>
          <label style={{flex:1}}>Exp month
            <input required inputMode="numeric" placeholder="MM" maxLength={2}
                   value={form.exp_month} onChange={set('exp_month')} />
          </label>
          <label style={{flex:1}}>Exp year
            <input required inputMode="numeric" placeholder="YYYY" maxLength={4}
                   value={form.exp_year} onChange={set('exp_year')} />
          </label>
          <label style={{flex:1}}>CVC
            <input required inputMode="numeric" placeholder="123" maxLength={4}
                   autoComplete="cc-csc"
                   value={form.cvc} onChange={set('cvc')} />
          </label>
        </div>

        <p className="muted" style={{fontSize:'0.9em'}}>
          Demo mode — no real charge is made. Try <code>4242 4242 4242 4242</code>, any
          future expiry, any 3-digit CVC.
        </p>

        {err && <p className="error">{err}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Processing…' : `Pay ${money(order.total_cents)}`}
        </button>
      </form>
      )}
    </section>
  )
}
