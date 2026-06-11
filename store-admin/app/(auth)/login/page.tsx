'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader, ShieldOff } from '@deemlol/next-icons'
import { MailWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { auth } from '@/lib/auth'
import { apiErrorMessage } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

interface UnverifiedState {
  userId: string
  email: string
}

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [unverified, setUnverified] = useState<UnverifiedState | null>(null)
  const [deactivated, setDeactivated] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post('/api/auth/login', {
        email: data.email,
        password: data.password,
      })

      auth.setTokens(res.data.access_token, res.data.refresh_token)
      auth.setUser(res.data.user)
      auth.setVerified(true)
      if (res.data.role) auth.setRole(res.data.role)

      if (res.data.store) {
        router.push('/dashboard')
      } else {
        router.push('/create-store')
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string; error?: string; is_verified?: boolean; user_id?: string; email?: string } } }
      const status  = axiosErr?.response?.status
      const errData = axiosErr?.response?.data

      if (errData?.is_verified === false && errData?.user_id && errData?.email) {
        setUnverified({ userId: errData.user_id, email: errData.email })
        return
      }

      if (status === 403 && errData?.message?.includes('deactivated')) {
        setDeactivated(true)
        return
      }

      toast.error(errData?.message ?? errData?.error ?? 'Login failed. Please try again.')
    }
  }

  async function handleSendOtp() {
    if (!unverified) return
    setIsSending(true)
    try {
      await api.post('/api/auth/resend-otp', { email: unverified.email })
      auth.setPendingUserId(unverified.userId)
      toast.success('Verification code sent! Check your email.')
      router.push(`/verify-email?email=${encodeURIComponent(unverified.email)}`)
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Failed to send code. Try again.')
      toast.error(msg)
    } finally {
      setIsSending(false)
    }
  }

  if (deactivated) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 bg-[#6366f1] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">DT</span>
            </div>
            <span className="font-bold text-gray-900">DT Commerce</span>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
            <ShieldOff className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Account deactivated</h2>
          <p className="text-sm text-gray-500 mt-2">
            Your account has been deactivated. Please contact your store admin to regain access.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setDeactivated(false)}
        >
          Back to sign in
        </Button>
      </div>
    )
  }

  if (unverified) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 bg-[#6366f1] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">DT</span>
            </div>
            <span className="font-bold text-gray-900">DT Commerce</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
            <MailWarning className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Verify your account</h2>
          <p className="text-sm text-gray-500">
            Your email{' '}
            <span className="font-medium text-gray-700">{unverified.email}</span>{' '}
            is not verified yet. Send a verification code to continue.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleSendOtp}
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white"
            disabled={isSending}
          >
            {isSending ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
            {isSending ? 'Sending code…' : 'Send verification code'}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setUnverified(null)}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    )
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
        <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
        <p className="text-sm text-gray-500">Sign in to your store dashboard</p>
      </div>

      {/* Form */}
      <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#6366f1] hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-10"
              {...register('password')}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[#6366f1] font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
