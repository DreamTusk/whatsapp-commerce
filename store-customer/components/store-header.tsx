import { apiFetch } from '@/lib/api'
import HeaderActions from './header-actions'
import type { Store } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

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

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
        {store?.logo ? (
          <img src={`${API_URL}${store.logo}`} alt={store.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[#25D366] font-bold text-sm">
              {store?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{store?.name}</p>
          {store?.address && <p className="text-xs text-gray-400 truncate">{store.address}</p>}
        </div>
        <HeaderActions />
      </div>
    </header>
  )
}
