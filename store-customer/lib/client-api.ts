const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

function getDomain(): string {
  if (process.env.NEXT_PUBLIC_STORE_DOMAIN) return process.env.NEXT_PUBLIC_STORE_DOMAIN
  if (typeof window === 'undefined') return ''
  return window.location.hostname
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('customer_token')
}

interface ApiError {
  status: number
  error: string
}

export async function clientFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-store-domain': getDomain(),
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw { status: res.status, error: body.error ?? 'Request failed' } as ApiError
  }

  return res.json()
}
