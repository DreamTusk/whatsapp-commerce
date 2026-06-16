'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Heart } from '@deemlol/next-icons'
import { toast } from 'sonner'
import api from '@/lib/api'

interface SocialForm {
  instagram_url: string
  facebook_url: string
  whatsapp_number: string
  whatsapp_message: string
  youtube_url: string
  x_url: string
}

function buildWhatsAppLink(number: string, message: string) {
  const digits = number.replace(/\D/g, '')
  if (!digits) return ''
  return message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`
}

const EMPTY_FORM: SocialForm = {
  instagram_url: '', facebook_url: '',
  whatsapp_number: '', whatsapp_message: '',
  youtube_url: '', x_url: '',
}

export default function SupportSocialPanel() {
  const [form, setForm] = useState<SocialForm>(EMPTY_FORM)
  const [savedForm, setSavedForm] = useState<SocialForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/store/customization')
      .then(res => {
        const c = res.data.customization
        const loaded: SocialForm = {
          instagram_url:    c.instagram_url    ?? '',
          facebook_url:     c.facebook_url     ?? '',
          whatsapp_number:  c.whatsapp_number  ?? '',
          whatsapp_message: c.whatsapp_message ?? '',
          youtube_url:      c.youtube_url      ?? '',
          x_url:            c.x_url            ?? '',
        }
        setForm(loaded)
        setSavedForm(loaded)
      })
      .catch(() => toast.error('Failed to load social links'))
      .finally(() => setLoading(false))
  }, [])

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm)

  async function save() {
    if (!isDirty) return
    setSaving(true)
    try {
      await api.put('/api/store/customization', {
        instagram_url:    form.instagram_url    || null,
        facebook_url:     form.facebook_url     || null,
        whatsapp_number:  form.whatsapp_number  || null,
        whatsapp_message: form.whatsapp_message || null,
        youtube_url:      form.youtube_url      || null,
        x_url:            form.x_url            || null,
      })
      setSavedForm(form)
      toast.success('Social links saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const waLink = buildWhatsAppLink(form.whatsapp_number, form.whatsapp_message)

  if (loading) {
    return <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-6 animate-pulse h-64" />
  }

  return (
    <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Heart className="w-5 h-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">Support &amp; Social</h2>
        </div>
        <p className="text-sm text-gray-400">Add social media links shown in your storefront footer.</p>
      </div>

      <div className="space-y-5">

        {/* Instagram */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
            <Image src="/images/instagram.png" alt="Instagram" width={18} height={18} className="rounded-sm" />
            Instagram
          </label>
          <input
            type="url"
            value={form.instagram_url}
            onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
            placeholder="https://instagram.com/yourstore"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-gray-300"
          />
        </div>

        {/* Facebook */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
            <Image src="/images/facebook.png" alt="Facebook" width={18} height={18} className="rounded-sm" />
            Facebook
          </label>
          <input
            type="url"
            value={form.facebook_url}
            onChange={e => setForm(f => ({ ...f, facebook_url: e.target.value }))}
            placeholder="https://facebook.com/yourstore"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-gray-300"
          />
        </div>

        {/* WhatsApp */}
        <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-2">
            <Image src="/images/whatsapp.png" alt="WhatsApp" width={18} height={18} className="rounded-sm" />
            <span className="text-sm font-medium text-gray-700">WhatsApp</span>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Phone number (with country code)</label>
            <input
              type="tel"
              value={form.whatsapp_number}
              onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
              placeholder="+91 98765 43210"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-gray-300 bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Pre-filled message (optional)</label>
            <input
              type="text"
              value={form.whatsapp_message}
              onChange={e => setForm(f => ({ ...f, whatsapp_message: e.target.value }))}
              placeholder="Hi! I'd like to know more about your products."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-gray-300 bg-white"
            />
          </div>
          {waLink && (
            <p className="text-xs text-gray-400 break-all">
              Link preview: <span className="text-green-600 font-mono">{waLink}</span>
            </p>
          )}
        </div>

        {/* YouTube */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
            <Image src="/images/youtube.png" alt="YouTube" width={18} height={18} className="rounded-sm" />
            YouTube
          </label>
          <input
            type="url"
            value={form.youtube_url}
            onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
            placeholder="https://youtube.com/@yourstore"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-gray-300"
          />
        </div>

        {/* X (Twitter) */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
            <Image src="/images/x.png" alt="X" width={18} height={18} className="rounded-sm" />
            X (Twitter)
          </label>
          <input
            type="url"
            value={form.x_url}
            onChange={e => setForm(f => ({ ...f, x_url: e.target.value }))}
            placeholder="https://x.com/yourstore"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-gray-300"
          />
        </div>

      </div>

      <div className="flex justify-end pt-2 border-t border-gray-50">
        <button
          onClick={save}
          disabled={saving || !isDirty}
          className="px-5 py-2 text-sm font-semibold rounded-lg text-white bg-[#6366f1] hover:bg-[#4f52d8] disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
