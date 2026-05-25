const STORAGE_KEY = 'api_base_url'

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem(STORAGE_KEY, url.replace(/\/$/, ''))
}

export function clearApiBaseUrl() {
  localStorage.removeItem(STORAGE_KEY)
}
