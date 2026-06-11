'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Loader } from '@deemlol/next-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import type { Brand } from '@/types'
import { apiErrorMessage } from '@/lib/utils'

export default function EditBrandPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    api.get('/api/brands')
      .then(res => {
        const brands: Brand[] = res.data.brands
        const found = brands.find(b => b.id === id) ?? null
        setBrand(found)
        if (found) setName(found.name)
      })
      .catch(() => toast.error('Failed to load brand'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave() {
    if (!name.trim()) { toast.error('Brand name is required'); return }
    setIsSaving(true)
    try {
      await api.put(`/api/brands/${id}`, { name: name.trim() })
      toast.success('Brand updated')
      router.push('/dashboard/brands')
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Failed to update brand')
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="text-center py-40 text-gray-400">
        <p className="text-lg font-medium">Brand not found</p>
        <button onClick={() => router.back()} className="mt-3 text-base text-[#6366f1] hover:underline cursor-pointer">Go back</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-base text-gray-500 hover:text-gray-700 mb-3 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Brands
        </button>
        <h1 className="text-[26px] font-bold text-gray-900">Edit brand</h1>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <div className="flex justify-center px-6 py-8">
        <div className="w-full max-w-lg space-y-4">
          <div className="space-y-1.5">
            <Label className="text-base">Brand name <span className="text-destructive">*</span></Label>
            <Input
              className="text-base h-11"
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
            {isSaving ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}
