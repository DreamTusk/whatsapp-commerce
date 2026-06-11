'use client'

import { useState } from 'react'
import { Globe, Clock } from '@deemlol/next-icons'
import { Store, UserRound, HeartHandshake, ScrollText } from 'lucide-react'
import GeneralPanel       from './panels/general'
import UsersPanel         from './panels/users'
import DomainPanel        from './panels/domain'
import SupportSocialPanel from './panels/support-social'
import PoliciesPanel      from './panels/policies'
import StoreTimingsPanel  from './panels/store-timings'

const SETTINGS_TABS = [
  { key: 'general',        label: 'General',          icon: Store,          component: GeneralPanel       },
  { key: 'users',          label: 'Staffs',           icon: UserRound,      component: UsersPanel         },
  { key: 'domain',         label: 'Domain',           icon: Globe,          component: DomainPanel        },
  { key: 'support-social', label: 'Support & Social', icon: HeartHandshake, component: SupportSocialPanel },
  { key: 'policies',       label: 'Policies',         icon: ScrollText,     component: PoliciesPanel      },
  { key: 'store-timings',  label: 'Store timings',    icon: Clock,          component: StoreTimingsPanel  },
]

type TabKey = typeof SETTINGS_TABS[number]['key']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('general')

  const ActivePanel = SETTINGS_TABS.find(t => t.key === activeTab)?.component ?? GeneralPanel

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
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-2.5 px-4 py-1 text-sm transition-colors text-left cursor-pointer border-l-2 ${
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
