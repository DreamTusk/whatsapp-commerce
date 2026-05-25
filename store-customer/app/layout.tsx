import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { AuthProvider } from '@/contexts/auth'
import { CartProvider } from '@/contexts/cart'
import BottomNav from '@/components/bottom-nav'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Store',
  description: 'Shop online',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.className}>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased pb-16 lg:pb-0">
        <AuthProvider>
          <CartProvider>
            {children}
            <BottomNav />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
