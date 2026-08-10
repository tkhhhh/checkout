import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'

const empty = {
  sku: '', name: '', description: '',
  price_pounds: '0.00', stock: 0, image_url: '', active: true,
}

const centsToPounds = (c) => ((c ?? 0) / 100).toFixed(2)
const poundsToCents = (p) => Math.round(Number(p) * 100)

export default function ProductEdit() {
  const { id } = useParams()
  const { auth } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const isNew = !id

  useEffect(() => {
    if (isNew) return
    api(`/api/products/${id}`).then(p => setForm({
      sku: p.sku, name: p.name, description: p.description,
      price_pounds: centsToPounds(p.price_cents), stock: p.stock,
      image_url: p.image_url, active: p.active,
    })).catch(e => setErr(e.message))
  }, [id, isNew])

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked
            : e.target.type === 'number' ? Number(e.target.value)
            : e.target.value
    setForm(s => ({ ...s, [k]: v }))
  }

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price_cents: poundsToCents(form.price_pounds),
        stock: form.stock,
        image_url: form.image_url,
        active: form.active,
      }
      if (isNew) {
        await api('/api/admin/products', { method: 'POST', body: payload, token: auth.token })
      } else {
        await api(`/api/admin/products/${id}`, { method: 'PUT', body: payload, token: auth.token })
      }
      navigate('/products')
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h1>{isNew ? 'New product' : `Edit product #${id}`}</h1>
      <form onSubmit={submit} className="form">
        {isNew ? (
          <p className="muted">SKU will be auto-assigned on save (e.g. <code>SKU-007</code>).</p>
        ) : (
          <label>SKU<input value={form.sku} readOnly className="mono" /></label>
        )}
        <label>Name<input required value={form.name} onChange={set('name')} /></label>
        <label>Description<textarea rows="4" value={form.description} onChange={set('description')} /></label>
        <label>Price (£)<input type="number" min="0" step="0.01" required value={form.price_pounds} onChange={set('price_pounds')} /></label>
        <label>Stock<input type="number" min="0" required value={form.stock} onChange={set('stock')} /></label>
        <label>Image URL<input type="url" value={form.image_url} onChange={set('image_url')} /></label>
        <label className="row" style={{justifyContent:'flex-start', gap:8}}>
          <input type="checkbox" checked={form.active} onChange={set('active')} /> Active
        </label>
        {err && <p className="error">{err}</p>}
        <div className="row" style={{justifyContent:'flex-start', gap:12}}>
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <Link to="/products" className="link">Cancel</Link>
        </div>
      </form>
    </section>
  )
}
