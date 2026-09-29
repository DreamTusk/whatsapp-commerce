'use client'

import type { ReactNode } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'

export function AppGoogleOAuthProvider({ children }: { children: ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) return <>{children}</>
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
}
