'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Store, Eye, EyeOff, XCircle, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { auth } from '@/lib/auth'

interface InviteDetails {
  email: string
  role: string
  store_name: string
  store_logo: string | null
  expires_at: string
}

type Status = 'loading' | 'found' | 'not_found' | 'already_accepted' | 'expired' | 'error'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

function formatRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase()
}

function AcceptInviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<Status>('loading')
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Check login state client-side only (avoid hydration mismatch)
  useEffect(() => {
    setIsLoggedIn(auth.isAuthenticated())
  }, [])

  // Fetch invite details on mount
  useEffect(() => {
    if (!token) {
      setStatus('not_found')
      return
    }

    api.get(`/api/auth/invite/${token}`)
      .then(res => {
        setInvite(res.data.invite)
        setStatus('found')
      })
      .catch(err => {
        const code = err.response?.status
        if (code === 404) setStatus('not_found')
        else if (code === 409) setStatus('already_accepted')
        else if (code === 410) setStatus('expired')
        else setStatus('error')
      })
  }, [token])

  async function acceptAsNewUser(data: FormData) {
    setIsSubmitting(true)
    try {
      const res = await api.post('/api/auth/accept-invite', {
        token,
        name: data.name,
        password: data.password,
      })
      await finalise(res.data.access_token, res.data.refresh_token)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to accept invite.'
      toast.error(msg)
      setIsSubmitting(false)
    }
  }

  async function acceptAsExistingUser() {
    setIsSubmitting(true)
    try {
      const res = await api.post('/api/auth/accept-invite', { token })
      await finalise(res.data.access_token, res.data.refresh_token)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to accept invite.'
      toast.error(msg)
      setIsSubmitting(false)
    }
  }

  async function finalise(accessToken: string, refreshToken: string) {
    auth.setTokens(accessToken, refreshToken)
    // Fetch user info so the dashboard sidebar shows name/email
    const meRes = await api.get('/api/auth/me')
    auth.setUser(meRes.data.user)
    toast.success(`Welcome to ${invite?.store_name}!`)
    router.push('/dashboard')
  }

  // ── Loading ──
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 py-12">
        <Loader2 className="w-8 h-8 text-[#25D366] animate-spin" />
        <p className="text-sm text-gray-500">Loading invite…</p>
      </div>
    )
  }

  // ── Error states ──
  if (status !== 'found') {
    const config = {
      not_found:       { icon: XCircle,       color: 'text-gray-400',  title: 'Invite not found',                body: 'This invite link is invalid or does not exist.' },
      already_accepted:{ icon: CheckCircle2,  color: 'text-green-500', title: 'Already accepted',                body: 'This invite has already been accepted.' },
      expired:         { icon: Clock,         color: 'text-amber-500', title: 'Invite expired',                  body: 'This invite link has expired. Ask the store owner to send a new one.' },
      error:           { icon: XCircle,       color: 'text-red-400',   title: 'Something went wrong',            body: 'Unable to load the invite. Please try again later.' },
    }[status]

    const Icon = config.icon

    return (
      <div className="space-y-6 text-center">
        <div className="flex items-center gap-2 mb-6 lg:hidden justify-center">
          <div className="w-8 h-8 bg-[#25D366] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">DT</span>
          </div>
          <span className="font-bold text-gray-900">DT Commerce</span>
        </div>
        <div className="flex justify-center">
          <Icon className={`w-14 h-14 ${config.color}`} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{config.body}</p>
        </div>
      </div>
    )
  }

  // ── Invite header (shared between both forms) ──
  const inviteHeader = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2 lg:hidden">
        <div className="w-8 h-8 bg-[#25D366] rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">DT</span>
        </div>
        <span className="font-bold text-gray-900">DT Commerce</span>
      </div>

      <div className="flex items-center gap-3">
        {invite!.store_logo ? (
          <img src={invite!.store_logo} alt={invite!.store_name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 bg-[#25D366]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Store className="w-6 h-6 text-[#25D366]" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            You&apos;ve been invited to join
          </h2>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{invite!.store_name}</span>
            {' '}as{' '}
            <span className="font-semibold text-[#25D366]">{formatRole(invite!.role)}</span>
          </p>
        </div>
      </div>
    </div>
  )

  // ── Existing user ──
  if (isLoggedIn) {
    const user = auth.getUser()
    return (
      <div className="space-y-8">
        {inviteHeader}
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
          You&apos;ll be joining as{' '}
          <span className="font-semibold text-gray-900">{user?.email ?? invite!.email}</span>
        </div>
        <Button
          className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white"
          onClick={acceptAsExistingUser}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isSubmitting ? 'Joining…' : 'Accept invite'}
        </Button>
      </div>
    )
  }

  // ── New user ──
  return (
    <div className="space-y-8">
      {inviteHeader}

      <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
        Create your account to join. Your email will be{' '}
        <span className="font-semibold text-gray-900">{invite!.email}</span>
      </div>

      <form method="post" onSubmit={handleSubmit(acceptAsNewUser)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            placeholder="Jane Doe"
            autoComplete="name"
            {...register('name')}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
              className="pr-10"
              {...register('password')}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button
          type="submit"
          className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isSubmitting ? 'Joining…' : 'Accept invite'}
        </Button>
      </form>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#25D366] animate-spin" />
      </div>
    }>
      <AcceptInviteForm />
    </Suspense>
  )
}
