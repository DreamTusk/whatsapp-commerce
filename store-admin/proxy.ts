import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/create-store']
const AUTH_PREFIXES = ['/login', '/signup', '/forgot-password', '/reset-password']

// Access token lives 40 min — matches backend JWT expiry (1/36 day)
const ACCESS_TOKEN_MAX_AGE = 40 * 60

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value
  const isVerified = request.cookies.get('is_verified')?.value !== 'false'

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthPath = AUTH_PREFIXES.some((p) => pathname.startsWith(p))

  // Access token expired but refresh token present — silently refresh before deciding
  if (!accessToken && refreshToken && isProtected) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        accessToken = data.access_token
        const response = NextResponse.next()
        response.cookies.set('access_token', accessToken!, {
          maxAge: ACCESS_TOKEN_MAX_AGE,
          sameSite: 'lax',
          path: '/',
        })
        return response
      }
      // Refresh token itself is expired/revoked — clear it and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('refresh_token')
      response.cookies.delete('auth_user')
      response.cookies.delete('is_verified')
      return response
    } catch {
      // Network error — let normal flow handle it
    }
  }

  // Unverified user with a token — force to verify-email
  if (accessToken && !isVerified && !pathname.startsWith('/verify-email')) {
    return NextResponse.redirect(new URL('/verify-email', request.url))
  }

  if (isProtected && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPath && accessToken && isVerified) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
