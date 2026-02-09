// process-video: Triggered by DB webhook when video status changes to 'uploaded'
// Creates processing_jobs rows for each stage of the AI pipeline

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const JOB_TYPES = [
  'scene_analysis',
  'species_detection',
  'highlight_extraction',
  'color_correction',
  'clip_generation',
  'dive_log_generation',
  'thumbnail_generation',
] as const

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Update video status to processing
    await supabase
      .from('videos')
      .update({ status: 'processing' })
      .eq('id', record.id)

    // Create a job for each pipeline stage
    const jobs = JOB_TYPES.map((type) => ({
      video_id: record.id,
      user_id: record.user_id,
      type,
      status: 'pending' as const,
      progress: 0,
    }))

    const { error } = await supabase.from('processing_jobs').insert(jobs)

    if (error) {
      console.error('Failed to create jobs:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ message: `Created ${jobs.length} jobs for video ${record.id}` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
