'use client'

import { Badge } from '@/components/ui/badge'
import { ProcessingStatus } from '@/components/processing/processing-status'
import type { Video } from '@/types/domain'
import { formatFileSize } from '@/lib/upload/validators'

interface DiveVideoPlayerProps {
  video: Video
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  uploading: { label: 'Uploading', variant: 'secondary' },
  uploaded: { label: 'Uploaded', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'default' },
  processed: { label: 'Processed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
}

export function DiveVideoPlayer({ video }: DiveVideoPlayerProps) {
  const statusInfo = STATUS_LABELS[video.status] ?? { label: video.status, variant: 'secondary' as const }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{video.file_name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(video.file_size)}
            {video.resolution && ` · ${video.resolution}`}
            {video.duration && ` · ${Math.round(video.duration)}s`}
          </p>
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      {(video.status === 'processing' || video.status === 'uploaded') && (
        <ProcessingStatus videoId={video.id} />
      )}
    </div>
  )
}
