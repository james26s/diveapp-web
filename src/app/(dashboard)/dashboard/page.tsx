import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Ship, Video, Sparkles, Fish, Upload, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { count: diveCount },
    { count: videoCount },
    { count: highlightCount },
    { data: recentDives },
    { data: profile },
  ] = await Promise.all([
    supabase.from('dives').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('highlights').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('dives').select('*').eq('user_id', user!.id).order('dive_date', { ascending: false }).limit(5),
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
  ])

  const stats = [
    { label: 'Total Dives', value: diveCount ?? 0, icon: Ship },
    { label: 'Videos Uploaded', value: videoCount ?? 0, icon: Video },
    { label: 'Highlights', value: highlightCount ?? 0, icon: Sparkles },
  ]

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Diver'

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's an overview of your dive footage library"
      >
        <Button asChild>
          <Link href="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Video
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Dives</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dives">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentDives && recentDives.length > 0 ? (
              <div className="space-y-3">
                {recentDives.map((dive) => (
                  <Link
                    key={dive.id}
                    href={`/dives/${dive.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div>
                      <p className="font-medium">{dive.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {dive.location_name ?? 'Unknown location'} &middot;{' '}
                        {new Date(dive.dive_date).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Ship className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No dives yet. Upload your first video to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/upload"
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Upload dive footage</p>
                <p className="text-sm text-muted-foreground">Drag & drop or browse files</p>
              </div>
            </Link>
            <Link
              href="/gallery"
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Fish className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Browse species gallery</p>
                <p className="text-sm text-muted-foreground">See all marine life you&apos;ve encountered</p>
              </div>
            </Link>
            <Link
              href="/highlights"
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">View highlights</p>
                <p className="text-sm text-muted-foreground">AI-extracted best moments</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
