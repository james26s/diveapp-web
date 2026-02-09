import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { GallerySearch } from '@/components/gallery/gallery-search'
import { SpeciesCard } from '@/components/gallery/species-card'
import { Grid3X3 } from 'lucide-react'
import type { SpeciesGalleryItem } from '@/types/domain'

export const metadata = { title: 'Species Gallery' }

interface GalleryPageProps {
  searchParams: Promise<{ q?: string; category?: string }>
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { q, category } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('species')
    .select(`
      id,
      common_name,
      scientific_name,
      category,
      image_url,
      highlight_species(
        highlight_id,
        highlights:highlight_id(dive_id, thumbnail_path, created_at)
      )
    `)

  if (category) {
    query = query.eq('category', category)
  }

  if (q) {
    query = query.or(`common_name.ilike.%${q}%,scientific_name.ilike.%${q}%`)
  }

  const { data: species } = await query.order('common_name')

  // Transform to gallery items
  const galleryItems: SpeciesGalleryItem[] = (species ?? []).map((s) => {
    const sightings = (s.highlight_species as unknown as Array<{
      highlight_id: string
      highlights: { dive_id: string; thumbnail_path: string | null; created_at: string } | null
    }>) ?? []

    const validSightings = sightings.filter((hs) => hs.highlights)
    const uniqueDives = new Set(validSightings.map((hs) => hs.highlights!.dive_id))

    return {
      species_id: s.id,
      common_name: s.common_name,
      scientific_name: s.scientific_name,
      category: s.category,
      image_url: s.image_url,
      sighting_count: validSightings.length,
      dive_count: uniqueDives.size,
      latest_sighting: validSightings.length > 0
        ? validSightings.sort((a, b) =>
            new Date(b.highlights!.created_at).getTime() - new Date(a.highlights!.created_at).getTime()
          )[0].highlights!.created_at
        : '',
      best_thumbnail: validSightings.find((hs) => hs.highlights?.thumbnail_path)?.highlights?.thumbnail_path ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Species Gallery"
        description="Every marine species you've encountered across all your dives"
      />

      <Suspense>
        <GallerySearch />
      </Suspense>

      {galleryItems.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {galleryItems.map((item) => (
            <SpeciesCard key={item.species_id} species={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Grid3X3}
          title={q ? 'No species found' : 'No species sightings yet'}
          description={
            q
              ? `No species matching "${q}". Try a different search.`
              : 'Upload dive footage and our AI will identify the marine life you encounter.'
          }
          action={q ? undefined : { label: 'Upload video', href: '/upload' }}
        />
      )}
    </div>
  )
}
