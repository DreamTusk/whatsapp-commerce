import type { Metadata } from 'next'
import { Geist, Instrument_Sans } from 'next/font/google'
import { AuthProvider } from '@/contexts/auth'
import { CartProvider } from '@/contexts/cart'
import { CartDrawerProvider } from '@/contexts/cart-drawer'
import { WishlistProvider } from '@/contexts/wishlist'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })
const instrumentSans = Instrument_Sans({ subsets: ['latin'], weight: ['600'], variable: '--font-instrument-sans' })

export const metadata: Metadata = {
  title: 'Store',
  description: 'Shop online',
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
