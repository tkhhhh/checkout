import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { money } from '../format.js'
import { useCart } from '../store/cart.jsx'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [p, setP] = useState(null)
  const [qty, setQty] = useState(1)
  const [err, setErr] = useState('')
  const { add } = useCart()

  useEffect(() => {
    api.getProduct(id).then(setP).catch(e => setErr(e.message))
  }, [id])

  if (err) return <p className="error">{err}</p>
  if (!p) return <p>Loading…</p>

  return (
    <article className="detail">
      <img src={p.image_url} alt={p.name} />
      <div>
        <h1>{p.name}</h1>
        <p className="muted">SKU {p.sku}</p>
        <p className="price-lg">{money(p.price_cents)}</p>
        <p>{p.description}</p>
        <p className={p.stock > 0 ? 'muted' : 'error'}>
          {p.stock > 0 ? `${p.stock} in stock` : 'Sold out'}
        </p>
        <div className="row">
          <input
            type="number"
            min="1"
            max={p.stock || 1}
            value={qty}
            onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))}
          />
          <button
            disabled={p.stock <= 0}
            onClick={() => { add(p, qty); navigate('/cart') }}
          >Add to cart</button>
        </div>
      </div>
    </article>
  )
}
