import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Platform-issued domains only — anything NOT ending in one of these is a
// store's own connected custom domain. Deliberately NOT reusing
// NEXT_PUBLIC_STORE_DOMAIN here: that variable means something different in
// this app (a local-dev override that replaces the resolved domain entirely,
// see .env.local) than it does in store-admin (the platform's base domain).
const PLATFORM_SUFFIXES = ['.dreambiz.app', '.localhost']

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const domain = process.env.NEXT_PUBLIC_STORE_DOMAIN || host.split(':')[0]
  const domainType = PLATFORM_SUFFIXES.some(suffix => domain.endsWith(suffix)) ? 'platform' : 'custom'

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-store-domain', domain)
  requestHeaders.set('x-domain-type', domainType)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
