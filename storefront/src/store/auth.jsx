import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api.js'

const AuthCtx = createContext(null)
const KEY = 'checkout.auth'

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
  })

  useEffect(() => {
    if (auth) localStorage.setItem(KEY, JSON.stringify(auth))
    else localStorage.removeItem(KEY)
  }, [auth])

  const login = async (email, password) => {
    const r = await api.login({ email, password })
    setAuth(r)
    return r
  }
  const register = async (email, password, name) => {
    const r = await api.register({ email, password, name })
    setAuth(r)
    return r
  }
  const logout = () => setAuth(null)

  return (
    <AuthCtx.Provider value={{ auth, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
