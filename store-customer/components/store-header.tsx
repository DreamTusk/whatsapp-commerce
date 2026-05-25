import { apiFetch } from '@/lib/api'
import { theme } from '@/lib/theme'
import HeaderActions from './header-actions'
import SearchBar from './search-bar'
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
    <header className="sticky top-0 z-30 shadow-md" style={{ backgroundColor: theme.headerBg }}>
      <div className="max-w-screen-lg mx-auto px-3 py-2.5 flex items-center gap-3">
        {/* Logo — always visible. Store name only on desktop. */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {store?.logo ? (
            <img
              src={`${API_URL}${store.logo}`}
              alt={store?.name}
              className="w-8 h-8 rounded-lg object-cover border-2 border-white/20"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border-2 border-white/20"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: theme.headerText }}>
              {store?.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-bold text-sm max-w-[140px] truncate hidden lg:block"
            style={{ color: theme.headerText }}>
            {store?.name}
          </span>
        </div>

        {/* Search bar — always visible, fills available space */}
        <div className="flex-1 min-w-0">
          <SearchBar />
        </div>

        {/* Icons — desktop only. Mobile uses bottom nav. */}
        <div className="flex-shrink-0 hidden lg:block">
          <HeaderActions />
        </div>
      </div>
    </header>
  )
}
