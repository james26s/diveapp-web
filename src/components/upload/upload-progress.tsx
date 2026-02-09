'use client'

import { File, Pause, Play, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatFileSize } from '@/lib/upload/validators'
import { useUploadStore, type UploadItem } from '@/stores/upload-store'

export function UploadProgress() {
  const items = useUploadStore((s) => s.items)
  const updateItem = useUploadStore((s) => s.updateItem)
  const removeItem = useUploadStore((s) => s.removeItem)
  const clearCompleted = useUploadStore((s) => s.clearCompleted)

  if (items.length === 0) return null

  const completedCount = items.filter((i) => i.status === 'completed').length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Uploads ({completedCount}/{items.length} complete)
        </h3>
        {completedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearCompleted}>
            Clear completed
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <UploadItemRow
            key={item.id}
            item={item}
            onPause={() => {
              item.tusUpload?.abort()
              updateItem(item.id, { status: 'paused' })
            }}
            onResume={() => {
              item.tusUpload?.start()
              updateItem(item.id, { status: 'uploading' })
            }}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

function UploadItemRow({
  item,
  onPause,
  onResume,
  onRemove,
}: {
  item: UploadItem
  onPause: () => void
  onResume: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        {item.status === 'completed' ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : item.status === 'error' ? (
          <AlertCircle className="h-5 w-5 text-destructive" />
        ) : (
          <File className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium">{item.file.name}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {formatFileSize(item.file.size)}
          </p>
          {item.status === 'uploading' && (
            <span className="text-xs text-primary">{item.progress}%</span>
          )}
          {item.status === 'paused' && (
            <span className="text-xs text-amber-500">Paused</span>
          )}
          {item.status === 'error' && (
            <span className="text-xs text-destructive">{item.error ?? 'Upload failed'}</span>
          )}
        </div>
        {(item.status === 'uploading' || item.status === 'paused') && (
          <Progress value={item.progress} className="mt-1.5 h-1" />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {item.status === 'uploading' && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPause}>
            <Pause className="h-4 w-4" />
          </Button>
        )}
        {item.status === 'paused' && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onResume}>
            <Play className="h-4 w-4" />
          </Button>
        )}
        {item.status !== 'completed' && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
