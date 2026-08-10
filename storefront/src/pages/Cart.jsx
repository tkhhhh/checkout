import { Link } from 'react-router-dom'
import { useCart } from '../store/cart.jsx'
import { useAuth } from '../store/auth.jsx'
import { money } from '../format.js'

export default function Cart() {
  const { items, setQty, remove, totalCents } = useCart()
  const { auth } = useAuth()

  if (items.length === 0) {
    return (
      <section>
        <h1>Your cart</h1>
        <p>Cart is empty. <Link to="/">Browse the shop →</Link></p>
      </section>
    )
  }

  return (
    <section>
      <h1>Your cart</h1>
      <table className="table">
        <thead>
          <tr><th>Product</th><th>Price</th><th>Qty</th><th>Line total</th><th></th></tr>
        </thead>
        <tbody>
          {items.map(({ product, quantity }) => (
            <tr key={product.id}>
              <td>
                <Link to={`/products/${product.id}`}>{product.name}</Link>
              </td>
              <td>{money(product.price_cents)}</td>
              <td>
                <input
                  type="number" min="1"
                  value={quantity}
                  onChange={e => setQty(product.id, Number(e.target.value) || 1)}
                  style={{ width: 60 }}
                />
              </td>
              <td>{money(product.price_cents * quantity)}</td>
              <td><button className="link" onClick={() => remove(product.id)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan="3" style={{textAlign:'right'}}><strong>Total</strong></td>
              <td colSpan="2"><strong>{money(totalCents)}</strong></td></tr>
        </tfoot>
      </table>
      <div className="row" style={{justifyContent:'flex-end', gap:12}}>
        {!auth && (
          <span className="muted">
            <Link to="/login?next=%2Fcheckout">Log in</Link> to check out
          </span>
        )}
        <Link to="/checkout"><button>Proceed to checkout</button></Link>
      </div>
    </section>
  )
}
