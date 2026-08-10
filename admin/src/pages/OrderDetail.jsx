import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import { money } from '../format.js'

const STATUSES = ['pending', 'paid', 'shipped', 'cancelled', 'refunded']

export default function OrderDetail() {
  const { id } = useParams()
  const { auth } = useAuth()
  const [o, setO] = useState(null)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    api(`/api/admin/orders/${id}`, { token: auth.token }).then(setO).catch(e => setErr(e.message))
  }, [id, auth])

  useEffect(() => { load() }, [load])

  const setStatus = async (status) => {
    try {
      const next = await api(`/api/admin/orders/${id}`, {
        method: 'PATCH', body: { status }, token: auth.token,
      })
      setO(next)
    } catch (e) { alert(e.message) }
  }

  if (err) return <p className="error">{err}</p>
  if (!o) return <p>Loading…</p>

  return (
    <section>
      <Link to="/orders">← Back to orders</Link>
      <h1>Order #{o.id}</h1>
      <div className="card-row">
        <div><strong>Email:</strong> {o.email}</div>
        <div><strong>Total:</strong> {money(o.total_cents)}</div>
        <div><strong>Placed:</strong> {new Date(o.created_at).toLocaleString()}</div>
        <div><strong>Status:</strong> <span className={`badge badge-${o.status}`}>{o.status}</span></div>
      </div>
      <h3>Shipping</h3>
      <pre className="addr">{o.shipping_address || '—'}</pre>

      <h3>Items</h3>
      <table className="table">
        <thead><tr><th>Product</th><th>Unit</th><th>Qty</th><th>Line</th></tr></thead>
        <tbody>
          {(o.items || []).map(i => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{money(i.price_cents)}</td>
              <td>{i.quantity}</td>
              <td>{money(i.price_cents * i.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Update status</h3>
      <div className="row" style={{justifyContent:'flex-start', gap:8, flexWrap:'wrap'}}>
        {STATUSES.map(s => (
          <button key={s} disabled={s === o.status} onClick={() => setStatus(s)}>
            {s}
          </button>
        ))}
      </div>
    </section>
  )
}
