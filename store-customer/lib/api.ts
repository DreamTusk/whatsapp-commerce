const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export async function apiFetch<T>(
  path: string,
  domain: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-store-domain': domain,
      ...(options?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)

  return res.json()
}
