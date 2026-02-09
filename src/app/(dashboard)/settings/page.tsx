'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/use-user'
import { useSubscription } from '@/hooks/use-subscription'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, profile } = useUser()
  const { subscription, tier, limits } = useSubscription(user?.id)
  const supabase = createClient()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [certLevel, setCertLevel] = useState(profile?.certification_level ?? '')
  const [saving, setSaving] = useState(false)

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName || null,
        certification_level: certLevel || null,
      })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to update profile')
    } else {
      toast.success('Profile updated')
    }
    setSaving(false)
  }

  const handleManageSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      toast.error('Failed to open billing portal')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile and subscription" />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ''} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cert">Certification Level</Label>
            <Input
              id="cert"
              value={certLevel}
              onChange={(e) => setCertLevel(e.target.value)}
              placeholder="e.g. Advanced Open Water"
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan and usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="text-sm capitalize">{tier}</Badge>
            {subscription?.status === 'active' && (
              <span className="text-sm text-emerald-600">Active</span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Credits Used</p>
              <p className="text-lg font-semibold">
                {subscription?.credits_used ?? 0} / {subscription?.credits_limit ?? limits.monthlyCredits}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Max Upload Size</p>
              <p className="text-lg font-semibold">
                {limits.maxUploadSize / (1024 * 1024 * 1024)}GB
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Monthly Uploads</p>
              <p className="text-lg font-semibold">
                {limits.maxUploadsPerMonth === -1 ? 'Unlimited' : limits.maxUploadsPerMonth}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            {tier === 'free' ? (
              <Button asChild>
                <a href="/#pricing">Upgrade Plan</a>
              </Button>
            ) : (
              <Button variant="outline" onClick={handleManageSubscription}>
                Manage Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
