'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader, ArrowLeft } from '@deemlol/next-icons'
import { AuthBrandMark } from '@/components/auth/brand-mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await api.post('/api/auth/forgot-password', { email: data.email })
      toast.success('OTP sent! Check your email.')
      router.push(`/reset-password?email=${encodeURIComponent(data.email)}`)
    } catch (err: unknown) {
      const msg =
        apiErrorMessage(err, 'Something went wrong. Try again.')
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <AuthBrandMark />
        <h2 className="text-2xl font-bold text-gray-900">Forgot your password?</h2>
        <p className="text-sm text-gray-500">
          Enter your email and we&apos;ll send you a reset code.
        </p>
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

        <Button
          type="submit"
          className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
          {isSubmitting ? 'Sending code…' : 'Send reset code'}
        </Button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </Link>
    </div>
  )
}
