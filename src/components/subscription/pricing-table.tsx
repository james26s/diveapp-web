'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PricingPlan {
  name: string
  description: string
  price: string
  period: string
  features: string[]
  cta: string
  popular?: boolean
  href: string
}

const plans: PricingPlan[] = [
  {
    name: 'Free',
    description: 'Perfect for getting started',
    price: '$0',
    period: 'forever',
    features: [
      '30 minutes of processing / month',
      '5 uploads / month',
      'Up to 2GB per file',
      'Basic species detection',
      'Standard quality exports',
      'Watermarked clips',
    ],
    cta: 'Get Started',
    href: '/sign-up',
  },
  {
    name: 'Pro',
    description: 'For serious divers',
    price: '$19',
    period: '/month',
    popular: true,
    features: [
      '300 minutes of processing / month',
      '50 uploads / month',
      'Up to 20GB per file',
      'Advanced species detection',
      'Color correction',
      '4K exports',
      'Shareable links',
      'PDF dive log export',
      'No watermark',
    ],
    cta: 'Start Pro Trial',
    href: '/sign-up?plan=pro',
  },
  {
    name: 'Team',
    description: 'For dive shops & pros',
    price: '$49',
    period: '/month',
    features: [
      '1,000 minutes of processing / month',
      'Unlimited uploads',
      'Up to 50GB per file',
      'Everything in Pro',
      'Priority processing queue',
      'Bulk processing',
      'Team management',
      'API access',
    ],
    cta: 'Contact Sales',
    href: '/sign-up?plan=team',
  },
]

export function PricingTable() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.name}
          className={cn(
            'relative flex flex-col',
            plan.popular && 'border-primary shadow-lg'
          )}
        >
          {plan.popular && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
              Most Popular
            </Badge>
          )}
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
            <div className="pt-2">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-muted-foreground">{plan.period}</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <ul className="flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              variant={plan.popular ? 'default' : 'outline'}
              asChild
            >
              <a href={plan.href}>{plan.cta}</a>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
