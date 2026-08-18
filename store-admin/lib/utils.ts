import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Extracts a human-readable message from an API error or a plain Error.
// NestJS returns { message, error, statusCode } — read `message`, not `error`.
// Check response.data first: AxiosError extends Error, so `err instanceof Error`
// is true for HTTP error responses too, and err.message is just "Request failed
// with status code 409" — the backend's real message lives in response.data.
export function apiErrorMessage(err: unknown, fallback: string): string {
  const res = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data
  if (res?.message ?? res?.error) return (res.message ?? res.error)!
  if (err instanceof Error) return err.message
  return fallback
}

// store-customer always runs on a fixed port (3012) in dev; in production each
// store's domain is its own live domain served over https, no port needed.
export function getStorefrontUrl(domain: string | null | undefined): string | null {
  if (!domain) return null
  return process.env.NODE_ENV === 'production' ? `https://${domain}` : `http://${domain}:3012`
}
