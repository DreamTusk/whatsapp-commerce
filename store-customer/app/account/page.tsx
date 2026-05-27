import { headers } from 'next/headers'
import StoreHeader from '@/components/store-header'
import AccountClient from './account-client'

export default async function AccountPage() {
  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''

  return (
    <main className="min-h-screen bg-white">
      <div className="hidden lg:block">
        <StoreHeader domain={domain} />
      </div>
      <AccountClient />
    </main>
  )
}
