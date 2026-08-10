import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartCtx = createContext(null)
const KEY = 'checkout.cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  const add = (product, qty = 1) => {
    setItems(prev => {
      const i = prev.findIndex(x => x.product.id === product.id)
      if (i >= 0) {
        const copy = [...prev]
        copy[i] = { ...copy[i], quantity: copy[i].quantity + qty }
        return copy
      }
      return [...prev, { product, quantity: qty }]
    })
  }
  const setQty = (productId, qty) => {
    setItems(prev => prev.map(x =>
      x.product.id === productId ? { ...x, quantity: Math.max(1, qty) } : x))
  }
  const remove = (productId) =>
    setItems(prev => prev.filter(x => x.product.id !== productId))
  const clear = () => setItems([])

  const totals = useMemo(() => {
    const totalCents = items.reduce((s, x) => s + x.product.price_cents * x.quantity, 0)
    const count = items.reduce((s, x) => s + x.quantity, 0)
    return { totalCents, count }
  }, [items])

  return (
    <CartCtx.Provider value={{ items, add, setQty, remove, clear, ...totals }}>
      {children}
    </CartCtx.Provider>
  )
}

export const useCart = () => useContext(CartCtx)
