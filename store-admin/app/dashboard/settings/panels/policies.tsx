'use client'

import { useState, useEffect } from 'react'
import { FileText } from '@deemlol/next-icons'
import { toast } from 'sonner'
import api from '@/lib/api'
import dynamic from 'next/dynamic'

const BlockNoteEditor = dynamic(() => import('@/components/blocknote-editor/BlockNoteEditor'), { ssr: false })

type PolicyKey = 'refund_policy' | 'privacy_policy' | 'terms'

const TABS: { key: PolicyKey; label: string }[] = [
  { key: 'refund_policy',  label: 'Refund Policy' },
  { key: 'privacy_policy', label: 'Privacy Policy' },
  { key: 'terms',          label: 'Terms & Conditions' },
]

export default function PoliciesPanel() {
  const EMPTY_CONTENT: Record<PolicyKey, string> = { refund_policy: '', privacy_policy: '', terms: '' }
  const [active, setActive] = useState<PolicyKey>('refund_policy')
  const [content, setContent] = useState<Record<PolicyKey, string>>(EMPTY_CONTENT)
  const [savedContent, setSavedContent] = useState<Record<PolicyKey, string>>(EMPTY_CONTENT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/store/customization')
      .then(res => {
        const c = res.data.customization
        const loaded = {
          refund_policy:  c.refund_policy  ?? '',
          privacy_policy: c.privacy_policy ?? '',
          terms:          c.terms          ?? '',
        }
        setContent(loaded)
        setSavedContent(loaded)
      })
      .catch(() => toast.error('Failed to load policies'))
      .finally(() => setLoading(false))
  }, [])

  const isDirty = JSON.stringify(content) !== JSON.stringify(savedContent)

  async function save() {
    if (!isDirty) return
    setSaving(true)
    try {
      await api.put('/api/store/customization', {
        refund_policy:  content.refund_policy  || null,
        privacy_policy: content.privacy_policy || null,
        terms:          content.terms          || null,
      })
      setSavedContent(content)
      toast.success('Policies saved')
    } catch {
      toast.error('Failed to save policies')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-6 animate-pulse h-96" />
  }

  return (
    <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <FileText className="w-5 h-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">Policies</h2>
        </div>
        <p className="text-sm text-gray-400">Write your store policies. These are linked in the storefront footer.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === t.key
                ? 'border-[#6366f1] text-[#6366f1]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Editor — key forces remount when switching tabs so BlockNote reinitialises */}
      <div>
        <BlockNoteEditor
          key={active}
          initialContent={content[active]}
          onChange={val => setContent(c => ({ ...c, [active]: val }))}
        />
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-50">
        <button
          onClick={save}
          disabled={saving || !isDirty}
          className="px-5 py-2 text-sm font-semibold rounded-lg text-white bg-[#6366f1] hover:bg-[#4f52d8] disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Policies'}
        </button>
      </div>
    </div>
  )
}
