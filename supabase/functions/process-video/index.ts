// process-video: Triggered by DB webhook when video status changes to 'uploaded'
// Creates a single processing job and dispatches to Modal GPU pipeline

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { record } = await req.json()

    // Only process when status changes to 'uploaded'
    if (record.status !== 'uploaded') {
      return new Response(JSON.stringify({ message: 'Skipped: not uploaded status' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const modalEndpoint = Deno.env.get('MODAL_ENDPOINT_URL')

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Update video status to processing
    await supabase
      .from('videos')
      .update({ status: 'processing' })
      .eq('id', record.id)

    // Get the dive_id for this video
    const { data: video } = await supabase
      .from('videos')
      .select('dive_id')
      .eq('id', record.id)
      .single()

    if (!video) {
      return new Response(JSON.stringify({ error: 'Video not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create a single processing job to track overall progress
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        video_id: record.id,
        user_id: record.user_id,
        type: 'scene_analysis', // Using first type as the umbrella job
        status: 'pending',
        progress: 0,
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('Failed to create job:', jobError)
      return new Response(JSON.stringify({ error: jobError?.message ?? 'Failed to create job' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Generate a signed URL for the video in Storage
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from('dive-videos')
      .createSignedUrl(record.storage_path, 3600) // 1 hour expiry

    if (signError || !signedUrlData?.signedUrl) {
      console.error('Failed to create signed URL:', signError)
      await supabase
        .from('processing_jobs')
        .update({ status: 'failed', error: 'Failed to create signed URL' })
        .eq('id', job.id)
      await supabase
        .from('videos')
        .update({ status: 'failed' })
        .eq('id', record.id)
      return new Response(JSON.stringify({ error: 'Failed to create signed URL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Dispatch to Modal if endpoint is configured, otherwise fall back to mock
    if (modalEndpoint) {
      try {
        const response = await fetch(modalEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_id: record.id,
            dive_id: video.dive_id,
            user_id: record.user_id,
            job_id: job.id,
            signed_url: signedUrlData.signedUrl,
          }),
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Modal returned ${response.status}: ${errText}`)
        }

        const result = await response.json()
        console.log('Modal processing started:', result)

        return new Response(
          JSON.stringify({
            message: `Processing dispatched to Modal for video ${record.id}`,
            job_id: job.id,
            modal_call_id: result.call_id,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } catch (err) {
        console.error('Modal dispatch failed, falling back:', err)
        // Update job with error but don't fail completely
        await supabase
          .from('processing_jobs')
          .update({ status: 'failed', error: `Modal dispatch failed: ${String(err)}` })
          .eq('id', job.id)
        await supabase
          .from('videos')
          .update({ status: 'failed' })
          .eq('id', record.id)
        return new Response(
          JSON.stringify({ error: `Modal dispatch failed: ${String(err)}` }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // No Modal endpoint configured - invoke the mock job-runner as fallback
      console.log('MODAL_ENDPOINT_URL not set, using mock job-runner fallback')

      // Create the remaining 6 mock job rows so job-runner can process them
      const mockJobTypes = [
        'species_detection',
        'highlight_extraction',
        'color_correction',
        'clip_generation',
        'dive_log_generation',
        'thumbnail_generation',
      ] as const

      const mockJobs = mockJobTypes.map((type) => ({
        video_id: record.id,
        user_id: record.user_id,
        type,
        status: 'pending' as const,
        progress: 0,
      }))

      await supabase.from('processing_jobs').insert(mockJobs)

      return new Response(
        JSON.stringify({
          message: `Created mock jobs for video ${record.id} (Modal not configured)`,
          job_id: job.id,
          mode: 'mock',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
