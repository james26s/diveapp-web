import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Clock } from 'lucide-react'
import type { HighlightWithSpecies } from '@/types/domain'
import { formatDuration } from '@/lib/upload/validators'

interface HighlightCardProps {
  highlight: HighlightWithSpecies
  onClick?: () => void
}

export function HighlightCard({ highlight, onClick }: HighlightCardProps) {
  const duration = highlight.end_time - highlight.start_time
  const species = highlight.highlight_species?.map((hs) => hs.species) ?? []

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-all hover:shadow-md"
      onClick={onClick}
    >
      <div className="relative aspect-video bg-muted">
        {highlight.thumbnail_path ? (
          <img
            src={highlight.thumbnail_path}
            alt={highlight.title ?? 'Highlight'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-sm">
            <Clock className="mr-1 h-3 w-3" />
            {formatDuration(duration)}
          </Badge>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <Play className="h-5 w-5 text-foreground" />
          </div>
        </div>
      </div>
      <CardContent className="p-3">
        <p className="truncate text-sm font-medium">
          {highlight.title ?? typeLabel(highlight.type)}
        </p>
        {species.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {species.map((s) => (
              <Badge key={s.id} variant="outline" className="text-[10px]">
                {s.common_name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    species_sighting: 'Species Sighting',
    interesting_moment: 'Interesting Moment',
    scenic: 'Scenic',
    manual: 'Manual Clip',
  }
  return labels[type] ?? type
}
