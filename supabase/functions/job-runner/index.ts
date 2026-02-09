// job-runner: Polled by pg_cron every 30s
// Picks up pending jobs and processes them (mock results for MVP)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MOCK_SPECIES = [
  { name: 'Green Sea Turtle', scientific: 'Chelonia mydas', category: 'reptile', confidence: 0.95 },
  { name: 'Manta Ray', scientific: 'Mobula birostris', category: 'fish', confidence: 0.92 },
  { name: 'Clownfish', scientific: 'Amphiprion ocellaris', category: 'fish', confidence: 0.88 },
  { name: 'Moray Eel', scientific: 'Gymnothorax javanicus', category: 'fish', confidence: 0.85 },
  { name: 'Nudibranch', scientific: 'Nudibranchia', category: 'invertebrate', confidence: 0.78 },
  { name: 'Barracuda', scientific: 'Sphyraena barracuda', category: 'fish', confidence: 0.91 },
  { name: 'Lionfish', scientific: 'Pterois volitans', category: 'fish', confidence: 0.89 },
  { name: 'Octopus', scientific: 'Octopoda', category: 'invertebrate', confidence: 0.86 },
]

const HIGHLIGHT_TYPES = ['species_sighting', 'interesting_moment', 'scenic'] as const

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Pick up to 5 pending jobs
  const { data: jobs, error } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5)

  if (error || !jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ message: 'No pending jobs' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  for (const job of jobs) {
    // Mark as running
    await supabase
      .from('processing_jobs')
      .update({ status: 'running', started_at: new Date().toISOString(), progress: 10 })
      .eq('id', job.id)

    // Simulate progress
    for (let p = 30; p <= 90; p += 30) {
      await new Promise((r) => setTimeout(r, 500))
      await supabase
        .from('processing_jobs')
        .update({ progress: p })
        .eq('id', job.id)
    }

    // Generate mock results based on job type
    let result = {}

    if (job.type === 'species_detection') {
      const detected = pickRandom(MOCK_SPECIES, randomBetween(2, 5))
      result = { species: detected }

      // Get the video's dive_id
      const { data: video } = await supabase
        .from('videos')
        .select('dive_id, user_id')
        .eq('id', job.video_id)
        .single()

      if (video) {
        // Look up species IDs and create highlights + highlight_species
        for (const sp of detected) {
          const { data: speciesRow } = await supabase
            .from('species')
            .select('id')
            .eq('common_name', sp.name)
            .single()

          if (speciesRow) {
            const startTime = randomBetween(10, 200)
            const { data: highlight } = await supabase
              .from('highlights')
              .insert({
                video_id: job.video_id,
                dive_id: video.dive_id,
                user_id: video.user_id,
                type: 'species_sighting',
                title: `${sp.name} sighting`,
                start_time: startTime,
                end_time: startTime + randomBetween(5, 30),
                confidence: sp.confidence,
              })
              .select()
              .single()

            if (highlight) {
              await supabase.from('highlight_species').insert({
                highlight_id: highlight.id,
                species_id: speciesRow.id,
                confidence: sp.confidence,
              })
            }
          }
        }
      }
    } else if (job.type === 'highlight_extraction') {
      // Create additional non-species highlights
      const { data: video } = await supabase
        .from('videos')
        .select('dive_id, user_id')
        .eq('id', job.video_id)
        .single()

      if (video) {
        const highlightCount = randomBetween(2, 4)
        for (let i = 0; i < highlightCount; i++) {
          const type = HIGHLIGHT_TYPES[randomBetween(1, 2)] // interesting_moment or scenic
          const startTime = randomBetween(10, 300)
          await supabase.from('highlights').insert({
            video_id: job.video_id,
            dive_id: video.dive_id,
            user_id: video.user_id,
            type,
            title: type === 'interesting_moment'
              ? `Interesting moment #${i + 1}`
              : `Scenic view #${i + 1}`,
            start_time: startTime,
            end_time: startTime + randomBetween(10, 45),
            confidence: Math.random() * 0.3 + 0.7,
          })
        }
        result = { highlights_created: highlightCount }
      }
    } else {
      result = { status: 'completed', mock: true }
    }

    // Mark as completed
    await supabase
      .from('processing_jobs')
      .update({
        status: 'completed',
        progress: 100,
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)
  }

  // Check if all jobs for any video are complete
  const videoIds = [...new Set(jobs.map((j) => j.video_id))]
  for (const videoId of videoIds) {
    const { data: allJobs } = await supabase
      .from('processing_jobs')
      .select('status')
      .eq('video_id', videoId)

    if (allJobs && allJobs.every((j) => j.status === 'completed')) {
      // Update video status
      await supabase.from('videos').update({ status: 'processed' }).eq('id', videoId)

      // Trigger dive log generation
      const { data: video } = await supabase
        .from('videos')
        .select('dive_id, user_id')
        .eq('id', videoId)
        .single()

      if (video) {
        // Call generate-dive-log function
        await supabase.functions.invoke('generate-dive-log', {
          body: { diveId: video.dive_id, userId: video.user_id },
        })
      }
    }
  }

  return new Response(
    JSON.stringify({ message: `Processed ${jobs.length} jobs` }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
