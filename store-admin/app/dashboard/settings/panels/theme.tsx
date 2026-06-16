'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from '@deemlol/next-icons'
import { toast } from 'sonner'
import api from '@/lib/api'

interface Customization {
  primary_color: string
  header_color: string
}

const PRESETS = [
  { label: 'Indigo',   primary: '#6366f1', header: '#1e1e2e' },
  { label: 'Emerald',  primary: '#10b981', header: '#064e3b' },
  { label: 'Rose',     primary: '#f43f5e', header: '#1c0a0e' },
  { label: 'Amber',    primary: '#f59e0b', header: '#1c1400' },
  { label: 'Sky',      primary: '#0ea5e9', header: '#0c1a26' },
  { label: 'Violet',   primary: '#8b5cf6', header: '#1a0d2e' },
]

export default function ThemePanel() {
  const [form, setForm] = useState<Customization>({ primary_color: '#6366f1', header_color: '#1e1e2e' })
  const [savedForm, setSavedForm] = useState<Customization>({ primary_color: '#6366f1', header_color: '#1e1e2e' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/store/customization')
      .then(res => {
        const c = { primary_color: res.data.customization.primary_color, header_color: res.data.customization.header_color }
        setForm(c)
        setSavedForm(c)
      })
      .catch(() => toast.error('Failed to load theme'))
      .finally(() => setLoading(false))
  }, [])

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm)

  async function save() {
    if (!isDirty) return
    setSaving(true)
    try {
      await api.put('/api/store/customization', form)
      setSavedForm(form)
      toast.success('Theme saved')
    } catch {
      toast.error('Failed to save theme')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-6 animate-pulse h-64" />
  }

  return (
    <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-6 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="w-5 h-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">Theme</h2>
        </div>
        <p className="text-sm text-gray-400">Customize your store's colors. Changes apply to the customer storefront.</p>
      </div>

      {/* Live preview */}
      <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: form.header_color }}>
          <div className="w-6 h-6 rounded-full bg-white/20" />
          <div className="h-3 w-24 rounded-full bg-white/30" />
          <div className="ml-auto h-7 w-20 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: form.primary_color }}>
            Cart (2)
          </div>
        </div>
        <div className="p-4 bg-gray-50 flex gap-3">
          {[1, 2].map(i => (
            <div key={i} className="flex-1 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
              <div className="h-20 rounded-lg bg-gray-100 mb-2" />
              <div className="h-2.5 w-3/4 rounded-full bg-gray-200 mb-1.5" />
              <div className="h-2 w-1/2 rounded-full bg-gray-100 mb-3" />
              <div className="h-7 rounded-lg text-xs font-semibold text-white flex items-center justify-center" style={{ backgroundColor: form.primary_color }}>
                Add to cart
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setForm({ primary_color: p.primary, header_color: p.header })}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:border-gray-400 transition-colors"
            >
              <span className="w-3.5 h-3.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: p.primary }} />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color pickers */}
      <div className="grid grid-cols-2 gap-6">
        {([
          { key: 'primary_color' as const, label: 'Primary Color', desc: 'Buttons, active tabs, and highlights' },
          { key: 'header_color' as const, label: 'Header Color', desc: 'Background of the top navigation bar' },
        ]).map(({ key, label, desc }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <p className="text-xs text-gray-400 mb-3">{desc}</p>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                <input
                  type="color"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 border-0 p-0"
                />
              </div>
              <input
                type="text"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="flex-1 text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-50">
        <button
          onClick={save}
          disabled={saving || !isDirty}
          className="px-5 py-2 text-sm font-semibold rounded-lg text-white bg-[#6366f1] hover:bg-[#4f52d8] disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Theme'}
        </button>
      </div>
    </div>
  )
}
