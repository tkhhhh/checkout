import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import Catalog from './pages/Catalog.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import Payment from './pages/Payment.jsx'
import OrderConfirmation from './pages/OrderConfirmation.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import MyOrders from './pages/MyOrders.jsx'

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/payment/:id" element={<RequireAuth><Payment /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderConfirmation /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><MyOrders /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
      <footer className="footer container">
        <span className="muted">© Checkout demo store</span>
      </footer>
    </>
  )
}
