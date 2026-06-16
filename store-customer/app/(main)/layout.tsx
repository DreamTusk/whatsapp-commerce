import { headers } from 'next/headers'
import type { Metadata } from 'next'
import NextTopLoader from 'nextjs-toploader'
import BottomNav from '@/components/bottom-nav'
import CartDrawer from '@/components/cart-drawer'
import StoreHeader from '@/components/store-header'
import StoreFooter from '@/components/store-footer'
import { apiFetch } from '@/lib/api'
import type { Store, Category } from '@/types'

function headerTextColor(hex: string): string {
  const c = hex.replace('#', '').padEnd(6, '0')
  const r = parseInt(c.slice(0, 2), 16) || 0
  const g = parseInt(c.slice(2, 4), 16) || 0
  const b = parseInt(c.slice(4, 6), 16) || 0
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#111827' : '#ffffff'
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''
  try {
    const data = await apiFetch<{ store: Store }>('/api/store/info', domain)
    return {
      title: data.store.name,
      description: `Shop online at ${data.store.name}`,
    }
  } catch {
    return { title: 'Store', description: 'Shop online' }
  }
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''

  let storeActive = true
  let primaryColor = '#6366f1'
  let headerColor = '#F4F4FE'
  let headerText = '#111827'
  let storeData: Store | null = null
  let categories: Category[] = []

  try {
    const data = await apiFetch<{ store: Store }>('/api/store/info', domain)
    storeActive = data.store.is_active
    storeData = data.store
    primaryColor = data.store.customization?.primary_color ?? '#6366f1'
    headerColor = data.store.customization?.header_color ?? '#F4F4FE'
    headerText = headerTextColor(headerColor)

    if (storeActive) {
      try {
        const catData = await apiFetch<{ categories: Category[] }>('/api/storefront/categories', domain)
        categories = catData.categories
      } catch { /* ignore */ }
    }
  } catch {
    storeActive = false
  }

  if (!storeActive) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center px-6">
          <p className="text-5xl mb-4">🔒</p>
          <p className="font-semibold text-gray-700 text-lg">Store is temporarily unavailable</p>
          <p className="text-sm text-gray-400 mt-1">Please check back later</p>
        </div>
      </main>
    )
  }

  return (
    <>
      <style>{`:root { --color-primary: ${primaryColor}; --color-header: ${headerColor}; --color-header-text: ${headerText}; }`}</style>
      <NextTopLoader color={primaryColor} height={3} showSpinner={false} />
      <StoreHeader domain={domain} />
      <div className="pb-16 lg:pb-0">{children}</div>
      <StoreFooter store={storeData} categories={categories} />
      <BottomNav />
      <CartDrawer />
    </>
  )
}
