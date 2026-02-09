import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Bot, Fish } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Dive Log' }

export default async function DiveLogPage({ params }: { params: Promise<{ diveId: string }> }) {
  const { diveId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: dive }, { data: diveLog }] = await Promise.all([
    supabase.from('dives').select('*').eq('id', diveId).eq('user_id', user!.id).single(),
    supabase.from('dive_logs').select('*').eq('dive_id', diveId).single(),
  ])

  if (!dive) notFound()

  const speciesSeen = (diveLog?.species_seen ?? []) as Array<{
    name: string
    count: number
    first_seen: string
    confidence: number
  }>

  const conditions = (diveLog?.conditions ?? {}) as Record<string, string>

  return (
    <div className="space-y-6">
      <PageHeader title="Dive Log" description={dive.title}>
        <Button variant="outline" asChild>
          <Link href={`/dives/${diveId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dive
          </Link>
        </Button>
      </PageHeader>

      {diveLog ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Summary</CardTitle>
                {diveLog.ai_generated && (
                  <Badge variant="secondary" className="gap-1">
                    <Bot className="h-3 w-3" /> AI Generated
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{diveLog.summary}</p>
            </CardContent>
          </Card>

          {speciesSeen.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fish className="h-4 w-4" /> Species Identified ({speciesSeen.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {speciesSeen.map((species, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{species.name}</p>
                        <p className="text-xs text-muted-foreground">
                          First seen at {species.first_seen} &middot; {species.count} sighting{species.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {Math.round(species.confidence * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {Object.keys(conditions).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(conditions).map(([key, value]) => (
                    <div key={key} className="flex justify-between rounded-lg border p-3">
                      <span className="text-sm text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Dive log will be generated automatically once video processing is complete.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
