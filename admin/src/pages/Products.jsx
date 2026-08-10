import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import { money } from '../format.js'

export default function Products() {
  const { auth } = useAuth()
  const [items, setItems] = useState([])
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(() => {
    api(`/api/admin/products?all=1${q ? `&q=${encodeURIComponent(q)}` : ''}`,
        { token: auth.token })
      .then(setItems).catch(e => setErr(e.message))
  }, [auth, q])

  useEffect(() => { load() }, [load])

  const archive = async (id) => {
    if (!confirm('Archive this product? It will be hidden from the storefront.')) return
    try {
      await api(`/api/admin/products/${id}`, { method: 'DELETE', token: auth.token })
      load()
    } catch (e) { alert(e.message) }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Products</h1>
        <div className="row">
          <input className="search" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
          <Link to="/products/new"><button>New product</button></Link>
        </div>
      </div>
      {err && <p className="error">{err}</p>}
      <table className="table">
        <thead><tr>
          <th>SKU</th><th>Name</th><th>Price</th><th>Stock</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          {items.map(p => (
            <tr key={p.id}>
              <td className="mono">{p.sku}</td>
              <td><Link to={`/products/${p.id}`}>{p.name}</Link></td>
              <td>{money(p.price_cents)}</td>
              <td className={p.stock === 0 ? 'error' : ''}>{p.stock}</td>
              <td>{p.active ? <span className="badge badge-ok">active</span> : <span className="badge">archived</span>}</td>
              <td>
                {p.active && <button className="link" onClick={() => archive(p.id)}>Archive</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
