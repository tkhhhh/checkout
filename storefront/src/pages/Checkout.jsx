import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'
import { useCart } from '../store/cart.jsx'
import { useAuth } from '../store/auth.jsx'
import { money } from '../format.js'

export default function Checkout() {
  const { items, totalCents, clear } = useCart()
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  if (items.length === 0) {
    return <p>Cart is empty. <Link to="/">Continue shopping →</Link></p>
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setSubmitting(true)
    try {
      const order = await api.checkout({
        shipping_address: address,
        items: items.map(x => ({ product_id: x.product.id, quantity: x.quantity })),
      }, auth.token)
      clear()
      navigate(`/payment/${order.id}`)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h1>Checkout</h1>
      <p className="muted">
        Ordering as <strong>{auth.user.email}</strong>
      </p>
      <form onSubmit={submit} className="form">
        <label>
          Shipping address
          <textarea required rows="4" value={address}
                    onChange={e => setAddress(e.target.value)} />
        </label>

        <h3>Order summary</h3>
        <ul className="summary">
          {items.map(({product, quantity}) => (
            <li key={product.id}>
              <span>{product.name} × {quantity}</span>
              <span>{money(product.price_cents * quantity)}</span>
            </li>
          ))}
          <li className="summary-total">
            <strong>Total</strong><strong>{money(totalCents)}</strong>
          </li>
        </ul>

        {err && <p className="error">{err}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Reserving stock…' : 'Continue to payment'}
        </button>
      </form>
    </section>
  )
}
