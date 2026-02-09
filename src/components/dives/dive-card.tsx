import Link from 'next/link'
import { MapPin, Clock, Ruler, Thermometer } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DiveWithVideos } from '@/types/domain'

interface DiveCardProps {
  dive: DiveWithVideos
}

export function DiveCard({ dive }: DiveCardProps) {
  const hasProcessing = dive.videos.some((v) => v.status === 'processing')
  const hasProcessed = dive.videos.some((v) => v.status === 'processed')

  return (
    <Link href={`/dives/${dive.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-semibold">{dive.title}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {new Date(dive.dive_date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="flex gap-1.5">
              {hasProcessing && <Badge variant="secondary">Processing</Badge>}
              {hasProcessed && <Badge className="bg-emerald-500/10 text-emerald-600">Ready</Badge>}
              <Badge variant="outline">{dive.videos.length} video{dive.videos.length !== 1 ? 's' : ''}</Badge>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {dive.location_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {dive.location_name}
              </span>
            )}
            {dive.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {Math.round(dive.duration / 60)} min
              </span>
            )}
            {dive.max_depth && (
              <span className="flex items-center gap-1">
                <Ruler className="h-3 w-3" /> {dive.max_depth}m
              </span>
            )}
            {dive.water_temp && (
              <span className="flex items-center gap-1">
                <Thermometer className="h-3 w-3" /> {dive.water_temp}&deg;C
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
