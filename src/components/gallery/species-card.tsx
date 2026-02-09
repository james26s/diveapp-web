import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Fish } from 'lucide-react'
import type { SpeciesGalleryItem } from '@/types/domain'

interface SpeciesCardProps {
  species: SpeciesGalleryItem
  onClick?: () => void
}

export function SpeciesCard({ species, onClick }: SpeciesCardProps) {
  return (
    <Card
      className="cursor-pointer overflow-hidden transition-all hover:shadow-md"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] bg-muted">
        {species.best_thumbnail ? (
          <img
            src={species.best_thumbnail}
            alt={species.common_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
            <Fish className="h-10 w-10 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <p className="text-sm font-semibold text-white">{species.common_name}</p>
          {species.scientific_name && (
            <p className="text-[11px] italic text-white/70">{species.scientific_name}</p>
          )}
        </div>
      </div>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs capitalize">
            {species.category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {species.sighting_count} sighting{species.sighting_count !== 1 ? 's' : ''}
            {' · '}
            {species.dive_count} dive{species.dive_count !== 1 ? 's' : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
