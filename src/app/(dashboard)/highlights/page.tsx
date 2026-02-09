import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { HighlightCard } from '@/components/highlights/highlight-card'
import { Sparkles } from 'lucide-react'
import type { HighlightWithSpecies } from '@/types/domain'

export const metadata = { title: 'Highlights' }

export default async function HighlightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: highlights } = await supabase
    .from('highlights')
    .select('*, highlight_species(*, species(*))')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Highlights"
        description="AI-extracted best moments from your dives"
      />

      {highlights && highlights.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(highlights as unknown as HighlightWithSpecies[]).map((highlight) => (
            <HighlightCard key={highlight.id} highlight={highlight} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No highlights yet"
          description="Upload dive footage and our AI will extract the best moments automatically."
          action={{ label: 'Upload video', href: '/upload' }}
        />
      )}
    </div>
  )
}
