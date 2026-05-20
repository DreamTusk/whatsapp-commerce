'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { auth } from '@/lib/auth'

// Pages inside (auth) that authenticated users are allowed to visit
const ALLOW_AUTHENTICATED = ['/accept-invite']

export function AuthGuard() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (ALLOW_AUTHENTICATED.some(p => pathname.startsWith(p))) return
    if (auth.isAuthenticated()) {
      router.replace('/dashboard')
    }
  }, [router, pathname])

  return null
}
