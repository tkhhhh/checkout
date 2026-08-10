import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../store/auth.jsx'
import { money } from '../format.js'

export default function OrderConfirmation() {
  const { id } = useParams()
  const { auth } = useAuth()
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!auth) return
    api.getOrder(id, auth.token).then(setOrder).catch(e => setErr(e.message))
  }, [auth, id])

  const paid = order?.status === 'paid'

  return (
    <section>
      <h1>{paid ? 'Payment received' : 'Order placed'}</h1>
      <p>Your order <strong>#{id}</strong> has been {paid ? 'paid' : 'placed'}.</p>
      {order && (
        <>
          <p>
            Total: <strong>{money(order.total_cents)}</strong> — status: <em>{order.status}</em>
          </p>
          {order.payment_ref && (
            <p className="muted">Payment reference: <code>{order.payment_ref}</code></p>
          )}
          {order.status === 'pending' && (
            <p>
              <Link to={`/payment/${id}`}><button>Pay now</button></Link>
            </p>
          )}
        </>
      )}
      {err && <p className="error">{err}</p>}
      <p><Link to="/">Continue shopping →</Link></p>
    </section>
  )
}
