'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ImagePlus, Loader, Plus, X } from '@deemlol/next-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { useFileUpload } from '@/hooks/useFileUpload'
import type { Category } from '@/types'
import AppSwitch from '@/components/ui/app-switch'
import { AppCombobox } from '@/components/ui/app-combobox'
import { apiErrorMessage } from '@/lib/utils'

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
  const [removeImage, setRemoveImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const { uploadFile, isUploading } = useFileUpload()

  useEffect(() => {
    api.get('/api/categories')
      .then(res => {
        const cats: Category[] = res.data.categories
        setAllCategories(cats)
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

  async function handleStatusToggle(newValue: boolean) {
    setIsActive(newValue)
    setIsTogglingStatus(true)
    try {
      await api.patch(`/api/categories/${id}/status`, { is_active: newValue })
      toast.success(newValue ? 'Category activated' : 'Category deactivated')
    } catch {
      setIsActive(!newValue)
      toast.error('Failed to update status')
    } finally {
      setIsTogglingStatus(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Category name is required'); return }
    setIsSaving(true)
    try {
      let mediaId: string | undefined
      if (imageFile) {
        mediaId = await uploadFile(imageFile, { entityType: 'CATEGORY' })
      }

      await api.put(`/api/categories/${id}`, {
        name: name.trim(),
        parent_id: parentId || undefined,
        ...(mediaId && { media_id: mediaId }),
        ...(removeImage && !imageFile && { remove_image: 'true' }),
      })
      toast.success('Category updated')
      router.push('/dashboard/categories')
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Failed to update category')
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

  if (!category) {
    return (
      <div className="text-center py-40 text-gray-400">
        <p className="text-lg font-medium">Category not found</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-[#6366f1] hover:underline">Go back</button>
      </div>
    )
  }

  const currentImage = category.image_url
    ? (category.image_url.startsWith('http') ? category.image_url : `${API_URL}${category.image_url}`)
    : null

  const parentOptions = allCategories.filter(c => c.id !== id)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 bg-white border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Categories
        </button>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Edit category</h1>
          {isActive && (
            <Button
              className="bg-[#6366f1] hover:bg-[#4f46e5] text-white gap-2"
              onClick={() => router.push(`/dashboard/products/new?category_id=${id}`)}
            >
              <Plus className="w-4 h-4" /> Add product
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 bg-gray-50">
        <div className="max-w-lg mx-auto px-6 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

            {/* Image */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Image <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-4 cursor-pointer group w-fit">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 group-hover:border-[#6366f1] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0 bg-gray-50">
                    {imagePreview ? (
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    ) : !removeImage && currentImage ? (
                      <img src={currentImage} alt="current" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus className="w-6 h-6 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 group-hover:text-[#6366f1] transition-colors">
                      {imagePreview || (!removeImage && currentImage) ? 'Change image' : 'Upload image'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">PNG, JPG up to 5MB</p>
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handleImageChange} />
                </label>
                {(imagePreview || (!removeImage && currentImage)) && (
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); setRemoveImage(true) }}
                    className="p-1.5 rounded-full bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-gray-50" />

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                className="h-11"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            {/* Parent category */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Parent category <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </Label>
              <AppCombobox
                value={parentId}
                onValueChange={setParentId}
                placeholder="None (top-level)"
                searchPlaceholder="Search categories..."
                options={parentOptions.map(c => ({ value: c.id, label: c.name }))}
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Status</Label>
              <div className="h-11 flex items-center gap-3">
                <AppSwitch checked={isActive} onChange={handleStatusToggle} />
                {isTogglingStatus && <Loader className="w-4 h-4 animate-spin text-gray-400" />}
              </div>
            </div>

            <div className="border-t border-gray-50 pt-1">
              <Button
                className="bg-[#6366f1] hover:bg-[#4f46e5] text-white w-full h-11"
                onClick={handleSave}
                disabled={isSaving || isUploading}
              >
                {(isSaving || isUploading) && <Loader className="w-4 h-4 animate-spin mr-2" />}
                {isUploading ? 'Uploading…' : isSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
