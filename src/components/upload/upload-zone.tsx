'use client'

import { useCallback, useState } from 'react'
import { Upload, File, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { validateVideoFile, formatFileSize } from '@/lib/upload/validators'
import { ACCEPTED_VIDEO_EXTENSIONS, TIER_LIMITS } from '@/lib/constants'
import type { SubscriptionTier } from '@/types/database'

interface UploadZoneProps {
  tier: SubscriptionTier
  onFilesSelected: (files: File[]) => void
}

export function UploadZone({ tier, onFilesSelected }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const limits = TIER_LIMITS[tier]

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles: File[] = []
      const newErrors: string[] = []

      Array.from(files).forEach((file) => {
        const result = validateVideoFile(file, limits)
        if (result.valid) {
          validFiles.push(file)
        } else {
          newErrors.push(`${file.name}: ${result.error}`)
        }
      })

      setErrors(newErrors)
      if (validFiles.length > 0) {
        onFilesSelected(validFiles)
      }
    },
    [limits, onFilesSelected]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
        )}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <p className="mb-1 text-lg font-semibold">
          Drop your dive videos here
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          or click to browse files
        </p>
        <Button variant="outline" asChild>
          <label className="cursor-pointer">
            Browse files
            <input
              type="file"
              accept={ACCEPTED_VIDEO_EXTENSIONS.join(',')}
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          Supports {ACCEPTED_VIDEO_EXTENSIONS.join(', ')} &middot; Max{' '}
          {formatFileSize(limits.maxUploadSize)} per file
        </p>
      </div>

      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-5 w-5 shrink-0"
                onClick={() => setErrors((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
