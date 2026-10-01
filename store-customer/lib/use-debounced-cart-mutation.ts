'use client'

import { useCallback, useRef } from 'react'
import { clientFetch } from './client-api'

const DEBOUNCE_MS = 400

// Coalesces rapid taps on the same product into a single network call, fired
// after the user pauses — the UI updates optimistically via `setQty` instead
// of waiting on each round trip.
export function useDebouncedCartMutation(delayMs = DEBOUNCE_MS) {
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  return useCallback((productId: string, quantity: number, onError?: (err: unknown) => void) => {
    if (timers.current[productId]) clearTimeout(timers.current[productId])
    timers.current[productId] = setTimeout(() => {
      delete timers.current[productId]
      const request = quantity <= 0
        ? clientFetch(`/api/storefront/cart/${productId}`, { method: 'DELETE' })
        : clientFetch(`/api/storefront/cart/${productId}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity }),
          })
      request.catch(err => onError?.(err))
    }, delayMs)
  }, [delayMs])
}
