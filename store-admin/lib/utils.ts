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

// The storefront link always points at the live dreambiz.app domain, even
// when store-admin itself is running locally — some stores still have a
// leftover "<slug>.localhost" domain saved from before prod deploys existed,
// so normalize those to "<slug>.dreambiz.app" for display rather than
// requiring a DB backfill.
export function getStorefrontUrl(domain: string | null | undefined): string | null {
  if (!domain) return null
  const prodDomain = domain.endsWith('.localhost') ? domain.replace(/\.localhost$/, '.dreambiz.app') : domain
  return `https://${prodDomain}`
}
