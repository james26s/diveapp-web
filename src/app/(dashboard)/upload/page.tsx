'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createTusUpload } from '@/lib/upload/tus-client'
import { useUser } from '@/hooks/use-user'
import { useSubscription } from '@/hooks/use-subscription'
import { useUploadStore } from '@/stores/upload-store'
import { PageHeader } from '@/components/shared/page-header'
import { UploadZone } from '@/components/upload/upload-zone'
import { UploadProgress } from '@/components/upload/upload-progress'
import { DiveMetadataForm } from '@/components/upload/dive-metadata-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DiveInsert } from '@/types/domain'
import { toast } from 'sonner'

export default function UploadPage() {
  const { user } = useUser()
  const { tier } = useSubscription(user?.id)
  const router = useRouter()
  const supabase = createClient()
  const addItem = useUploadStore((s) => s.addItem)
  const updateItem = useUploadStore((s) => s.updateItem)

  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [creating, setCreating] = useState(false)

  const handleFilesSelected = useCallback((files: File[]) => {
    setPendingFiles((prev) => [...prev, ...files])
  }, [])

  const handleDiveSubmit = async (diveData: DiveInsert) => {
    if (!user || pendingFiles.length === 0) return
    setCreating(true)

    try {
      // 1. Create dive
      const { data: dive, error: diveError } = await supabase
        .from('dives')
        .insert(diveData)
        .select()
        .single()

      if (diveError) throw diveError

      // 2. Get session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      // 3. Start uploads for each file
      for (const file of pendingFiles) {
        const videoId = crypto.randomUUID()
        const storagePath = `${user.id}/${dive.id}/${videoId}/${file.name}`

        // Insert video record
        const { error: videoError } = await supabase.from('videos').insert({
          id: videoId,
          dive_id: dive.id,
          user_id: user.id,
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          format: file.type,
          status: 'uploading',
        })

        if (videoError) {
          toast.error(`Failed to create video record: ${videoError.message}`)
          continue
        }

        const tusUpload = createTusUpload({
          file,
          bucketName: 'dive-videos',
          objectPath: storagePath,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          token: session.access_token,
          onProgress: (percentage) => {
            updateItem(videoId, { progress: percentage })
          },
          onSuccess: async () => {
            updateItem(videoId, { status: 'completed', progress: 100 })
            await supabase
              .from('videos')
              .update({ status: 'uploaded' })
              .eq('id', videoId)
            toast.success(`${file.name} uploaded successfully`)
          },
          onError: (error) => {
            updateItem(videoId, { status: 'error', error: error.message })
            toast.error(`${file.name} upload failed`)
          },
        })

        addItem({ id: videoId, file, diveId: dive.id, videoId, tusUpload })
        updateItem(videoId, { status: 'uploading' })
        tusUpload.start()
      }

      setPendingFiles([])
      toast.success('Dive created! Uploads started.')
      router.push(`/dives/${dive.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create dive')
    } finally {
      setCreating(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Dive Footage"
        description="Drop your videos and we'll handle the rest"
      />

      <Card>
        <CardHeader>
          <CardTitle>Select Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadZone tier={tier} onFilesSelected={handleFilesSelected} />
          {pendingFiles.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">
                {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} selected
              </p>
              <ul className="space-y-1">
                {pendingFiles.map((f, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {f.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {pendingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dive Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DiveMetadataForm
              userId={user.id}
              onSubmit={handleDiveSubmit}
              loading={creating}
            />
          </CardContent>
        </Card>
      )}

      <UploadProgress />
    </div>
  )
}
