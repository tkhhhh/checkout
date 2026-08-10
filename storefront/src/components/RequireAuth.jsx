import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth.jsx'

export default function RequireAuth({ children }) {
  const { auth } = useAuth()
  const location = useLocation()
  if (!auth) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return children
}
