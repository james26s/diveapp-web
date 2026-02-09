'use client'

import { HighlightCard } from '@/components/highlights/highlight-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import type { HighlightWithSpecies } from '@/types/domain'

interface DiveHighlightsProps {
  highlights: HighlightWithSpecies[]
}

export function DiveHighlights({ highlights }: DiveHighlightsProps) {
  if (highlights.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Highlights ({highlights.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((highlight) => (
            <HighlightCard
              key={highlight.id}
              highlight={highlight}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
