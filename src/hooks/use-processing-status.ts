'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProcessingJob } from '@/types/domain'

export function useProcessingStatus(videoId: string | undefined) {
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!videoId) {
      setLoading(false)
      return
    }

    const fetchJobs = async () => {
      const { data } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true })

      setJobs(data ?? [])
      setLoading(false)
    }

    fetchJobs()

    const channel = supabase
      .channel(`processing:${videoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_jobs',
          filter: `video_id=eq.${videoId}`,
        },
        (payload) => {
          setJobs((prev) => {
            const existing = prev.findIndex((j) => j.id === (payload.new as ProcessingJob).id)
            if (existing >= 0) {
              const updated = [...prev]
              updated[existing] = payload.new as ProcessingJob
              return updated
            }
            return [...prev, payload.new as ProcessingJob]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [videoId, supabase])

  const isProcessing = jobs.some((j) => j.status === 'pending' || j.status === 'running')
  const isComplete = jobs.length > 0 && jobs.every((j) => j.status === 'completed')
  const hasFailed = jobs.some((j) => j.status === 'failed')
  const overallProgress = jobs.length > 0
    ? Math.round(jobs.reduce((sum, j) => sum + j.progress, 0) / jobs.length)
    : 0

  return { jobs, isProcessing, isComplete, hasFailed, overallProgress, loading }
}
