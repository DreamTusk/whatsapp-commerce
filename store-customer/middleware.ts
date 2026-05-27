import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const domain = process.env.NEXT_PUBLIC_STORE_DOMAIN || host.split(':')[0]

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-store-domain', domain)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
