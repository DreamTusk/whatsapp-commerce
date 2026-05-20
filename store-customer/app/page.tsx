import { headers } from 'next/headers'
import { apiFetch } from '@/lib/api'
import type { Store } from '@/types'

export default async function HomePage() {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''

  let store: Store | null = null
  try {
    const data = await apiFetch<{ store: Store }>('/api/store/info', domain)
    store = data.store
  } catch {
    // backend unavailable or store not found
  }

  if (!store) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Store not found</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">{store.name}</h1>
      {store.address && (
        <p className="mt-1 text-sm text-gray-500">{store.address}</p>
      )}
    </main>
  )
}
