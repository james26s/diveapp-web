import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, Ruler, Thermometer, Eye, FileText, Video as VideoIcon } from 'lucide-react'
import Link from 'next/link'
import { DiveVideoPlayer } from '@/components/dives/dive-video-player'
import { DiveHighlights } from '@/components/dives/dive-highlights'

export async function generateMetadata({ params }: { params: Promise<{ diveId: string }> }) {
  const { diveId } = await params
  const supabase = await createClient()
  const { data: dive } = await supabase.from('dives').select('title').eq('id', diveId).single()
  return { title: dive?.title ?? 'Dive Detail' }
}

export default async function DiveDetailPage({ params }: { params: Promise<{ diveId: string }> }) {
  const { diveId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: dive } = await supabase
    .from('dives')
    .select('*')
    .eq('id', diveId)
    .eq('user_id', user!.id)
    .single()

  if (!dive) notFound()

  const [{ data: videos }, { data: highlights }, { data: diveLog }] = await Promise.all([
    supabase
      .from('videos')
      .select('*')
      .eq('dive_id', diveId)
      .order('created_at'),
    supabase
      .from('highlights')
      .select('*, highlight_species(*, species(*))')
      .eq('dive_id', diveId)
      .order('start_time'),
    supabase
      .from('dive_logs')
      .select('*')
      .eq('dive_id', diveId)
      .single(),
  ])

  const stats = [
    { icon: MapPin, label: 'Location', value: dive.location_name },
    { icon: Clock, label: 'Duration', value: dive.duration ? `${Math.round(dive.duration / 60)} min` : null },
    { icon: Ruler, label: 'Max Depth', value: dive.max_depth ? `${dive.max_depth}m` : null },
    { icon: Thermometer, label: 'Water Temp', value: dive.water_temp ? `${dive.water_temp}°C` : null },
    { icon: Eye, label: 'Visibility', value: dive.visibility ? `${dive.visibility}m` : null },
  ].filter((s) => s.value)

  return (
    <div className="space-y-6">
      <PageHeader
        title={dive.title}
        description={new Date(dive.dive_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      >
        <Button variant="outline" asChild>
          <Link href={`/dives/${diveId}/log`}>
            <FileText className="mr-2 h-4 w-4" /> View Dive Log
          </Link>
        </Button>
      </PageHeader>

      {stats.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {stats.map((stat) => (
            <Badge key={stat.label} variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
              <stat.icon className="h-3.5 w-3.5" />
              {stat.value}
            </Badge>
          ))}
        </div>
      )}

      {dive.notes && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">{dive.notes}</p>
          </CardContent>
        </Card>
      )}

      {videos && videos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <VideoIcon className="h-4 w-4" /> Videos ({videos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {videos.map((video) => (
                <DiveVideoPlayer key={video.id} video={video} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <DiveHighlights highlights={highlights ?? []} />

      {diveLog && (
        <Card>
          <CardHeader>
            <CardTitle>Dive Log Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{diveLog.summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
