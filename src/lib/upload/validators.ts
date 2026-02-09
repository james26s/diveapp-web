import { ACCEPTED_VIDEO_FORMATS, ACCEPTED_VIDEO_EXTENSIONS, type TierLimits } from '@/lib/constants'

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateVideoFile(file: File, tierLimits: TierLimits): ValidationResult {
  // Check format
  const isValidFormat = ACCEPTED_VIDEO_FORMATS.includes(file.type)
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  const isValidExtension = ACCEPTED_VIDEO_EXTENSIONS.includes(extension)

  if (!isValidFormat && !isValidExtension) {
    return {
      valid: false,
      error: `Unsupported format. Accepted formats: ${ACCEPTED_VIDEO_EXTENSIONS.join(', ')}`,
    }
  }

  // Check size
  if (file.size > tierLimits.maxUploadSize) {
    const maxSizeGB = tierLimits.maxUploadSize / (1024 * 1024 * 1024)
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeGB}GB. Upgrade your plan for larger uploads.`,
    }
  }

  return { valid: true }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
