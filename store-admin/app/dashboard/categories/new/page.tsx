'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function NewCategoryPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Category name is required'); return }
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('sort_order', sortOrder)
      formData.append('is_active', String(isActive))
      if (imageFile) formData.append('image', imageFile)

      await api.post('/api/categories', formData)
      toast.success('Category created')
      router.push('/dashboard/categories')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create category'
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
          <ArrowLeft className="w-4 h-4" /> Categories
        </button>
        <h1 className="text-[26px] font-bold text-gray-900">Add category</h1>
      </div>

      <div className="flex-1 overflow-auto min-h-0 px-6 pb-8">
        <div className="max-w-lg space-y-4 pt-2">
          {/* Image */}
          <div className="space-y-1.5">
            <Label className="text-base">Image <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#25D366] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#25D366] transition-colors" />
                )}
              </div>
              <span className="text-base text-gray-500 group-hover:text-gray-700">
                {imagePreview ? 'Change image' : 'Upload image'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-base">Name <span className="text-destructive">*</span></Label>
            <Input
              className="text-base h-11"
              placeholder="Fruits & Vegetables"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-base">Sort order</Label>
              <Input
                className="text-base h-11"
                type="number"
                min={0}
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base">Status</Label>
              <button
                type="button"
                onClick={() => setIsActive(v => !v)}
                className={`w-full h-11 rounded-lg text-base font-medium border transition-colors ${isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
              >
                {isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>

          <Button
            className="bg-[#25D366] hover:bg-[#1ebe5d] text-white w-full h-11 text-base"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isSaving ? 'Saving…' : 'Add category'}
          </Button>
        </div>
      </div>
    </div>
  )
}
