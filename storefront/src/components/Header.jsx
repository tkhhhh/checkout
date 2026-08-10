import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../store/cart.jsx'
import { useAuth } from '../store/auth.jsx'

export default function Header() {
  const { count } = useCart()
  const { auth, logout } = useAuth()
  return (
    <header className="header">
      <div className="container header-row">
        <Link to="/" className="brand">Checkout</Link>
        <nav className="nav">
          <NavLink to="/" end>Shop</NavLink>
          {auth && <NavLink to="/orders">My orders</NavLink>}
          <NavLink to="/cart">Cart ({count})</NavLink>
          {auth ? (
            <>
              <span className="muted">{auth.user.name}</span>
              <button className="link" onClick={logout}>Log out</button>
            </>
          ) : (
            <NavLink to="/login">Log in</NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}
