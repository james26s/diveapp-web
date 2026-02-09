'use client'

import { Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSearch } from '@/hooks/use-search'
import { SPECIES_CATEGORIES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function GallerySearch() {
  const { query, category, setParams } = useSearch()

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search species..."
          value={query}
          onChange={(e) => setParams({ q: e.target.value })}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={category === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setParams({ category: null })}
        >
          All
        </Button>
        {SPECIES_CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={category === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setParams({ category: category === cat.value ? null : cat.value })}
          >
            {cat.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
