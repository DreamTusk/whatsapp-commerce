'use client'

import { Suspense, useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader } from '@deemlol/next-icons'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { auth } from '@/lib/auth'
import { apiErrorMessage } from '@/lib/utils'

const OTP_LENGTH = 6

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [userId] = useState(() => auth.getPendingUserId())
  const [email] = useState(() => auth.getUser()?.email ?? searchParams.get('email') ?? '')

  useEffect(() => {
    if (!userId) {
      router.push('/signup')
      return
    }
    inputRefs.current[0]?.focus()
  }, [userId, router])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...digits]
    next[index] = value.slice(-1)
    setDigits(next)
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = [...digits]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  async function handleSubmit() {
    const otp = digits.join('')
    if (otp.length < OTP_LENGTH) {
      toast.error('Enter the complete 6-digit code')
      return
    }
    setIsSubmitting(true)
    try {
      await api.post('/api/auth/verify-user', { user_id: userId, otp })
      const hasToken = auth.isAuthenticated()
      auth.setVerified(true)
      auth.clearPendingUserId()
      if (hasToken) {
        toast.success('Email verified! Welcome to DT Commerce.')
        router.push('/create-store')
      } else {
        toast.success('Email verified! Please sign in.')
        router.push('/login')
      }
    } catch (err: unknown) {
      const msg =
        apiErrorMessage(err, 'Invalid or expired code. Try again.')
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    setIsResending(true)
    try {
      await api.post('/api/auth/resend-otp', { email })
      setCountdown(60)
      toast.success('New verification code sent to your email.')
    } catch (err: unknown) {
      const msg =
        apiErrorMessage(err, 'Failed to resend. Try again.')
      toast.error(msg)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-6 lg:hidden">
          <div className="w-8 h-8 bg-[#6366f1] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">DT</span>
          </div>
          <span className="font-bold text-gray-900">DT Commerce</span>
        </div>
        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
          <MailCheck className="w-6 h-6 text-[#6366f1]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
        <p className="text-sm text-gray-500">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-gray-700">{email || 'your email'}</span>
        </p>
      </div>

      {/* OTP inputs */}
      <div className="space-y-6">
        <div className="flex gap-2 justify-between">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="w-12 h-14 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-transparent transition-all"
            />
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
          {isSubmitting ? 'Verifying…' : 'Verify email'}
        </Button>
      </div>

      <p className="text-center text-sm text-gray-500">
        Didn&apos;t receive the code?{' '}
        {countdown > 0 ? (
          <span className="text-gray-400">Resend in {countdown}s</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={isResending}
            className="text-[#6366f1] font-medium hover:underline disabled:opacity-50"
          >
            {isResending ? 'Sending…' : 'Resend code'}
          </button>
        )}
      </p>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-400">Loading…</div>}>
      <VerifyEmailForm />
    </Suspense>
  )
}
