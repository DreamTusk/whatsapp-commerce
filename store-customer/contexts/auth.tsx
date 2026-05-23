'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import OtpModal, { type Customer } from '@/components/otp-modal'

interface AuthContextValue {
  customer: Customer | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, customer: Customer) => void
  logout: () => void
  requireAuth: (action: () => void) => void
  updateCustomer: (patch: Partial<Customer>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [otpOpen, setOtpOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  useEffect(() => {
    const savedToken = localStorage.getItem('customer_token')
    const savedCustomer = localStorage.getItem('customer_data')
    if (savedToken && savedCustomer) {
      try {
        setToken(savedToken)
        setCustomer(JSON.parse(savedCustomer))
      } catch {
        localStorage.removeItem('customer_token')
        localStorage.removeItem('customer_data')
      }
    }
  }, [])

  const login = useCallback((newToken: string, newCustomer: Customer) => {
    localStorage.setItem('customer_token', newToken)
    localStorage.setItem('customer_data', JSON.stringify(newCustomer))
    setToken(newToken)
    setCustomer(newCustomer)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('customer_token')
    localStorage.removeItem('customer_data')
    setToken(null)
    setCustomer(null)
  }, [])

  const requireAuth = useCallback((action: () => void) => {
    if (token) {
      action()
    } else {
      setPendingAction(() => action)
      setOtpOpen(true)
    }
  }, [token])

  const handleOtpSuccess = useCallback((newToken: string, newCustomer: Customer) => {
    login(newToken, newCustomer)
    setOtpOpen(false)
    // Run pending action after state updates settle
    setPendingAction(prev => {
      if (prev) setTimeout(prev, 0)
      return null
    })
  }, [login])

  const updateCustomer = useCallback((patch: Partial<Customer>) => {
    setCustomer(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...patch }
      localStorage.setItem('customer_data', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ customer, token, isAuthenticated: !!token, login, logout, requireAuth, updateCustomer }}>
      {children}
      <OtpModal
        open={otpOpen}
        onClose={() => { setOtpOpen(false); setPendingAction(null) }}
        onSuccess={handleOtpSuccess}
      />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
