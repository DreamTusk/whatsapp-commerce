'use client'

import { useState } from 'react'
import { Store, UserRound } from 'lucide-react'
import GeneralPanel from './panels/general'
import UsersPanel from './panels/users'

/**
 * SETTINGS_TABS — add new entries here to enable more settings sections.
 * Each entry maps to a panel component rendered on the right.
 */
const SETTINGS_TABS = [
  { key: 'general', label: 'General',         icon: Store,     component: GeneralPanel },
  { key: 'users',   label: 'User Management', icon: UserRound, component: UsersPanel   },
]

type TabKey = typeof SETTINGS_TABS[number]['key']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('general')

  const ActivePanel = SETTINGS_TABS.find(t => t.key === activeTab)?.component ?? GeneralPanel

  return (
    <div className="flex h-full bg-gray-50">

      {/* ── Left submenu ── */}
      <aside className="w-52 flex-shrink-0 bg-[#f5f5ff] border border-indigo-100 mt-4 mb-4 ml-4 shadow-sm rounded-xl overflow-hidden self-start h-[50vh]">
        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest px-4 pt-3 pb-2">Settings</p>
        {SETTINGS_TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key
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
              <div className="border-b border-indigo-100 mx-3 my-2" />
            </div>
          )
        })}
      </aside>

      {/* ── Right content ── */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">
              {SETTINGS_TABS.find(t => t.key === activeTab)?.label}
            </h1>
          </div>
          <ActivePanel />
        </div>
      </div>

    </div>
  )
}
