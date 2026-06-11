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
