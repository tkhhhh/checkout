import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Products from './pages/Products.jsx'
import ProductEdit from './pages/ProductEdit.jsx'
import Orders from './pages/Orders.jsx'
import OrderDetail from './pages/OrderDetail.jsx'

function Layout({ children }) {
  const { auth, logout } = useAuth()
  const navigate = useNavigate()
  const onLogout = () => { logout(); navigate('/login') }
  return (
    <div className="layout">
      <aside className="sidebar">
        <h2 className="brand">Admin</h2>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/orders">Orders</NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="muted">{auth?.user?.email}</div>
          <button className="link" onClick={onLogout}>Log out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}

function Protected({ children }) {
  const { auth } = useAuth()
  if (!auth) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/products" element={<Protected><Products /></Protected>} />
      <Route path="/products/new" element={<Protected><ProductEdit /></Protected>} />
      <Route path="/products/:id" element={<Protected><ProductEdit /></Protected>} />
      <Route path="/orders" element={<Protected><Orders /></Protected>} />
      <Route path="/orders/:id" element={<Protected><OrderDetail /></Protected>} />
    </Routes>
  )
}
