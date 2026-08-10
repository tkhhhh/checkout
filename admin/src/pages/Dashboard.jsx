import { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import { money } from '../format.js'

export default function Dashboard() {
  const { auth } = useAuth()
  const [s, setS] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/api/admin/stats', { token: auth.token }).then(setS).catch(e => setErr(e.message))
  }, [auth])

  if (err) return <p className="error">{err}</p>
  if (!s) return <p>Loading…</p>

  return (
    <section>
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <Stat label="Active products" value={s.total_products} />
        <Stat label="Units in stock"  value={s.active_stock} />
        <Stat label="Orders"          value={s.total_orders} />
        <Stat label="Pending orders"  value={s.pending_orders} accent />
        <Stat label="Revenue"         value={money(s.revenue_cents)} />
      </div>
    </section>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className={`stat ${accent ? 'stat-accent' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}
