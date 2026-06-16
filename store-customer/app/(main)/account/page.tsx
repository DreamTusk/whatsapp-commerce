import { headers } from 'next/headers'
import { apiFetch } from '@/lib/api'
import AccountClient from './account-client'
import type { Store } from '@/types'

export default async function AccountPage() {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''

  let storeName: string | undefined
  try {
    const data = await apiFetch<{ store: Store }>('/api/store/info', domain)
    storeName = data.store.name
  } catch { /* no store name */ }

  return (
    <main className="min-h-screen bg-white">
      <AccountClient storeName={storeName} />
    </main>
  )
}
