'use client'

import { useProcessingStatus } from '@/hooks/use-processing-status'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react'
import { PROCESSING_STAGES } from '@/lib/constants'
import type { ProcessingJob } from '@/types/domain'
import { cn } from '@/lib/utils'

interface ProcessingStatusProps {
  videoId: string
}

export function ProcessingStatus({ videoId }: ProcessingStatusProps) {
  const { jobs, isProcessing, isComplete, hasFailed, overallProgress, loading } = useProcessingStatus(videoId)

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-2 w-full rounded bg-muted" />
      </div>
    )
  }

  if (jobs.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">AI Processing</h3>
        {isComplete && (
          <Badge className="bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
          </Badge>
        )}
        {isProcessing && (
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing
          </Badge>
        )}
        {hasFailed && (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" /> Error
          </Badge>
        )}
      </div>

      {isProcessing && <Progress value={overallProgress} className="h-1.5" />}

      <div className="space-y-2">
        {PROCESSING_STAGES.map((stage) => {
          const job = jobs.find((j) => j.type === stage.type)
          return (
            <ProcessingStageRow
              key={stage.type}
              label={stage.label}
              job={job}
            />
          )
        })}
      </div>
    </div>
  )
}

function ProcessingStageRow({ label, job }: { label: string; job?: ProcessingJob }) {
  const status = job?.status ?? 'pending'

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className={cn(
        'flex h-6 w-6 items-center justify-center rounded-full',
        status === 'completed' && 'bg-emerald-500/10 text-emerald-600',
        status === 'running' && 'bg-primary/10 text-primary',
        status === 'failed' && 'bg-destructive/10 text-destructive',
        status === 'pending' && 'bg-muted text-muted-foreground',
      )}>
        {status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
        {status === 'running' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {status === 'failed' && <AlertCircle className="h-3.5 w-3.5" />}
        {status === 'pending' && <Clock className="h-3.5 w-3.5" />}
      </div>
      <span className={cn(
        status === 'completed' && 'text-foreground',
        status === 'running' && 'font-medium text-foreground',
        status === 'pending' && 'text-muted-foreground',
        status === 'failed' && 'text-destructive',
      )}>
        {label}
      </span>
      {status === 'running' && job && (
        <span className="ml-auto text-xs text-muted-foreground">{job.progress}%</span>
      )}
    </div>
  )
}
