'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import type { Category } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [category, setCategory] = useState<Category | null>(null)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    api.get('/api/categories')
      .then(res => {
        const cats: Category[] = res.data.categories
        setAllCategories(cats)
        // Search top-level and children
        let found: Category | null = null
        for (const c of cats) {
          if (c.id === id) { found = c; break }
          const child = c.children?.find(ch => ch.id === id)
          if (child) { found = child; break }
        }
        setCategory(found)
        if (found) {
          setName(found.name)
          setIsActive(found.is_active)
          setParentId(found.parent_id ?? '')
        }
      })
      .catch(() => toast.error('Failed to load category'))
      .finally(() => setLoading(false))
  }, [id])

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
      formData.append('is_active', String(isActive))
      formData.append('parent_id', parentId)
      if (imageFile) formData.append('image', imageFile)

      await api.put(`/api/categories/${id}`, formData)
      toast.success('Category updated')
      router.push('/dashboard/categories')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update category'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!category) {
    return (
      <div className="text-center py-40 text-gray-400">
        <p className="text-lg font-medium">Category not found</p>
        <button onClick={() => router.back()} className="mt-3 text-base text-[#25D366] hover:underline cursor-pointer">Go back</button>
      </div>
    )
  }

  // Only top-level categories can be parents (exclude self)
  const parentOptions = allCategories.filter(c => c.id !== id)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gray-50">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-base text-gray-500 hover:text-gray-700 mb-3 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Categories
        </button>
        <h1 className="text-[26px] font-bold text-gray-900">Edit category</h1>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <div className="flex justify-center px-6 py-8">
        <div className="w-full max-w-lg space-y-4">
          <div className="space-y-1.5">
            <Label className="text-base">Image <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#25D366] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : category.image_url ? (
                  <img src={category.image_url.startsWith('http') ? category.image_url : `${API_URL}${category.image_url}`} alt="current" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#25D366] transition-colors" />
                )}
              </div>
              <span className="text-base text-gray-500 group-hover:text-gray-700">
                {imagePreview || category.image_url ? 'Change image' : 'Upload image'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-base">Name <span className="text-destructive">*</span></Label>
            <Input
              className="text-base h-11"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-base">Parent category <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-gray-200 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366] cursor-pointer"
            >
              <option value="">None (top-level)</option>
              {parentOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-base">Status</Label>
            <button
              type="button"
              onClick={() => setIsActive(v => !v)}
              className={`w-full h-11 rounded-lg text-base font-medium border transition-colors cursor-pointer ${isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </button>
          </div>

          <Button
            className="bg-[#25D366] hover:bg-[#1ebe5d] text-white w-full h-11 text-base"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}
