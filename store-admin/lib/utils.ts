import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Extracts a human-readable message from an API error or a plain Error.
// NestJS returns { message, error, statusCode } — read `message`, not `error`.
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  const res = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data
  return res?.message ?? res?.error ?? fallback
}
