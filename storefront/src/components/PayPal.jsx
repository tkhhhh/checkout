import { useState } from 'react'
import { api } from '../api.js'
import { money } from '../format.js'

export default function PayPal({ order, token, onPaid }) {
  const [stage, setStage] = useState('idle') // idle | auth | approving
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  const start = () => {
    setErr('')
    setStage('auth')
  }

  const cancel = () => {
    setErr('')
    setEmail('')
    setPassword('')
    setStage('idle')
  }

  const approve = async (e) => {
    e.preventDefault()
    if (!email || !password) { setErr('Enter your PayPal email and password'); return }
    setErr('')
    setStage('approving')
    try {
      await api.payOrder(order.id, {
        cardholder_name: `PayPal (${email})`,
        card_number: '4242424242424242',
        exp_month: 12,
        exp_year: new Date().getFullYear() + 2,
        cvc: '123',
      }, token)
      onPaid()
    } catch (e) {
      setErr(e.message)
      setStage('auth')
    }
  }

  if (stage === 'idle') {
    return (
      <div style={{display:'flex', flexDirection:'column', gap:12, maxWidth:480}}>
        <p className="muted" style={{margin:0}}>
          You will be redirected to PayPal to authorize a payment of{' '}
          <strong>{money(order.total_cents)}</strong>.
        </p>
        <button
          type="button"
          onClick={start}
          style={{background:'#ffc439', color:'#003087'}}
        >
          Pay with PayPal
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={approve} className="form"
          style={{border:'1px solid var(--border)', borderRadius:'var(--radius)',
                  padding:16, background:'#fff'}}>
      <div style={{fontWeight:700, color:'#003087', fontSize:'1.1rem'}}>
        PayPal
      </div>
      <p className="muted" style={{margin:0, fontSize:'0.9em'}}>
        Log in to approve <strong>{money(order.total_cents)}</strong> to
        Checkout Demo Store.
      </p>
      <label>Email or mobile number
        <input type="email" required autoComplete="email"
               value={email} onChange={e => setEmail(e.target.value)}
               disabled={stage === 'approving'} />
      </label>
      <label>Password
        <input type="password" required autoComplete="current-password"
               value={password} onChange={e => setPassword(e.target.value)}
               disabled={stage === 'approving'} />
      </label>

      <p className="muted" style={{fontSize:'0.9em', margin:0}}>
        Demo mode — no real PayPal account is used or charged.
      </p>

      {err && <p className="error">{err}</p>}

      <div className="row" style={{gap:12}}>
        <button type="submit" disabled={stage === 'approving'}
                style={{background:'#0070ba', flex:1}}>
          {stage === 'approving' ? 'Authorizing…' : `Approve ${money(order.total_cents)}`}
        </button>
        <button type="button" className="link" onClick={cancel}
                disabled={stage === 'approving'}>
          Cancel
        </button>
      </div>
    </form>
  )
}
