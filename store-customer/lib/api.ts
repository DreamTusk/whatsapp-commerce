const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010'

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
      'ngrok-skip-browser-warning': 'true',
      ...(options?.headers ?? {}),
    },
    next: { revalidate: 30 },
  })

  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)

  return res.json()
}
