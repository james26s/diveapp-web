import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

interface UpgradePromptProps {
  feature: string
  description: string
}

export function UpgradePrompt({ feature, description }: UpgradePromptProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium">{feature}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/#pricing">Upgrade</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
