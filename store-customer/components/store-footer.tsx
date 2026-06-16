import Link from 'next/link'
import { Instagram, Facebook, WhatsApp, YouTube, TwitterNew } from '@deemlol/next-icons'
import type { Store, Category } from '@/types'

interface Props {
  store: Store | null
  categories: Category[]
}

const POLICIES = [
  { label: 'Refund Policy',      slug: 'refund',  key: 'refund_policy'  },
  { label: 'Privacy Policy',     slug: 'privacy', key: 'privacy_policy' },
  { label: 'Terms & Conditions', slug: 'terms',   key: 'terms'          },
] as const

const QUICK_LINKS = [
  { label: 'Profile',   href: '/account?tab=profile'    },
  { label: 'Orders',    href: '/account?tab=orders'     },
  { label: 'Addresses', href: '/account?tab=addresses'  },
  { label: 'Wishlist',  href: '/account?tab=wishlist'   },
]

function buildWhatsAppLink(number: string | null, message: string | null) {
  if (!number) return null
  const digits = number.replace(/\D/g, '')
  if (!digits) return null
  return message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`
}

export default function StoreFooter({ store, categories }: Props) {
  if (!store) return null

  const c = store.customization
  const waLink = buildWhatsAppLink(c?.whatsapp_number ?? null, c?.whatsapp_message ?? null)

  const socialLinks = [
    { url: c?.instagram_url, label: 'Instagram', Icon: Instagram  },
    { url: c?.facebook_url,  label: 'Facebook',  Icon: Facebook   },
    { url: waLink,           label: 'WhatsApp',  Icon: WhatsApp   },
    { url: c?.youtube_url,   label: 'YouTube',   Icon: YouTube    },
    { url: c?.x_url,         label: 'X',         Icon: TwitterNew },
  ]

  const visibleCategories = categories.slice(0, 6)


  return (
    <footer className="bg-gray-50 border-t border-gray-100 mt-12">
      <div className="page-x pt-10 pb-36 lg:pb-10">
        <div className="grid gap-10 lg:grid-cols-[auto_1fr]">

          {/* Left column */}
          <div className="space-y-5 lg:max-w-[220px]">
            {/* Logo + name */}
            <div className="flex items-center gap-3">
              {store.logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">{store.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <span className="font-semibold text-gray-800 text-base leading-tight">{store.name}</span>
            </div>

            {/* Social icons — only show configured ones */}
            {socialLinks.some(s => s.url) && (
              <div className="flex gap-2 flex-wrap">
                {socialLinks.filter(s => s.url).map(({ url, label, Icon }) => (
                  <a
                    key={label}
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="group w-9 h-9 rounded-full border border-gray-200 group-hover:border-[var(--color-primary)] flex items-center justify-center transition-colors"
                  >
                    <Icon className="w-[18px] h-[18px] text-gray-500 group-hover:text-[var(--color-primary)] transition-colors" />
                  </a>
                ))}
              </div>
            )}

            {/* Address + phone */}
            {(store.address || store.phone) && (
              <div className="space-y-1">
                {store.address && (
                  <p className="text-sm text-gray-400 leading-snug">{store.address}</p>
                )}
                {store.phone && (
                  <p className="text-sm text-gray-500">{store.phone}</p>
                )}
              </div>
            )}
          </div>

          {/* Right columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:justify-end">

            {/* Quick links */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Account</p>
              <ul className="space-y-3">
                {QUICK_LINKS.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-gray-600 hover-c-primary transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories */}
            {visibleCategories.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Categories</p>
                <ul className="space-y-3">
                  {visibleCategories.map(cat => (
                    <li key={cat.id}>
                      <Link
                        href={`/products?category=${cat.id}`}
                        className="text-sm text-gray-600 hover-c-primary transition-colors"
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Policies */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Policies</p>
              <ul className="space-y-3">
                {POLICIES.map(p => (
                  <li key={p.slug}>
                    <Link
                      href={`/policies/${p.slug}`}
                      target="_blank"
                      className="text-sm text-gray-600 hover-c-primary transition-colors"
                    >
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-300">© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
