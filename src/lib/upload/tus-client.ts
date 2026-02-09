import * as tus from 'tus-js-client'
import { TUS_CHUNK_SIZE } from '@/lib/constants'

export interface TusUploadOptions {
  file: File
  bucketName: string
  objectPath: string
  supabaseUrl: string
  supabaseKey: string
  token: string
  onProgress?: (percentage: number) => void
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function createTusUpload({
  file,
  bucketName,
  objectPath,
  supabaseUrl,
  supabaseKey,
  token,
  onProgress,
  onSuccess,
  onError,
}: TusUploadOptions): tus.Upload {
  const upload = new tus.Upload(file, {
    endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    chunkSize: TUS_CHUNK_SIZE,
    headers: {
      authorization: `Bearer ${token}`,
      apikey: supabaseKey,
    },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: {
      bucketName,
      objectName: objectPath,
      contentType: file.type,
      cacheControl: '3600',
    },
    onError: (error) => {
      onError?.(error)
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      const percentage = Math.round((bytesUploaded / bytesTotal) * 100)
      onProgress?.(percentage)
    },
    onSuccess: () => {
      onSuccess?.()
    },
  })

  return upload
}
