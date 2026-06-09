'use client'

import { useState } from 'react'
import api from '@/lib/api'

interface UploadOptions {
  entityType: 'PRODUCT' | 'CATEGORY' | 'BANNER' | 'STORE' | 'INVOICE' | 'DOCUMENT'
  visibility?: 'PUBLIC' | 'PRIVATE'
}

interface UseFileUploadReturn {
  uploadFile: (file: File, opts: UploadOptions) => Promise<string>
  isUploading: boolean
}

export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false)

  async function uploadFile(file: File, opts: UploadOptions): Promise<string> {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entity_type', opts.entityType)
      formData.append('visibility', opts.visibility ?? 'PUBLIC')

      const { data } = await api.post('/api/files/upload', formData)
      return data.media.id
    } finally {
      setIsUploading(false)
    }
  }

  return { uploadFile, isUploading }
}
