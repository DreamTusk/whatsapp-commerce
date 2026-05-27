import { apiFetch } from '@/lib/api'
import type { Store } from '@/types'
import StoreHeaderClient from './store-header-client'

interface Props {
  domain: string
}

export default async function StoreHeader({ domain }: Props) {
  let store: Store | null = null
  try {
    const data = await apiFetch<{ store: Store }>('/api/store/info', domain)
    store = data.store
  } catch {
    return null
  }

  return <StoreHeaderClient store={store} />
}
