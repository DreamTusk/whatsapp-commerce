'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Globe, CreditCard, Truck, Sparkles, ShoppingBag, User, Heart, FileText } from '@deemlol/next-icons'
import GeneralPanel       from './panels/general'
import UsersPanel         from './panels/users'
import DomainPanel        from './panels/domain'
import ThemePanel         from './panels/theme'
import SupportSocialPanel from './panels/support-social'
import PoliciesPanel      from './panels/policies'
import PaymentsPanel      from './panels/payments'
import DeliveryPanel      from './panels/delivery'

const SETTINGS_TABS = [
  { key: 'general',        label: 'General',          icon: ShoppingBag, component: GeneralPanel       },
  { key: 'users',          label: 'Staffs',           icon: User,        component: UsersPanel         },
  { key: 'domain',         label: 'Domain',           icon: Globe,       component: DomainPanel        },
  { key: 'payments',       label: 'Payments',         icon: CreditCard,  component: PaymentsPanel      },
  { key: 'delivery',       label: 'Delivery',         icon: Truck,       component: DeliveryPanel      },
  { key: 'theme',          label: 'Theme',            icon: Sparkles,    component: ThemePanel         },
  { key: 'support-social', label: 'Support & Social', icon: Heart,       component: SupportSocialPanel },
  { key: 'policies',       label: 'Policies',         icon: FileText,    component: PoliciesPanel      },
]

type TabKey = typeof SETTINGS_TABS[number]['key']

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const tabParam = searchParams.get('tab') as TabKey | null
  const activeTab: TabKey = SETTINGS_TABS.some(t => t.key === tabParam) ? tabParam! : 'general'

  const ActivePanel = SETTINGS_TABS.find(t => t.key === activeTab)?.component ?? GeneralPanel

  function switchTab(key: TabKey) {
    router.replace(`/dashboard/settings?tab=${key}`, { scroll: false })
  }

  return (
    <div className="flex h-full bg-gray-50 p-4 gap-4 items-start">

      {/* ── Left submenu ── */}
      <aside className="w-52 flex-shrink-0 bg-white border border-gray-100 shadow-sm rounded-sm py-3">
        {SETTINGS_TABS.map(({ key, label, icon: Icon }, i) => {
          const active = activeTab === key
          const isLast = i === SETTINGS_TABS.length - 1
          return (
            <div key={key}>
              <button
                onClick={() => switchTab(key)}
                className={`w-full flex items-center gap-2.5 px-4 py-1 text-sm transition-colors text-left border-l-2 ${
                  active
                    ? 'border-[#6366f1] text-[#6366f1] font-semibold bg-white/60'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/40 font-medium'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {label}
              </button>
              {!isLast && <div className="h-px bg-indigo-100 mx-3 my-2" />}
            </div>
          )
        })}
      </aside>

      {/* ── Right content ── */}
      <div className="flex-1 overflow-auto">
        <ActivePanel />
      </div>

    </div>
  )
}
