import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import { money } from '../format.js'

const STATUSES = ['', 'pending', 'paid', 'shipped', 'cancelled', 'refunded']

export default function Orders() {
  const { auth } = useAuth()
  const [items, setItems] = useState([])
  const [err, setErr] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    const qs = status ? `?status=${status}` : ''
    api(`/api/admin/orders${qs}`, { token: auth.token })
      .then(setItems).catch(e => setErr(e.message))
  }, [auth, status])

  return (
    <section>
      <div className="page-head">
        <h1>Orders</h1>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'all statuses'}</option>)}
        </select>
      </div>
      {err && <p className="error">{err}</p>}
      <table className="table">
        <thead><tr>
          <th>#</th><th>Email</th><th>Status</th><th>Total</th><th>Placed</th>
        </tr></thead>
        <tbody>
          {items.map(o => (
            <tr key={o.id}>
              <td><Link to={`/orders/${o.id}`}>#{o.id}</Link></td>
              <td>{o.email}</td>
              <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
              <td>{money(o.total_cents)}</td>
              <td>{new Date(o.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
