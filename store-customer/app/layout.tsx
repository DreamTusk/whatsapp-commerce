import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Geist, Instrument_Sans } from 'next/font/google'
import { AuthProvider } from '@/contexts/auth'
import { CartProvider } from '@/contexts/cart'
import { CartDrawerProvider } from '@/contexts/cart-drawer'
import { WishlistProvider } from '@/contexts/wishlist'
import NextTopLoader from 'nextjs-toploader'
import BottomNav from '@/components/bottom-nav'
import CartDrawer from '@/components/cart-drawer'
import StoreHeader from '@/components/store-header'
import { apiFetch } from '@/lib/api'
import type { Store } from '@/types'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })
const instrumentSans = Instrument_Sans({ subsets: ['latin'], weight: ['600'], variable: '--font-instrument-sans' })

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
    return {
      title: 'Store',
      description: 'Shop online',
    }
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''

  let storeActive = true
  try {
    const data = await apiFetch<{ store: Store }>('/api/store/info', domain)
    storeActive = data.store.is_active
  } catch {
    storeActive = false
  }

  if (!storeActive) {
    return (
      <html lang="en" className={`${geist.className} ${instrumentSans.variable}`}>
        <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
          <main className="flex min-h-screen items-center justify-center">
            <div className="text-center px-6">
              <p className="text-5xl mb-4">🔒</p>
              <p className="font-semibold text-gray-700 text-lg">Store is temporarily unavailable</p>
              <p className="text-sm text-gray-400 mt-1">Please check back later</p>
            </div>
          </main>
        </body>
      </html>
    )
  }

  return (
    <html lang="en" className={`${geist.className} ${instrumentSans.variable}`}>
      <body className="min-h-screen bg-white text-gray-900 antialiased pb-16 lg:pb-0">
        <NextTopLoader color="#6366f1" height={3} showSpinner={false} />
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <CartDrawerProvider>
                <StoreHeader domain={domain} />
                {children}
                <BottomNav />
                <CartDrawer />
              </CartDrawerProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
