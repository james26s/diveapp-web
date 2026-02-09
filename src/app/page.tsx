import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PricingTable } from '@/components/subscription/pricing-table'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import {
  Upload,
  Sparkles,
  Fish,
  FileText,
  Share2,
  Palette,
  Waves,
  ArrowRight,
  Play,
  Zap,
  Shield,
} from 'lucide-react'

const features = [
  {
    icon: Upload,
    title: 'Effortless Upload',
    description: 'Drag & drop any format. Resumable uploads handle large files and poor connections. Queue an entire dive trip overnight.',
  },
  {
    icon: Fish,
    title: 'Species Detection',
    description: 'AI identifies marine life in your footage — from manta rays to nudibranchs. Build a personal species catalog across all your dives.',
  },
  {
    icon: Sparkles,
    title: 'Auto Highlights',
    description: 'No more scrubbing through hours of video. We extract the most interesting moments and create ready-to-share clips.',
  },
  {
    icon: Palette,
    title: 'Color Correction',
    description: 'One-click underwater color restoration. Remove the blue/green cast and bring back natural colors lost to depth.',
  },
  {
    icon: FileText,
    title: 'Smart Dive Logs',
    description: 'Auto-generated dive logs with species lists, timestamps, and narrative summaries. Never forget a dive again.',
  },
  {
    icon: Share2,
    title: 'Share Everywhere',
    description: 'Export optimized for Instagram Reels, TikTok, YouTube Shorts. Platform-aware formatting, captions, and reframing.',
  },
]

const stats = [
  { value: '35+', label: 'Species in our database' },
  { value: '7', label: 'AI processing stages' },
  { value: '<5min', label: 'Average processing time' },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar transparent />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.45_0.15_230/0.15),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 sm:pt-32 lg:px-8 lg:pt-40">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1.5">
              <Zap className="h-3 w-3" />
              AI-Powered Dive Footage
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your dive footage,{' '}
              <span className="bg-gradient-to-r from-primary to-ocean bg-clip-text text-transparent">
                transformed
              </span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              Upload your underwater video. AI identifies every species, extracts the
              best moments, generates dive logs, and creates share-ready clips.
              All automatically.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/sign-up">
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">
                  <Play className="mr-2 h-4 w-4" />
                  See how it works
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-primary sm:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">How it works</h2>
            <p className="text-muted-foreground">Three steps to incredible dive content</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: '1', title: 'Upload', desc: 'Drop your dive video. Any format, any size. Resumable uploads handle the rest.', icon: Upload },
              { step: '2', title: 'AI Processes', desc: 'Our pipeline analyzes scenes, detects species, extracts highlights, and corrects colors.', icon: Sparkles },
              { step: '3', title: 'Share', desc: 'Browse your species gallery, share highlights to social, and download auto-generated dive logs.', icon: Share2 },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">
              Everything you need
            </h2>
            <p className="text-muted-foreground">
              From upload to share, we handle every step
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border p-6 transition-colors hover:bg-accent/50"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1.5 font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Species Gallery Preview */}
      <section className="border-y bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight">
                Your personal marine encyclopedia
              </h2>
              <p className="mb-6 text-muted-foreground">
                The gallery isn&apos;t organized by dive or video — it&apos;s organized by what you saw.
                Search &ldquo;turtle&rdquo; and instantly see every encounter across all your dives.
              </p>
              <ul className="space-y-3">
                {[
                  'Species-centric view with sighting counts',
                  'Full-text search across species, dives, and locations',
                  'Filter by category: fish, coral, invertebrates, mammals, reptiles',
                  'Cross-dive comparison — see the same species across different trips',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['Green Sea Turtle', 'Manta Ray', 'Clownfish', 'Nudibranch'].map((name) => (
                <div
                  key={name}
                  className="flex aspect-[4/3] items-end rounded-xl bg-gradient-to-br from-primary/10 to-primary/30 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="text-xs text-muted-foreground">3 sightings</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground">
              Start free. Upgrade when you need more power.
            </p>
          </div>
          <PricingTable />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <Waves className="mx-auto mb-4 h-10 w-10 text-primary-foreground/80" />
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-primary-foreground">
            Ready to dive in?
          </h2>
          <p className="mb-8 text-primary-foreground/80">
            Upload your first video and see the magic happen. Free to start, no credit card required.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/sign-up">
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
