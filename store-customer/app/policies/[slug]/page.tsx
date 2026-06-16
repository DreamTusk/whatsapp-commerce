import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import type { Store } from '@/types'
import PolicyView from './policy-view'

type Slug = 'refund' | 'privacy' | 'terms'

const SLUG_MAP: Record<Slug, { title: string; key: keyof NonNullable<Store['customization']> }> = {
  refund:  { title: 'Refund Policy',      key: 'refund_policy'  },
  privacy: { title: 'Privacy Policy',     key: 'privacy_policy' },
  terms:   { title: 'Terms & Conditions', key: 'terms'          },
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params
  const meta = SLUG_MAP[slug as Slug]
  if (!meta) notFound()

  const headersList = await headers()
  const domain = headersList.get('x-store-domain') ?? ''

  let content: string | null = null
  let storeName = ''
  let logo: string | null = null
  let primaryColor = '#6366f1'

  try {
    const data = await apiFetch<{ store: Store }>('/api/store/info', domain)
    storeName = data.store.name
    logo = data.store.logo ?? null
    primaryColor = data.store.customization?.primary_color ?? '#6366f1'
    content = (data.store.customization?.[meta.key] as string | null | undefined) ?? null
  } catch { /* not found */ }

  const noContent = (
    <main className="min-h-screen bg-gray-50">
      <style>{`:root { --color-primary: ${primaryColor}; }`}</style>
      <PolicyHeader storeName={storeName} logo={logo} primaryColor={primaryColor} />
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-gray-400 text-sm">{meta.title} is not available yet.</p>
      </div>
    </main>
  )

  if (!content) return noContent

  return (
    <main className="min-h-screen bg-gray-50">
      <style>{`:root { --color-primary: ${primaryColor}; }`}</style>
      <PolicyHeader storeName={storeName} logo={logo} primaryColor={primaryColor} />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{meta.title}</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <PolicyView content={content} />
        </div>
      </div>
    </main>
  )
}

function PolicyHeader({ storeName, logo, primaryColor }: { storeName: string; logo: string | null; primaryColor: string }) {
  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
        {logo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logo} alt={storeName} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-bold" style={{ backgroundColor: primaryColor }}>
            {storeName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="font-semibold text-base" style={{ color: primaryColor }}>{storeName}</span>
      </div>
    </header>
  )
}
