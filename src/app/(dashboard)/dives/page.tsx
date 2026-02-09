import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { DiveCard } from '@/components/dives/dive-card'
import { Button } from '@/components/ui/button'
import { Ship, Upload } from 'lucide-react'
import Link from 'next/link'
import type { DiveWithVideos } from '@/types/domain'

export const metadata = { title: 'Dives' }

export default async function DivesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: dives } = await supabase
    .from('dives')
    .select('*, videos(*)')
    .eq('user_id', user!.id)
    .order('dive_date', { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader title="Your Dives" description="All your logged dives">
        <Button asChild>
          <Link href="/upload">
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Link>
        </Button>
      </PageHeader>

      {dives && dives.length > 0 ? (
        <div className="grid gap-3">
          {(dives as unknown as DiveWithVideos[]).map((dive) => (
            <DiveCard key={dive.id} dive={dive} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Ship}
          title="No dives yet"
          description="Upload your first dive video to get started. We'll automatically create a dive log and identify marine life."
          action={{ label: 'Upload video', href: '/upload' }}
        />
      )}
    </div>
  )
}
