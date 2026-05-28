'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'

export default function NewBrandPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) { toast.error('Brand name is required'); return }
    setIsSaving(true)
    try {
      await api.post('/api/brands', { name: name.trim() })
      toast.success('Brand created')
      router.push('/dashboard/brands')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create brand'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-base text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Brands
        </button>
        <h1 className="text-[26px] font-bold text-gray-900">Add brand</h1>
      </div>

      <div className="flex-1 overflow-auto min-h-0 px-6 pb-8">
        <div className="max-w-lg space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-base">Brand name <span className="text-destructive">*</span></Label>
            <Input
              className="text-base h-11"
              placeholder="e.g. Amul, Nestle"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          <Button
            className="bg-[#6366f1] hover:bg-[#4f46e5] text-white w-full h-11 text-base"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isSaving ? 'Saving…' : 'Add brand'}
          </Button>
        </div>
      </div>
    </div>
  )
}
