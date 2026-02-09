'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Share2, Copy, Check, Download } from 'lucide-react'
import { PLATFORM_PRESETS, type PlatformPreset } from '@/types/domain'
import { toast } from 'sonner'

interface ShareDialogProps {
  highlightId: string
  shareToken?: string | null
}

const presetLabels: Record<PlatformPreset, string> = {
  instagram_reel: 'Instagram Reel',
  tiktok: 'TikTok',
  youtube_short: 'YouTube Short',
  youtube: 'YouTube',
  original: 'Original',
}

export function ShareDialog({ highlightId, shareToken }: ShareDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<PlatformPreset>('instagram_reel')
  const [copied, setCopied] = useState(false)

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${shareToken}`
    : null

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Highlight</DialogTitle>
          <DialogDescription>
            Export for social media or share a public link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Platform Format</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PLATFORM_PRESETS) as PlatformPreset[]).map((preset) => (
                <Badge
                  key={preset}
                  variant={selectedPreset === preset ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedPreset(preset)}
                >
                  {presetLabels[preset]}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {PLATFORM_PRESETS[selectedPreset].aspectRatio} &middot;{' '}
              {PLATFORM_PRESETS[selectedPreset].resolution}
              {PLATFORM_PRESETS[selectedPreset].maxDuration &&
                ` · Max ${PLATFORM_PRESETS[selectedPreset].maxDuration}s`}
            </p>
          </div>

          <Button className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download as {presetLabels[selectedPreset]}
          </Button>

          {shareUrl && (
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
