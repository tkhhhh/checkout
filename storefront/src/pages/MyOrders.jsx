import { useEffect, useState } from 'react'
import { useAuth } from '../store/auth.jsx'
import { api } from '../api.js'
import { money } from '../format.js'

export default function MyOrders() {
  const { auth } = useAuth()
  const [orders, setOrders] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!auth) return
    api.myOrders(auth.token).then(setOrders).catch(e => setErr(e.message))
  }, [auth])

  if (!auth) return <p>Please log in to see your orders.</p>

  return (
    <section>
      <h1>My orders</h1>
      {err && <p className="error">{err}</p>}
      {orders.length === 0 ? <p>No orders yet.</p> : (
        <table className="table">
          <thead><tr><th>#</th><th>Status</th><th>Total</th><th>Placed</th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.status}</td>
                <td>{money(o.total_cents)}</td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
