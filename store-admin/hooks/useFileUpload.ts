'use client'

import { useState } from 'react'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'

interface UploadOptions {
  entityType: 'PRODUCT' | 'CATEGORY' | 'BANNER' | 'STORE' | 'INVOICE' | 'DOCUMENT'
  visibility?: 'PUBLIC' | 'PRIVATE'
}

interface UseFileUploadReturn {
  uploadFile: (file: File, opts: UploadOptions) => Promise<string>
  isUploading: boolean
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const ALLOWED_LABEL = 'JPEG, PNG, WebP, or AVIF'

export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false)

  async function uploadFile(file: File, opts: UploadOptions): Promise<string> {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`"${file.type || file.name}" is not supported. Please use ${ALLOWED_LABEL}.`)
    }

    setIsUploading(true)
    try {
      // Step 1: get presigned PUT URL from backend
      const { data: urlData } = await api.post('/api/files/upload-url', {
        entity_type: opts.entityType,
        mime_type: file.type,
        size: file.size,
        visibility: opts.visibility ?? 'PUBLIC',
        original_name: file.name,
      })
      const { uploadUrl, mediaId } = urlData

      // Step 2: upload directly to R2 — backend not involved
      const r2Res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!r2Res.ok) throw new Error('Upload to storage failed')

      // Step 3: confirm so backend marks ACTIVE and generates thumbnail
      await api.post(`/api/files/confirm/${mediaId}`)

      return mediaId
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'Upload failed'))
    } finally {
      setIsUploading(false)
    }
  }

  return { uploadFile, isUploading }
}
