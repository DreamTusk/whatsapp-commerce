import { headers } from 'next/headers'
import StoreHeader from '@/components/store-header'
import CheckoutClient from './checkout-client'

export default async function CheckoutPage() {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <StoreHeader domain={domain} />
      <CheckoutClient />
    </main>
  )
}
