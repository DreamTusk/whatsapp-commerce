'use client'

import { useState, useRef, useEffect } from 'react'
import { clientFetch } from '@/lib/client-api'

export interface Customer {
  id: string
  name: string | null
  phone: string
  email: string | null
  address: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (token: string, customer: Customer) => void
}

export default function OtpModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const phoneRef = useRef<HTMLInputElement>(null)
  const otpRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setStep('phone')
      setPhone('')
      setOtp('')
      setError('')
      setTimeout(() => phoneRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRef.current?.focus(), 50)
  }, [step])

  async function handleSendOtp() {
    if (!phone.trim()) { setError('Enter your phone number'); return }
    setLoading(true)
    setError('')
    try {
      await clientFetch('/api/storefront/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: phone.trim() }),
      })
      setStep('otp')
    } catch (e: unknown) {
      setError((e as { error?: string })?.error ?? 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) { setError('Enter the OTP'); return }
    setLoading(true)
    setError('')
    try {
      const data = await clientFetch<{ access_token: string; customer: Customer }>(
        '/api/storefront/auth/verify-otp',
        { method: 'POST', body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }) }
      )
      onSuccess(data.access_token, data.customer)
    } catch (e: unknown) {
      setError((e as { error?: string })?.error ?? 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 'phone' ? 'Sign in to continue' : 'Enter OTP'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg"
          >
            ✕
          </button>
        </div>

        {step === 'phone' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">We'll send a one-time password to verify your number</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
              <input
                ref={phoneRef}
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                placeholder="+91 98765 43210"
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full h-11 bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              OTP sent to <span className="font-medium text-gray-700">{phone}</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">One-time password</label>
              <input
                ref={otpRef}
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                placeholder="● ● ● ● ● ●"
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="w-full h-11 bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {loading ? 'Verifying…' : 'Verify & continue'}
            </button>
            <button
              onClick={() => { setStep('phone'); setOtp(''); setError('') }}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Change phone number
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
