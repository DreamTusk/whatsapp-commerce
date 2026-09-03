import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Geist, Instrument_Sans } from 'next/font/google'
import { AuthProvider } from '@/contexts/auth'
import { CartProvider } from '@/contexts/cart'
import { CartDrawerProvider } from '@/contexts/cart-drawer'
import { WishlistProvider } from '@/contexts/wishlist'
import { apiFetch } from '@/lib/api'
import type { Store } from '@/types'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })
const instrumentSans = Instrument_Sans({ subsets: ['latin'], weight: ['600'], variable: '--font-instrument-sans' })

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''
  let favicon = '/favicon.ico'
  try {
    const data = await apiFetch<{ store: Store }>('/api/store/info', domain)
    favicon = data.store.favicon || '/favicon.ico'
  } catch { /* fall back to default favicon */ }

  return {
    title: 'Store',
    description: 'Shop online',
    icons: { icon: favicon },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.className} ${instrumentSans.variable}`}>
      <head>
        <style>{`:root { --color-primary: #6366f1; --color-header: #F4F4FE; --color-header-text: #111827; --store-header-h: 154px; }`}</style>
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <CartDrawerProvider>
                {children}
              </CartDrawerProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
