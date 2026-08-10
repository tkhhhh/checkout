import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { money } from '../format.js'
import { useCart } from '../store/cart.jsx'

export default function Catalog() {
  const [products, setProducts] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const { add } = useCart()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.listProducts(q)
      .then(d => { if (!cancelled) setProducts(d) })
      .catch(e => { if (!cancelled) setErr(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [q])

  return (
    <section>
      <div className="catalog-head">
        <h1>Shop</h1>
        <input
          className="search"
          placeholder="Search products…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>
      {err && <p className="error">{err}</p>}
      {loading ? <p>Loading…</p> : (
        <div className="grid">
          {products.map(p => (
            <article key={p.id} className="card">
              <Link to={`/products/${p.id}`}>
                <img src={p.image_url} alt={p.name} loading="lazy" />
              </Link>
              <div className="card-body">
                <Link to={`/products/${p.id}`} className="card-title">{p.name}</Link>
                <div className="row">
                  <span className="price">{money(p.price_cents)}</span>
                  <button onClick={() => add(p, 1)} disabled={p.stock <= 0}>
                    {p.stock > 0 ? 'Add' : 'Sold out'}
                  </button>
                </div>
              </div>
            </article>
          ))}
          {products.length === 0 && !loading && <p>No products found.</p>}
        </div>
      )}
    </section>
  )
}
